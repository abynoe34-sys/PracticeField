import os
import tempfile
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Header, Depends
from pydantic import BaseModel
from dotenv import load_dotenv
from supabase import create_client, Client

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
    return create_client(SUPABASE_URL, SUPABASE_KEY)


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
    result = db.table("session_videos") \
        .update({"analysis": aggregated, "analysis_status": "complete"}) \
        .eq("session_id", req.session_id) \
        .eq("view_angle", "side") \
        .execute()

    if hasattr(result, "error") and result.error:
        raise HTTPException(status_code=500, detail=f"DB write failed: {result.error}")

    log.info("session %s side-view analysis written to DB", req.session_id)

    # ── Front-view processing ─────────────────────────────────────────────────
    log.info(
        "front-view processing not yet implemented — skipping front clip for session %s",
        req.session_id,
    )

    return {
        "status":     "complete",
        "session_id": req.session_id,
        "side":       aggregated,
        "front":      None,
    }
