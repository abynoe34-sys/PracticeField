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
L_KNEE,     R_KNEE     = 25, 26
L_ANKLE,    R_ANKLE    = 27, 28
L_WRIST,    R_WRIST    = 15, 16
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


# ── Front-view metrics (item 6 — mechanical half only) ─────────────────────────
# These are the things a FRONT camera can see that the side view can't: left↔
# right symmetry and squareness. Deliberately raw geometry only — NO
# fault-judgment / thresholds / cues (that's the deferred calibration ruleset,
# for both angles together). All scale-invariant (ratios / angles) so they
# don't depend on how far the camera was.

def _front_metrics(lms) -> dict | None:
    """
    Compute front-view geometry for one person's landmarks, or None if the
    core landmarks (shoulders/hips/knees/ankles) are below MIN_VIS.

    Tilts use abs() on the horizontal component so they're mirror-safe (0° =
    level; sign indicates which side sits lower in the image). Ratios are
    normalised by shoulder width so they're camera-distance-independent.
    """
    core = [L_SHOULDER, R_SHOULDER, L_HIP, R_HIP, L_KNEE, R_KNEE, L_ANKLE, R_ANKLE]
    if any((lms[i].visibility or 0.0) < MIN_VIS for i in core):
        return None

    ls, rs = lms[L_SHOULDER], lms[R_SHOULDER]
    lh, rh = lms[L_HIP],      lms[R_HIP]
    lk, rk = lms[L_KNEE],     lms[R_KNEE]
    la, ra = lms[L_ANKLE],    lms[R_ANKLE]

    shoulder_w = abs(ls.x - rs.x)
    if shoulder_w < 1e-6:
        return None
    ankle_w = abs(la.x - ra.x)
    knee_w  = abs(lk.x - rk.x)

    shoulder_tilt = round(math.degrees(math.atan2(rs.y - ls.y, abs(rs.x - ls.x) or 1e-6)), 2)
    hip_tilt      = round(math.degrees(math.atan2(rh.y - lh.y, abs(rh.x - lh.x) or 1e-6)), 2)

    shoulder_mid_x = (ls.x + rs.x) / 2
    ankle_mid_x    = (la.x + ra.x) / 2

    metrics = {
        # stance width: ankle separation relative to shoulder width. ~1.0 =
        # feet about shoulder-width; <1 narrow, >1 wide.
        "stance_width_ratio":         round(ankle_w / shoulder_w, 3),
        # knees relative to ankles: <1 means knees closer together than the
        # feet (a caving-in / valgus tendency); ~1 = tracking over the feet.
        "knee_ankle_width_ratio":     round(knee_w / ankle_w, 3) if ankle_w > 1e-6 else None,
        # shoulder / hip line tilt off horizontal (deg); 0 = level.
        "shoulder_tilt_deg":          shoulder_tilt,
        "hip_tilt_deg":               hip_tilt,
        "shoulder_hip_tilt_diff_deg": round(shoulder_tilt - hip_tilt, 2),
        # lateral balance: shoulder midpoint vs ankle midpoint, normalised by
        # shoulder width. ~0 = centred over the base; large = leaning to a side.
        "lateral_offset_ratio":       round((shoulder_mid_x - ankle_mid_x) / shoulder_w, 3),
    }

    # Down hand (3-point stance): only when both wrists are visible enough.
    lw, rw = lms[L_WRIST], lms[R_WRIST]
    if (lw.visibility or 0.0) >= MIN_VIS and (rw.visibility or 0.0) >= MIN_VIS:
        metrics["wrist_height_diff"] = round(lw.y - rw.y, 3)  # y grows downward
        metrics["down_hand"] = "left" if lw.y > rw.y else "right"
    else:
        metrics["wrist_height_diff"] = None
        metrics["down_hand"] = None

    return metrics


def _front_row(frame_n: int, time_s: float, p_idx, lms) -> dict:
    m = _front_metrics(lms) if lms is not None else None
    row = {
        "frame":         frame_n,
        "time_s":        time_s,
        "person":        p_idx,
        "visibility_ok": m is not None,
        "note":          "ok" if m is not None else ("no_detection" if lms is None else "low_vis"),
    }
    # Flatten metrics to top level so aggregation can average them directly,
    # mirroring how the side rows expose slope_deg etc.
    for k in ("stance_width_ratio", "knee_ankle_width_ratio", "shoulder_tilt_deg",
              "hip_tilt_deg", "shoulder_hip_tilt_diff_deg", "lateral_offset_ratio",
              "wrist_height_diff", "down_hand"):
        row[k] = (m or {}).get(k)
    return row


