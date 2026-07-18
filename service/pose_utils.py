"""
pose_utils.py — MediaPipe pose processing for the analysis service.

Extracted from scripts/back_slope_angle.py and adapted for service use:
- Model is loaded once at startup via load_model(), not per request.
- process_video_side() runs in VIDEO mode with temporal smoothing,
  matching the validated local calibration pipeline exactly.
- The signed atan2 formula is preserved verbatim:
    atan2(sy - hy, abs(hx - sx))
  The abs() on the horizontal component is critical — it makes the
  angle direction-independent regardless of which way the player faces.
"""

import math
import logging
import cv2
import mediapipe as mp
from mediapipe.tasks.python import BaseOptions
from mediapipe.tasks.python.vision import (
    PoseLandmarker,
    PoseLandmarkerOptions,
    RunningMode,
)

log = logging.getLogger(__name__)

# Landmark indices (MediaPipe BlazePose 33-point)
L_SHOULDER, R_SHOULDER = 11, 12
L_HIP,      R_HIP      = 23, 24
NOSE                   = 0
MIN_VIS = 0.25


def load_model(model_path: str) -> PoseLandmarker:
    """
    Load the pose_landmarker_heavy model in VIDEO mode.
    Call once at service startup. The returned landmarker is NOT thread-safe —
    process one video at a time per instance.
    """
    options = PoseLandmarkerOptions(
        base_options=BaseOptions(model_asset_path=model_path),
        running_mode=RunningMode.VIDEO,
        num_poses=2,
        min_pose_detection_confidence=0.5,
        min_pose_presence_confidence=0.5,
        min_tracking_confidence=0.5,
        output_segmentation_masks=False,
    )
    return PoseLandmarker.create_from_options(options)


def load_model_image(model_path: str) -> PoseLandmarker:
    """
    Load the pose_landmarker_heavy model in IMAGE mode, for single-photo
    analysis (Feature A — analyzed stance photos, BUILD_SPEC_photo_upload.md).

    A SEPARATE landmarker instance from load_model()'s VIDEO-mode one —
    MediaPipe's running_mode is fixed at creation time. A VIDEO-mode
    landmarker only exposes detect_for_video() (which requires monotonically
    increasing timestamps across calls) and an IMAGE-mode one only exposes
    detect() (single inference, no timestamp/tracking state) — they are not
    interchangeable. Call once at service startup, same lifecycle as the
    video landmarker.
    """
    options = PoseLandmarkerOptions(
        base_options=BaseOptions(model_asset_path=model_path),
        running_mode=RunningMode.IMAGE,
        num_poses=2,
        min_pose_detection_confidence=0.5,
        min_pose_presence_confidence=0.5,
        min_tracking_confidence=0.5,
        output_segmentation_masks=False,
    )
    return PoseLandmarker.create_from_options(options)


def _back_slope_deg(lms) -> float | None:
    """
    Compute signed back-slope angle for one person's landmarks.
    Returns None if any of the four required landmarks are below MIN_VIS.

    Formula: atan2(sy - hy, abs(hx - sx))
    - sy/hy: image-y of shoulder/hip midpoints (y increases downward in image space)
    - abs(hx - sx): direction-independent horizontal distance
    - Result is positive when hips are anatomically higher than shoulders
      (player leaning forward, weight on hand — correct 3-point stance)
    """
    vis = [
        (lms[L_SHOULDER].visibility or 0.0),
        (lms[R_SHOULDER].visibility or 0.0),
        (lms[L_HIP].visibility      or 0.0),
        (lms[R_HIP].visibility      or 0.0),
    ]
    if any(v < MIN_VIS for v in vis):
        return None

    sx = (lms[L_SHOULDER].x + lms[R_SHOULDER].x) / 2
    sy = (lms[L_SHOULDER].y + lms[R_SHOULDER].y) / 2
    hx = (lms[L_HIP].x     + lms[R_HIP].x)      / 2
    hy = (lms[L_HIP].y     + lms[R_HIP].y)       / 2

    return round(math.degrees(math.atan2(sy - hy, abs(hx - sx))), 2)


def _lean_from_vertical(lms) -> tuple[float | None, str | None]:
    """
    Compute facing-direction-independent lean angle and which group is higher.
    Uses nose position to determine facing direction (same as m1_measure_stills.py).
    Returns (lean_from_vertical_deg, higher) or (None, None) on low visibility.
    """
    vis = [
        (lms[L_SHOULDER].visibility or 0.0),
        (lms[R_SHOULDER].visibility or 0.0),
        (lms[L_HIP].visibility      or 0.0),
        (lms[R_HIP].visibility      or 0.0),
    ]
    if any(v < MIN_VIS for v in vis):
        return None, None

    sx = (lms[L_SHOULDER].x + lms[R_SHOULDER].x) / 2
    sy = (lms[L_SHOULDER].y + lms[R_SHOULDER].y) / 2
    hx = (lms[L_HIP].x     + lms[R_HIP].x)      / 2
    hy = (lms[L_HIP].y     + lms[R_HIP].y)       / 2

    nose_x       = lms[NOSE].x
    facing_right = nose_x > hx
    horiz_disp   = (sx - hx) if facing_right else (hx - sx)
    vert_disp    = hy - sy

    lean = round(math.degrees(math.atan2(horiz_disp, vert_disp)), 2)
    higher = "shoulders" if sy < hy else "hips"
    return lean, higher


