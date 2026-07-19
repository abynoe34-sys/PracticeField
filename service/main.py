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
ADMIN_SECRET     = os.environ.get("ADMIN_SECRET", "")
SUPABASE_URL     = os.environ.get("SUPABASE_URL", "")
SUPABASE_KEY     = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")
STORAGE_BUCKET   = os.environ.get("SUPABASE_STORAGE_BUCKET", "")
MODEL_PATH     = os.getenv(
    "MEDIAPIPE_MODEL_PATH",
    os.path.join(os.path.dirname(__file__), "..", "scripts", "pose_landmarker_heavy.task")
)

# Loaded once at startup, shared across requests. Two landmarker instances —
# MediaPipe's running_mode is fixed at creation, so VIDEO (existing video
# path) and IMAGE (Feature A photo path, BUILD_SPEC_photo_upload.md) each
# need their own. See pose_utils.load_model()/load_model_image().
_landmarker = None
_landmarker_image = None
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
    global _landmarker, _landmarker_image, _model_error
    try:
        from pose_utils import load_model, load_model_image
        _landmarker = load_model(MODEL_PATH)
        log.info("MediaPipe VIDEO-mode model loaded successfully: %s", MODEL_PATH)
        _landmarker_image = load_model_image(MODEL_PATH)
        log.info("MediaPipe IMAGE-mode model loaded successfully: %s", MODEL_PATH)
    except Exception as exc:
        _model_error = str(exc)
        log.error("Failed to load MediaPipe model: %s", exc)
    yield
    if _landmarker is not None:
        _landmarker.close()
    if _landmarker_image is not None:
        _landmarker_image.close()


app = FastAPI(title="Practice Field Analysis Service", lifespan=lifespan)


def require_secret(x_service_secret: str = Header(default="")):
    if not SERVICE_SECRET:
        raise HTTPException(status_code=500, detail="SERVICE_SECRET not configured")
    if x_service_secret != SERVICE_SECRET:
        raise HTTPException(status_code=401, detail="Invalid or missing X-Service-Secret header")


def require_admin(x_admin_secret: str = Header(default="")):
    if not ADMIN_SECRET:
        raise HTTPException(status_code=500, detail="ADMIN_SECRET not configured")
    if x_admin_secret != ADMIN_SECRET:
        raise HTTPException(status_code=401, detail="Invalid or missing X-Admin-Secret header")


# ── Health ────────────────────────────────────────────────────────────────────

@app.get("/health")
def health():
    if _model_error:
        return {"status": "error", "detail": _model_error}
    if _landmarker is None or _landmarker_image is None:
        return {"status": "error", "detail": "model not yet loaded"}
    return {"status": "ok", "model": "loaded", "video_mode": "loaded", "image_mode": "loaded"}


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
    # Feature A (analyzed stance photos, BUILD_SPEC_photo_upload.md). Default
    # "video" preserves behavior for any event already in flight when this
    # field was added — every caller (lib/jobs/ol-stance-analysis.ts) sends
    # it explicitly going forward, read back from session_videos.media_type.
    media_type:      str = "video"