def process_video_front(video_path: str, landmarker: PoseLandmarker) -> list[dict]:
    """
    Front-view counterpart to process_video_side — VIDEO mode, per-frame front
    geometry rows (see _front_row). Same temporal-tracking landmarker contract.
    """
    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        raise RuntimeError(f"Cannot open video: {video_path}")

    fps          = cap.get(cv2.CAP_PROP_FPS) or 30.0
    ms_per_frame = 1000.0 / fps
    rows: list[dict] = []
    frame_n = 0
    try:
        while True:
            ok, frame = cap.read()
            if not ok:
                break
            frame_n += 1
            rgb    = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            mp_img = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb)
            result = landmarker.detect_for_video(mp_img, int(frame_n * ms_per_frame))
            time_s = round(frame_n / fps, 3)
            if result.pose_landmarks:
                for p_idx, lms in enumerate(result.pose_landmarks):
                    rows.append(_front_row(frame_n, time_s, p_idx, lms))
            else:
                rows.append(_front_row(frame_n, time_s, None, None))
    finally:
        cap.release()

    log.info("front video complete: %d frame rows from %d frames", len(rows), frame_n)
    return rows


def process_image_front(image_path: str, landmarker: PoseLandmarker) -> dict:
    """
    Front-view counterpart to process_image_side — IMAGE mode, single front
    geometry row. `landmarker` must be the IMAGE-mode instance.
    """
    img = cv2.imread(image_path)
    if img is None:
        raise RuntimeError(f"Cannot open image: {image_path}")
    rgb    = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
    mp_img = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb)
    result = landmarker.detect(mp_img)
    if result.pose_landmarks:
        return _front_row(1, 0.0, 0, result.pose_landmarks[0])
    return _front_row(1, 0.0, None, None)


def detect_pose_quality(image_path: str, landmarker: PoseLandmarker) -> dict:
    """
    Lightweight PRE-UPLOAD check (Photo feature item 1): is a person detected,
    and is the full body (head through feet) visible enough to analyse? This is
    a pre-flight only — detection, no measurements, no DB write. It reuses the
    exact same IMAGE-mode landmarker the real photo analysis uses, so the "is
    this usable?" verdict can't drift from what /analyse will actually see.

    `landmarker` must be the IMAGE-mode instance (load_model_image()).

    Returns:
      {
        "detected":   bool,          # any pose found at all
        "full_body":  bool,          # every key region visible >= MIN_VIS
        "reason":     str,           # "ok" | "partial" | "no_pose" | "unreadable"
        "missing":    list[str],     # region names below MIN_VIS (for guidance)
      }
    """
    img = cv2.imread(image_path)
    if img is None:
        return {"detected": False, "full_body": False, "reason": "unreadable", "missing": []}

    rgb    = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
    mp_img = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb)
    result = landmarker.detect(mp_img)

    if not result.pose_landmarks:
        return {"detected": False, "full_body": False, "reason": "no_pose", "missing": []}

    lms = result.pose_landmarks[0]

    # A region counts as "in the photo" only if every one of its landmarks is
    # both confidently detected (visibility) AND actually inside the frame.
    # The in-frame test is the load-bearing one for cropped shots: MediaPipe
    # EXTRAPOLATES landmarks that fall outside the image and keeps their
    # visibility above threshold, so a "feet cut off" photo still reports the
    # ankles as visible — but their normalised y comes back > 1.0 (below the
    # frame). Checking visibility alone misses crops; checking the coordinates
    # is in-frame catches "head or feet cut off", the most common bad-photo
    # failure mode for a full-body stance shot.
    def in_frame(i) -> bool:
        lm = lms[i]
        if (lm.visibility or 0.0) < MIN_VIS:
            return False
        return 0.0 <= lm.x <= 1.0 and 0.0 <= lm.y <= 1.0

    groups = {
        "head":      [NOSE],
        "shoulders": [L_SHOULDER, R_SHOULDER],
        "hips":      [L_HIP, R_HIP],
        "knees":     [L_KNEE, R_KNEE],
        "feet":      [L_ANKLE, R_ANKLE],
    }
    missing = [name for name, idxs in groups.items() if not all(in_frame(i) for i in idxs)]
    full_body = len(missing) == 0

    log.info("pose pre-check: detected=True full_body=%s missing=%s", full_body, missing)
    return {
        "detected":  True,
        "full_body": full_body,
        "reason":    "ok" if full_body else "partial",
        "missing":   missing,
    }


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
