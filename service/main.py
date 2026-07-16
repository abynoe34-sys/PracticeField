import os
import tempfile
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Header, Depends
from pydantic import BaseModel
from dotenv import load_dotenv
from supabase import create_client, Client, ClientOptions

load_dotenv()

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
log = logging.getLogger(__name__)

SERVICE_SECRET   = os.environ.get("SERVICE_SECRET", "")
SUPABASE_URL     = os.environ.get("SUPABASE_URL", "")
SUPABASE_KEY     = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")
STORAGE_BUCKET   = os.environ.get("SUPABASE_STORAGE_BUCKET", "")
MODEL_PATH     = os.getenv(
    "MEDIAPIPE_MODEL_PATH",
    os.path.join(os.path.dirname(__file__), "..", "scripts", "pose_landmarker_heavy.task")
)

# Loaded once at startup, shared across requests.
_landmarker = None
_model_error: str | None = None


def get_supabase() -> Client:
    if not SUPABASE_URL or not SUPABASE_KEY:
        raise RuntimeError("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set")
    # sb_secret_ keys are not JWTs. supabase-py sends the key on both:
    #   apiKey: <key>              ← correct, Supabase accepts this
    #   Authorization: Bearer <key> ← Supabase rejects non-JWT here
    #
    # Fix (two steps, both required):
    # 1. Pass Authorization="" in ClientOptions so Client.create skips its
    #    auto-auth re-injection (it only fires when options.headers["Authorization"]
    #    is None, not when it is present but empty).
    # 2. Pop the key after construction so the header is fully absent from
    #    requests rather than sent as an empty value.
    #
    # _listen_to_auth_events would re-add Bearer on SIGNED_IN/TOKEN_REFRESHED,
    # but those events never fire for a service-role client with no user session.
    client = create_client(
        SUPABASE_URL,
        SUPABASE_KEY,
        options=ClientOptions(headers={"Authorization": ""}),
    )
    client.options.headers.pop("Authorization", None)
    return client


@asynccontextmanager
async def lifespan(app: FastAPI):
    global _landmarker, _model_error
    try:
        from pose_utils import load_model
        _landmarker = load_model(MODEL_PATH)
        log.info("MediaPipe model loaded successfully: %s", MODEL_PATH)
    except Exception as exc:
        _model_error = str(exc)
        log.error("Failed to load MediaPipe model: %s", exc)
    yield
    if _landmarker is not None:
        _landmarker.close()


app = FastAPI(title="Practice Field Analysis Service", lifespan=lifespan)


def require_secret(x_service_secret: str = Header(default="")):
    if not SERVICE_SECRET:
        raise HTTPException(status_code=500, detail="SERVICE_SECRET not configured")
    if x_service_secret != SERVICE_SECRET:
        raise HTTPException(status_code=401, detail="Invalid or missing X-Service-Secret header")


# ── Health ────────────────────────────────────────────────────────────────────

@app.get("/health")
def health():
    if _model_error:
        return {"status": "error", "detail": _model_error}
    if _landmarker is None:
        return {"status": "error", "detail": "model not yet loaded"}
    return {"status": "ok", "model": "loaded"}


# ── Supabase connectivity test ────────────────────────────────────────────────

@app.get("/test-supabase", dependencies=[Depends(require_secret)])
def test_supabase():
    """
    Exercises two real Supabase operations using the configured service key:
      1. DB query  — SELECT 1 row from session_videos (proves PostgREST auth works)
      2. Storage   — list files in the top level of SUPABASE_STORAGE_BUCKET
                     (proves Storage auth works)
    Returns the raw results so you can confirm the key is genuinely accepted.
    """
    db = get_supabase()
    results: dict = {}

    # ── DB query ──────────────────────────────────────────────────────────────
    try:
        row = db.table("session_videos").select("id, session_id, analysis_status").limit(1).execute()
        results["db"] = {"ok": True, "rows": row.data}
    except Exception as exc:
        results["db"] = {"ok": False, "error": str(exc)}

    # ── Storage list ──────────────────────────────────────────────────────────
    if not STORAGE_BUCKET:
        results["storage"] = {"ok": False, "error": "SUPABASE_STORAGE_BUCKET not set"}
    else:
        try:
            files = db.storage.from_(STORAGE_BUCKET).list()
            results["storage"] = {"ok": True, "bucket": STORAGE_BUCKET, "top_level_items": len(files), "sample": files[:3]}
        except Exception as exc:
            results["storage"] = {"ok": False, "error": str(exc)}

    overall = all(v.get("ok") for v in results.values())
    return {"status": "ok" if overall else "error", "checks": results}


