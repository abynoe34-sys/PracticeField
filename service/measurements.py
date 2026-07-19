"""
measurements.py — geometry aggregation for the analysis service.
"""

import logging

log = logging.getLogger(__name__)

LOW_DETECTION_THRESHOLD = 0.5


def aggregate_side_measurements(frames: list[dict]) -> dict:
    """
    Aggregate per-frame side-view measurements into a session summary.

    Filters to person_index=0 (primary detected person) and drops no_detection
    and low_vis frames before computing statistics. If detection_rate < 0.5
    the result is flagged as unreliable.

    Returns:
      {
        "slope_deg_mean":          float | None,
        "slope_deg_min":           float | None,
        "slope_deg_max":           float | None,
        "lean_from_vertical_mean": float | None,
        "higher_majority":         "hips" | "shoulders" | None,
        "frame_count":             int,
        "detected_frame_count":    int,
        "detection_rate":          float,
        "reliable":                bool,
      }
    """
    total = len(frames)

    # Person 0 is the primary detected subject. Multi-person frames exist in
    # calibration video (coaches, background players) — we only want index 0.
    person0 = [r for r in frames if r.get("person") == 0 and r["visibility_ok"]]
    detected = [r for r in frames if r["note"] != "no_detection"]

    detection_rate = len(detected) / total if total > 0 else 0.0
    reliable = detection_rate >= LOW_DETECTION_THRESHOLD

    if not reliable:
        log.warning(
            "detection_rate=%.2f < %.2f — fewer than half of frames had a pose detected; "
            "results may not be trustworthy",
            detection_rate,
            LOW_DETECTION_THRESHOLD,
        )

    slopes = [r["slope_deg"] for r in person0 if r["slope_deg"] is not None]
    leans  = [r["lean_from_vertical"] for r in person0 if r["lean_from_vertical"] is not None]
    higher_vals = [r["higher"] for r in person0 if r["higher"] is not None]

    slope_mean = round(sum(slopes) / len(slopes), 2) if slopes else None
    slope_min  = round(min(slopes), 2)                if slopes else None
    slope_max  = round(max(slopes), 2)                if slopes else None
    lean_mean  = round(sum(leans)  / len(leans),  2) if leans  else None

    higher_majority: str | None = None
    if higher_vals:
        hips_count      = higher_vals.count("hips")
        shoulders_count = higher_vals.count("shoulders")
        higher_majority = "hips" if hips_count >= shoulders_count else "shoulders"

    return {
        "slope_deg_mean":          slope_mean,
        "slope_deg_min":           slope_min,
        "slope_deg_max":           slope_max,
        "lean_from_vertical_mean": lean_mean,
        "higher_majority":         higher_majority,
        "frame_count":             total,
        "detected_frame_count":    len(detected),
        "detection_rate":          round(detection_rate, 3),
        "reliable":                reliable,
    }


# ── Front-view aggregation (item 6 — mechanical half only) ─────────────────────

_FRONT_NUMERIC_KEYS = (
    "stance_width_ratio", "knee_ankle_width_ratio", "shoulder_tilt_deg",
    "hip_tilt_deg", "shoulder_hip_tilt_diff_deg", "lateral_offset_ratio",
    "wrist_height_diff",
)


def _front_summary(valid: list[dict], total: int, detected: int, reliable: bool) -> dict:
    """Build the front-view raw-measurement summary from valid person-0 rows."""
    def mean(key):
        vals = [r[key] for r in valid if r.get(key) is not None]
        return round(sum(vals) / len(vals), 3) if vals else None

    down_hands = [r["down_hand"] for r in valid if r.get("down_hand") is not None]
    down_hand_majority = None
    if down_hands:
        down_hand_majority = "left" if down_hands.count("left") >= down_hands.count("right") else "right"

    out = {f"{k}_mean": mean(k) for k in _FRONT_NUMERIC_KEYS}
    out.update({
        # 'view' marks this as the front raw-measurement shape; combined with
        # the absence of a 'summary' field it can never be mistaken for the
        # structured GPT-4o analysis (isStructuredAnalysis stays false —
        # Gotcha #8 safe).
        "view":                 "front",
        "down_hand_majority":   down_hand_majority,
        "frame_count":          total,
        "detected_frame_count": detected,
        "detection_rate":       round(detected / total, 3) if total > 0 else 0.0,
        "reliable":             reliable,
    })
    return out


def aggregate_front_measurements(frames: list[dict]) -> dict:
    """
    Aggregate per-frame front-view geometry (from pose_utils.process_video_front)
    into a raw-measurement summary. Same reliability rule as the side video
    path: reliable when detection_rate >= 0.5. NO fault judgment — just the
    averaged mechanical metrics.
    """
    total = len(frames)
    person0 = [r for r in frames if r.get("person") == 0 and r["visibility_ok"]]
    detected = [r for r in frames if r["note"] != "no_detection"]
    detection_rate = len(detected) / total if total > 0 else 0.0
    reliable = detection_rate >= LOW_DETECTION_THRESHOLD
    if not reliable:
        log.warning("front detection_rate=%.2f < %.2f — results may not be trustworthy",
                    detection_rate, LOW_DETECTION_THRESHOLD)
    return _front_summary(person0, total, len(detected), reliable)


def aggregate_single_frame_front_measurement(frame: dict) -> dict:
    """
    Single front photo → front raw-measurement summary. reliable is ALWAYS
    False (same conservative-by-design rule as the single-frame side path):
    one sample can't earn a multi-frame video's confidence, regardless of how
    cleanly it detected.
    """
    detected = frame["note"] != "no_detection"
    valid = [frame] if frame.get("visibility_ok") else []
    return _front_summary(valid, 1, 1 if detected else 0, False)


def aggregate_single_frame_measurement(frame: dict) -> dict:
    """
    Aggregate a single photo frame (Feature A — analyzed stance photos) into
    the exact same summary shape aggregate_side_measurements() produces, so
    every downstream consumer (service/feedback.py, session_videos.analysis,
    VideoAnalysisCard) can treat a photo-derived result identically to a
    video-derived one without a parallel shape to handle.

    Deliberately does NOT reuse aggregate_side_measurements()'s
    detection_rate >= 0.5 formula for `reliable`: a single sample can never
    earn the same confidence as a multi-frame video's majority vote,
    regardless of whether that one frame happened to detect cleanly.
    `reliable` is always False here, by design — this is the conservative
    signal BUILD_SPEC_photo_upload.md calls for ("a photo must not report
    the same confidence a clean multi-frame video would"). It's also the
    exact flag service/feedback.py's prompt already hedges on ("if reliable
    is false, keep the summary and issues conservative") — reused as-is
    rather than duplicated for photos.
    """
    detected = frame["note"] != "no_detection"
    detection_rate = 1.0 if detected else 0.0

    if not detected:
        log.warning("single-frame photo: no pose detected")

    slope  = frame["slope_deg"]          if frame["visibility_ok"] else None
    lean   = frame["lean_from_vertical"] if frame["visibility_ok"] else None
    higher = frame["higher"]             if frame["visibility_ok"] else None

    return {
        "slope_deg_mean":          slope,
        "slope_deg_min":           slope,
        "slope_deg_max":           slope,
        "lean_from_vertical_mean": lean,
        "higher_majority":         higher,
        "frame_count":             1,
        "detected_frame_count":    1 if detected else 0,
        "detection_rate":          detection_rate,
        "reliable":                False,  # conservative by design — see docstring
    }