@app.post("/analyse", dependencies=[Depends(require_secret)])
def analyse(req: AnalyseRequest):
    log.info("received analysis request for session %s (media_type=%s)", req.session_id, req.media_type)

    if _landmarker is None or _landmarker_image is None:
        raise HTTPException(status_code=503, detail="model not loaded — service not ready")

    if not STORAGE_BUCKET:
        raise HTTPException(status_code=500, detail="SUPABASE_STORAGE_BUCKET not configured")

    from pose_utils import process_video_side, process_image_side
    from measurements import aggregate_side_measurements, aggregate_single_frame_measurement

    is_photo = req.media_type == "photo"

    db = get_supabase()

    # ── Side-view processing ──────────────────────────────────────────────────
    # storage_path is the full object path within the bucket (coach_id/session_id/clip.mp4
    # for video, or .jpg/.png for a photo). The bucket name comes from the env
    # var — never from the path itself.
    log.info("downloading side clip from bucket '%s': %s", STORAGE_BUCKET, req.side_clip_path)

    raw_bytes = db.storage.from_(STORAGE_BUCKET).download(req.side_clip_path)

    suffix = os.path.splitext(req.side_clip_path)[-1] or (".jpg" if is_photo else ".mp4")
    tmp = tempfile.NamedTemporaryFile(suffix=suffix, delete=False)
    try:
        tmp.write(raw_bytes)
        tmp.flush()
        tmp.close()
        log.info("side clip written to temp file: %s", tmp.name)

        if is_photo:
            frame      = process_image_side(tmp.name, _landmarker_image)
            aggregated = aggregate_single_frame_measurement(frame)
        else:
            frames     = process_video_side(tmp.name, _landmarker)
            aggregated = aggregate_side_measurements(frames)
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

    # ── Auto-generate feedback (best-effort, non-blocking) ──────────────────────
    # Feedback is an add-on, never a hard dependency. The analysis above has
    # already succeeded and been written by this point — nothing below this
    # line may cause /analyse to fail or leave the session in a half-written
    # state. Any failure (OpenAI error, timeout, bad JSON) is logged and
    # swallowed; the side-view row simply keeps feedback: null, same as any
    # session where /feedback hasn't been triggered yet.
    #
    # Skipped entirely (not even generating the zero-detection fallback text)
    # when there's no usable pose data — nothing useful to auto-write, and the
    # existing "feedback pending" UI placeholder already covers this case.
    # The manual POST /feedback route is untouched and still works for
    # re-generating feedback on any session, auto-generated or not.
    # feedback_status (migration-v15) makes the outcome visible instead of
    # conflating "failed" with "not generated" — both used to leave feedback
    # null. A failure sets feedback_status='failed' + feedback_error so the UI
    # can surface it and offer a retry; a no-pose skip sets 'skipped'.
    if aggregated.get("slope_deg_mean") is not None or aggregated.get("lean_from_vertical_mean") is not None:
        try:
            from feedback import generate_feedback
            feedback_result = generate_feedback(
                measurements=aggregated,
                fault_type=req.fault_type,
                line_side=req.line_side,
                position=req.position,
            )
            fb_write = db.table("session_videos") \
                .update({
                    "feedback":        feedback_result,
                    "feedback_status": "complete",
                    "feedback_error":  None,
                }) \
                .eq("session_id", req.session_id) \
                .eq("view_angle", "side") \
                .execute()
            if hasattr(fb_write, "error") and fb_write.error:
                log.error("session %s: feedback generated but DB write failed: %s", req.session_id, fb_write.error)
            else:
                log.info("session %s: feedback auto-generated and written", req.session_id)
        except Exception as exc:
            # Best-effort: the analysis write already succeeded above. Record
            # the failure on the row (never re-raise) so the user sees a clear
            # "couldn't generate — retry" state instead of a silent pending.
            log.error("session %s: auto-feedback generation failed, marking failed: %s", req.session_id, exc)
            try:
                db.table("session_videos") \
                    .update({"feedback_status": "failed", "feedback_error": str(exc)[:500]}) \
                    .eq("session_id", req.session_id) \
                    .eq("view_angle", "side") \
                    .execute()
            except Exception as write_exc:
                log.error("session %s: could not even write feedback_status=failed: %s", req.session_id, write_exc)
    else:
        log.info("session %s: skipping auto-feedback — no usable pose detections", req.session_id)
        db.table("session_videos") \
            .update({"feedback_status": "skipped"}) \
            .eq("session_id", req.session_id) \
            .eq("view_angle", "side") \
            .execute()

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