# ── Analyse ───────────────────────────────────────────────────────────────────

class AnalyseRequest(BaseModel):
    session_id:      str
    side_clip_path:  str
    front_clip_path: str
    drill_type:      str
    fault_type:      str
    line_side:       str
    position:        str


@app.post("/analyse", dependencies=[Depends(require_secret)])
def analyse(req: AnalyseRequest):
    log.info("received analysis request for session %s", req.session_id)

    if _landmarker is None:
        raise HTTPException(status_code=503, detail="model not loaded — service not ready")

    if not STORAGE_BUCKET:
        raise HTTPException(status_code=500, detail="SUPABASE_STORAGE_BUCKET not configured")

    from pose_utils import process_video_side
    from measurements import aggregate_side_measurements

    db = get_supabase()

    # ── Side-view processing ──────────────────────────────────────────────────
    # storage_path is the full object path within the bucket (coach_id/session_id/clip.mp4).
    # The bucket name comes from the env var — never from the path itself.
    log.info("downloading side clip from bucket '%s': %s", STORAGE_BUCKET, req.side_clip_path)

    raw_bytes = db.storage.from_(STORAGE_BUCKET).download(req.side_clip_path)

    suffix = os.path.splitext(req.side_clip_path)[-1] or ".mp4"
    tmp = tempfile.NamedTemporaryFile(suffix=suffix, delete=False)
    try:
        tmp.write(raw_bytes)
        tmp.flush()
        tmp.close()
        log.info("side clip written to temp file: %s", tmp.name)

        frames      = process_video_side(tmp.name, _landmarker)
        aggregated  = aggregate_side_measurements(frames)
        log.info(
            "side aggregation for session %s: slope_mean=%.2f reliable=%s",
            req.session_id,
            aggregated.get("slope_deg_mean") or 0.0,
            aggregated["reliable"],
        )
    finally:
        try:
            os.unlink(tmp.name)
            log.info("temp file deleted: %s", tmp.name)
        except FileNotFoundError:
            pass

    # ── Write results back to session_videos ──────────────────────────────────
    # fault_type/line_side/position are persisted here (not just passed through
    # to this request) so the /feedback route can read them back by session_id
    # without needing them re-supplied at feedback-generation time.
    side_result = db.table("session_videos") \
        .update({
            "analysis":        aggregated,
            "analysis_status": "complete",
            "fault_type":      req.fault_type,
            "line_side":       req.line_side,
            "position":        req.position,
        }) \
        .eq("session_id", req.session_id) \
        .eq("view_angle", "side") \
        .execute()

    if hasattr(side_result, "error") and side_result.error:
        raise HTTPException(status_code=500, detail=f"DB write failed: {side_result.error}")

    log.info("session %s side-view analysis written to DB", req.session_id)

    # ── Front-view: mark complete (analysis stays null — result lives on side row) ──
    # Front-view biomechanical processing is not yet implemented, but the row
    # must be marked 'complete' so the UI does not show a permanently-spinning state.
    log.info(
        "front-view processing not yet implemented — marking front row complete for session %s",
        req.session_id,
    )
    front_result = db.table("session_videos") \
        .update({"analysis_status": "complete"}) \
        .eq("session_id", req.session_id) \
        .eq("view_angle", "front") \
        .execute()

    if hasattr(front_result, "error") and front_result.error:
        raise HTTPException(status_code=500, detail=f"Front-view DB write failed: {front_result.error}")

    return {
        "status":     "complete",
        "session_id": req.session_id,
        "side":       aggregated,
        "front":      None,
    }
