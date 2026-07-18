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