# ── Feedback (GPT-4o text writer) ──────────────────────────────────────────────
#
# Converts the raw MediaPipe measurements already written to
# session_videos.analysis into coaching feedback via gpt-4o-mini. Two entry
# points share one core (_regenerate_feedback_from_db):
#   POST /feedback            — admin-gated (X-Admin-Secret), for dev/manual
#                               re-runs (e.g. after a prompt change).
#   POST /regenerate-feedback — service-gated (X-Service-Secret), the endpoint
#                               the app's user-facing retry calls. Vercel
#                               already holds SERVICE_SECRET (as
#                               ANALYSIS_SERVICE_SECRET); it does NOT hold
#                               ADMIN_SECRET, so the retry path can't reuse
#                               /feedback — hence this second, service-gated
#                               door onto the identical logic.

class FeedbackRequest(BaseModel):
    session_id: str


def _regenerate_feedback_from_db(session_id: str) -> dict:
    """
    Read the side-view row's measurements + context back from the DB and
    (re)generate feedback, writing feedback + feedback_status. Shared by both
    the admin /feedback route and the service-gated /regenerate-feedback route
    so a user retry runs the exact same generation logic as the manual re-run.

    Raises HTTPException for the caller to surface (404 no row, 409 analysis
    not complete, 502 generation failed) — and on 502 also records
    feedback_status='failed' + feedback_error so the failure stays visible
    even if the caller drops the response.
    """
    from feedback import generate_feedback

    db = get_supabase()

    row_result = db.table("session_videos") \
        .select("analysis, analysis_status, fault_type, line_side, position") \
        .eq("session_id", session_id) \
        .eq("view_angle", "side") \
        .limit(1) \
        .execute()

    rows = row_result.data or []
    if not rows:
        raise HTTPException(status_code=404, detail="no side-view row found for this session")

    row = rows[0]
    if row["analysis_status"] != "complete" or not row["analysis"]:
        raise HTTPException(
            status_code=409,
            detail=f"side-view analysis not complete (status: {row['analysis_status']})",
        )

    try:
        # Pass fault_type/line_side/position through as-is, including None —
        # do NOT substitute a default. Substituting a real value for missing
        # data is what let a NULL position produce the exact same confident
        # language as a real one; feedback.py hedges explicitly on None.
        result = generate_feedback(
            measurements=row["analysis"],
            fault_type=row.get("fault_type"),
            line_side=row.get("line_side"),
            position=row.get("position"),
        )
    except Exception as exc:
        # Record the failure on the row so a dropped response doesn't leave the
        # user staring at a silent pending — then surface it to the caller.
        db.table("session_videos") \
            .update({"feedback_status": "failed", "feedback_error": str(exc)[:500]}) \
            .eq("session_id", session_id) \
            .eq("view_angle", "side") \
            .execute()
        raise HTTPException(status_code=502, detail=str(exc))

    write_result = db.table("session_videos") \
        .update({
            "feedback":        result,
            "feedback_status": "complete",
            "feedback_error":  None,
        }) \
        .eq("session_id", session_id) \
        .eq("view_angle", "side") \
        .execute()

    if hasattr(write_result, "error") and write_result.error:
        raise HTTPException(status_code=500, detail=f"DB write failed: {write_result.error}")

    log.info("session %s feedback written to DB", session_id)
    return result


@app.post("/feedback", dependencies=[Depends(require_admin)])
def feedback(req: FeedbackRequest):
    log.info("received admin feedback request for session %s", req.session_id)
    result = _regenerate_feedback_from_db(req.session_id)
    return {"status": "complete", "session_id": req.session_id, "feedback": result}


@app.post("/regenerate-feedback", dependencies=[Depends(require_secret)])
def regenerate_feedback(req: FeedbackRequest):
    # Service-gated twin of /feedback for the app's user-facing retry. Same
    # logic, different trust boundary (see the module comment above).
    log.info("received retry feedback request for session %s", req.session_id)
    result = _regenerate_feedback_from_db(req.session_id)
    return {"status": "complete", "session_id": req.session_id, "feedback": result}