def process_video_side(video_path: str, landmarker: PoseLandmarker) -> list[dict]:
    """
    Run side-view pose analysis on a video file.

    Uses VIDEO mode with temporal smoothing — the same validated pipeline
    as scripts/back_slope_angle.py. Frames are fed in order with monotonically
    increasing timestamps; the landmarker tracks poses across frames.

    Returns a list of per-frame measurement dicts:
      {
        "frame":              int,
        "time_s":             float,
        "person":             int,
        "slope_deg":          float | None,
        "lean_from_vertical": float | None,
        "higher":             "hips" | "shoulders" | None,
        "visibility_ok":      bool,
        "note":               str,   # "ok" | "low_vis" | "no_detection"
      }
    """
    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        raise RuntimeError(f"Cannot open video: {video_path}")

    fps          = cap.get(cv2.CAP_PROP_FPS) or 30.0
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    ms_per_frame = 1000.0 / fps
    log.info("processing side video: %d frames @ %.1f fps", total_frames, fps)

    rows = []
    frame_n = 0

    try:
        while True:
            ok, frame = cap.read()
            if not ok:
                break
            frame_n += 1

            rgb    = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            mp_img = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb)
            ts_ms  = int(frame_n * ms_per_frame)
            result = landmarker.detect_for_video(mp_img, ts_ms)
            time_s = round(frame_n / fps, 3)

            if result.pose_landmarks:
                for p_idx, lms in enumerate(result.pose_landmarks):
                    slope        = _back_slope_deg(lms)
                    lean, higher = _lean_from_vertical(lms)
                    note         = "ok" if slope is not None else "low_vis"
                    rows.append({
                        "frame":              frame_n,
                        "time_s":             time_s,
                        "person":             p_idx,
                        "slope_deg":          slope,
                        "lean_from_vertical": lean,
                        "higher":             higher,
                        "visibility_ok":      slope is not None,
                        "note":               note,
                    })
            else:
                rows.append({
                    "frame":              frame_n,
                    "time_s":             time_s,
                    "person":             None,
                    "slope_deg":          None,
                    "lean_from_vertical": None,
                    "higher":             None,
                    "visibility_ok":      False,
                    "note":               "no_detection",
                })
    finally:
        cap.release()

    log.info("side video complete: %d frame rows from %d frames", len(rows), frame_n)
    return rows


def process_image_side(image_path: str, landmarker: PoseLandmarker) -> dict:
    """
    Run side-view pose analysis on a single still image (Feature A — analyzed
    stance photos). Uses IMAGE running mode — one inference, no temporal
    smoothing or tracking, since there is only one frame. `landmarker` must
    have been created via load_model_image() (IMAGE mode); it is NOT
    interchangeable with the VIDEO-mode landmarker process_video_side() uses.

    Returns a single measurement dict in the exact same per-frame shape
    process_video_side() produces per row (frame/time_s/person/slope_deg/
    lean_from_vertical/higher/visibility_ok/note), so the caller can hand it
    straight to measurements.aggregate_single_frame_measurement() without a
    parallel dict format to maintain.
    """
    img = cv2.imread(image_path)
    if img is None:
        raise RuntimeError(f"Cannot open image: {image_path}")

    rgb    = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
    mp_img = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb)
    result = landmarker.detect(mp_img)

    if result.pose_landmarks:
        # A still typically has exactly one subject in frame; take the first
        # detection as person 0, matching process_video_side()'s convention
        # of treating person index 0 as the primary subject.
        lms          = result.pose_landmarks[0]
        slope        = _back_slope_deg(lms)
        lean, higher = _lean_from_vertical(lms)
        note         = "ok" if slope is not None else "low_vis"
        log.info("side photo processed: note=%s slope_deg=%s", note, slope)
        return {
            "frame":              1,
            "time_s":             0.0,
            "person":             0,
            "slope_deg":          slope,
            "lean_from_vertical": lean,
            "higher":             higher,
            "visibility_ok":      slope is not None,
            "note":               note,
        }

    log.info("side photo processed: no pose detected")
    return {
        "frame":              1,
        "time_s":             0.0,
        "person":             None,
        "slope_deg":          None,
        "lean_from_vertical": None,
        "higher":             None,
        "visibility_ok":      False,
        "note":               "no_detection",
    }
