"""
layer1_spine.py — Layer 1 of the Dynamic Movement Analysis pipeline.

Position-agnostic frame-processing spine. Given a clip it:
  1. decodes the video (fps / frame count / resolution),
  2. runs a FRESH VIDEO-mode PoseLandmarker for THIS clip only (Gotcha #18: a
     VIDEO-mode landmarker is stateful — never share one across clips/requests),
  3. feeds frames in order with strictly-monotonic timestamps,
  4. selects the primary subject each frame (foreground, tracked — rejects the small
     background figures present in real field footage),
  5. emits a per-frame series of image + world landmarks plus honest per-region
     confidence (mean landmark visibility per body region — NOT smoothed, so it
     degrades truthfully during motion blur instead of reading falsely uniform).

It does NOT read the ruleset, compute any measurement, or produce any verdict. It is
the substrate Layer 2 (phase detection) and Layer 3 (ruleset resolution) build on.

Run it directly to process a clip and (optionally) render a tracked-skeleton overlay:
    python -m service.dynamic.layer1_spine <clip.mp4> --model <model.task> \
        --series out.json --overlay out.mp4
"""

from __future__ import annotations

import json
import logging
import math
import time
from dataclasses import dataclass, field, asdict

import cv2
import mediapipe as mp
from mediapipe.tasks.python import BaseOptions
from mediapipe.tasks.python.vision import (
    PoseLandmarker,
    PoseLandmarkerOptions,
    RunningMode,
)

log = logging.getLogger(__name__)

# Shared with pose_utils: a landmark counts as usable above this visibility.
MIN_VIS = 0.25

# How many pose candidates to detect per frame. Field footage has small background
# figures; we need >1 candidate so person-selection has something to choose from and
# reject. The foreground subject dominates on scale, so a handful is plenty.
NUM_POSES = 5

# Body regions, by MediaPipe BlazePose-33 index. Used for per-region confidence — the
# signal behind "which body parts does the camera see well?" filming guidance.
REGIONS: dict[str, list[int]] = {
    "head":      [0, 2, 5, 7, 8],       # nose, eyes, ears
    "torso":     [11, 12, 23, 24],      # shoulders, hips
    "left_arm":  [11, 13, 15],
    "right_arm": [12, 14, 16],
    "left_leg":  [23, 25, 27],
    "right_leg": [24, 26, 28],
    "feet":      [29, 30, 31, 32],      # heels, foot indices
}
# Coarse split for the filming-guidance question ("are lower-body landmarks worse?").
UPPER_BODY = [0, 2, 5, 7, 8, 11, 12, 13, 14, 15, 16, 23, 24]
LOWER_BODY = [25, 26, 27, 28, 29, 30, 31, 32]

TORSO = [11, 12, 23, 24]

# Person-selection: a candidate is kept "on track" only if its centroid is within this
# normalised distance of the previously-selected subject. Beyond it, it's treated as a
# different (likely background) figure and heavily penalised. Generous enough to follow
# a real player moving through frame, tight enough to reject a distant figure.
TRACK_GATE = 0.30
OFF_TRACK_PENALTY = 0.35


# ── per-frame + per-clip result types ─────────────────────────────────────────
@dataclass
class FrameRecord:
    frame_index: int
    timestamp_ms: int
    detected: bool
    num_candidates: int
    # selected-subject payload (None when nothing was detected this frame):
    landmarks: list[dict] | None = None          # image-normalised: x,y,z,visibility,presence
    world_landmarks: list[dict] | None = None     # metric, hip-centred: x,y,z,visibility
    bbox: list[float] | None = None               # [x0,y0,x1,y1] normalised
    confidence: float | None = None               # mean visibility over 33 landmarks
    region_confidence: dict[str, float] | None = None
    centroid: list[float] | None = None           # torso centroid, normalised


@dataclass
class ClipSpineResult:
    source: str
    fps: float
    frame_count: int
    width: int
    height: int
    num_poses: int
    processing_seconds: float
    frames: list[FrameRecord] = field(default_factory=list)
    summary: dict = field(default_factory=dict)

    def to_json(self) -> str:
        return json.dumps(
            {
                "source": self.source,
                "fps": self.fps,
                "frame_count": self.frame_count,
                "width": self.width,
                "height": self.height,
                "num_poses": self.num_poses,
                "processing_seconds": round(self.processing_seconds, 3),
                "summary": self.summary,
                "frames": [asdict(f) for f in self.frames],
            },
            ensure_ascii=False,
        )


# ── landmarker (fresh per clip) ───────────────────────────────────────────────
def _make_landmarker(model_path: str) -> PoseLandmarker:
    """A fresh VIDEO-mode landmarker. One per clip — never reuse across clips (Gotcha #18)."""
    return PoseLandmarker.create_from_options(
        PoseLandmarkerOptions(
            base_options=BaseOptions(model_asset_path=model_path),
            running_mode=RunningMode.VIDEO,
            num_poses=NUM_POSES,
            min_pose_detection_confidence=0.5,
            min_pose_presence_confidence=0.5,
            min_tracking_confidence=0.5,
            output_segmentation_masks=False,
        )
    )


# ── geometry helpers ──────────────────────────────────────────────────────────
def _bbox(lms) -> list[float]:
    """Normalised bounding box from landmarks visible enough to count."""
    xs = [lm.x for lm in lms if (lm.visibility or 0.0) >= MIN_VIS]
    ys = [lm.y for lm in lms if (lm.visibility or 0.0) >= MIN_VIS]
    if not xs or not ys:
        xs = [lm.x for lm in lms]
        ys = [lm.y for lm in lms]
    return [min(xs), min(ys), max(xs), max(ys)]


def _area(bbox: list[float]) -> float:
    return max(0.0, bbox[2] - bbox[0]) * max(0.0, bbox[3] - bbox[1])


def _centroid(lms) -> list[float]:
    """Torso centroid (shoulders+hips) when available, else mean of all landmarks."""
    pts = [(lms[i].x, lms[i].y) for i in TORSO if (lms[i].visibility or 0.0) >= MIN_VIS]
    if not pts:
        pts = [(lm.x, lm.y) for lm in lms]
    return [sum(p[0] for p in pts) / len(pts), sum(p[1] for p in pts) / len(pts)]


def _dist(a: list[float], b: list[float]) -> float:
    return math.hypot(a[0] - b[0], a[1] - b[1])


def _mean_vis(lms, idxs: list[int]) -> float:
    vs = [(lms[i].visibility or 0.0) for i in idxs]
    return round(sum(vs) / len(vs), 4) if vs else 0.0


def _region_confidence(lms) -> dict[str, float]:
    conf = {name: _mean_vis(lms, idxs) for name, idxs in REGIONS.items()}
    conf["upper_body"] = _mean_vis(lms, UPPER_BODY)
    conf["lower_body"] = _mean_vis(lms, LOWER_BODY)
    return conf


# ── person-selection (foreground, tracked) ────────────────────────────────────
def _select(candidates, prev_centroid: list[float] | None) -> int:
    """
    Pick the primary subject among candidate poses.

    Score = bbox area, gated by proximity to the previously-selected subject. The
    foreground subject dominates on scale, so on the first detection (no prior) this is
    simply "largest". On later frames the gate keeps selection locked to the tracked
    subject and rejects a background figure that would otherwise win nothing — it stays
    on the person even through posture change, because the gate follows the centroid.
    Returns the index into `candidates`.
    """
    best_i, best_score = 0, -1.0
    for i, lms in enumerate(candidates):
        area = _area(_bbox(lms))
        if prev_centroid is None:
            gate = 1.0
        else:
            gate = 1.0 if _dist(_centroid(lms), prev_centroid) <= TRACK_GATE else OFF_TRACK_PENALTY
        score = area * gate
        if score > best_score:
            best_i, best_score = i, score
    return best_i


def _pack(lms, world) -> tuple[list[dict], list[dict] | None]:
    image = [
        {"x": round(l.x, 5), "y": round(l.y, 5), "z": round(l.z, 5),
         "visibility": round(l.visibility or 0.0, 4), "presence": round(l.presence or 0.0, 4)}
        for l in lms
    ]
    world_out = None
    if world is not None:
        world_out = [
            {"x": round(l.x, 5), "y": round(l.y, 5), "z": round(l.z, 5),
             "visibility": round(l.visibility or 0.0, 4)}
            for l in world
        ]
    return image, world_out


# ── the spine ─────────────────────────────────────────────────────────────────
def process_clip(clip_path: str, model_path: str) -> ClipSpineResult:
    """
    Run the Layer-1 spine over one clip. Creates and closes its OWN fresh VIDEO-mode
    landmarker (never shared — Gotcha #18). Returns a ClipSpineResult with the per-frame
    series and a summary (detection rate, per-region confidence, continuity, timing).
    """
    cap = cv2.VideoCapture(clip_path)
    if not cap.isOpened():
        raise RuntimeError(f"Cannot open clip: {clip_path}")
    fps = cap.get(cv2.CAP_PROP_FPS) or 30.0
    frame_count = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    ms_per_frame = 1000.0 / fps

    landmarker = _make_landmarker(model_path)
    frames: list[FrameRecord] = []
    prev_centroid: list[float] | None = None
    last_ts = -1
    t0 = time.perf_counter()
    i = 0
    try:
        while True:
            ok, frame = cap.read()
            if not ok:
                break
            # Strictly-monotonic timestamps, robust to high fps rounding collisions:
            # detect_for_video() rejects a non-increasing timestamp outright.
            ts = max(last_ts + 1, int(i * ms_per_frame))
            last_ts = ts

            rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            res = landmarker.detect_for_video(
                mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb), ts
            )
            cands = res.pose_landmarks
            wlist = res.pose_world_landmarks or []

            if not cands:
                frames.append(FrameRecord(i, ts, detected=False, num_candidates=0))
                i += 1
                continue

            sel = _select(cands, prev_centroid)
            lms = cands[sel]
            world = wlist[sel] if sel < len(wlist) else None
            image_lms, world_lms = _pack(lms, world)
            bbox = _bbox(lms)
            centroid = _centroid(lms)
            prev_centroid = centroid

            frames.append(FrameRecord(
                frame_index=i,
                timestamp_ms=ts,
                detected=True,
                num_candidates=len(cands),
                landmarks=image_lms,
                world_landmarks=world_lms,
                bbox=[round(v, 5) for v in bbox],
                confidence=_mean_vis(lms, list(range(33))),
                region_confidence=_region_confidence(lms),
                centroid=[round(centroid[0], 5), round(centroid[1], 5)],
            ))
            i += 1
    finally:
        cap.release()
        landmarker.close()  # release the stateful VIDEO-mode instance for this clip

    result = ClipSpineResult(
        source=clip_path, fps=fps, frame_count=frame_count, width=width, height=height,
        num_poses=NUM_POSES, processing_seconds=time.perf_counter() - t0, frames=frames,
    )
    result.summary = _summarise(result)
    return result


def _summarise(r: ClipSpineResult) -> dict:
    det = [f for f in r.frames if f.detected]
    n = len(r.frames) or 1
    # continuity: largest run of consecutive non-detections, and largest centroid jump
    # between consecutive selected frames (a big jump hints at an identity switch).
    max_gap, cur_gap, max_jump = 0, 0, 0.0
    prev_c = None
    for f in r.frames:
        if f.detected:
            cur_gap = 0
            if prev_c is not None and f.centroid is not None:
                max_jump = max(max_jump, _dist(prev_c, f.centroid))
            prev_c = f.centroid
        else:
            cur_gap += 1
            max_gap = max(max_gap, cur_gap)

    def region_mean(name: str) -> float:
        vals = [f.region_confidence[name] for f in det if f.region_confidence]
        return round(sum(vals) / len(vals), 4) if vals else 0.0

    confs = [f.confidence for f in det if f.confidence is not None]
    conf_stats = {}
    if confs:
        mean = sum(confs) / len(confs)
        var = sum((c - mean) ** 2 for c in confs) / len(confs)
        conf_stats = {"min": round(min(confs), 4), "max": round(max(confs), 4),
                      "mean": round(mean, 4), "std": round(math.sqrt(var), 4)}

    return {
        "detection_rate": round(len(det) / n, 4),
        "frames_detected": len(det),
        "max_gap_frames": max_gap,
        "max_centroid_jump": round(max_jump, 4),
        "confidence": conf_stats,
        "region_confidence_mean": {name: region_mean(name)
                                   for name in list(REGIONS) + ["upper_body", "lower_body"]},
        "seconds": round(r.processing_seconds, 3),
        "realtime_x": round((r.frame_count / r.fps) / r.processing_seconds, 2)
        if r.processing_seconds > 0 else None,
    }


# ── overlay rendering (dev / verification aid) ────────────────────────────────
_CONNECTIONS = [
    (11, 13), (13, 15), (12, 14), (14, 16), (11, 12), (23, 24), (11, 23), (12, 24),
    (23, 25), (25, 27), (24, 26), (26, 28), (27, 31), (28, 32), (29, 27), (30, 28),
    (0, 11), (0, 12),
]


def render_overlay(clip_path: str, result: ClipSpineResult, out_path: str) -> str:
    """
    Re-read the clip and draw the SELECTED subject's skeleton per frame, with a
    live confidence readout and timestamp. A verification aid, not production output.
    """
    cap = cv2.VideoCapture(clip_path)
    if not cap.isOpened():
        raise RuntimeError(f"Cannot open clip: {clip_path}")
    w = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    h = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    fps = cap.get(cv2.CAP_PROP_FPS) or 30.0
    writer = cv2.VideoWriter(out_path, cv2.VideoWriter_fourcc(*"mp4v"), fps, (w, h))
    by_index = {f.frame_index: f for f in result.frames}
    i = 0
    try:
        while True:
            ok, frame = cap.read()
            if not ok:
                break
            rec = by_index.get(i)
            if rec and rec.landmarks:
                pts = [(int(l["x"] * w), int(l["y"] * h)) for l in rec.landmarks]
                for a, b in _CONNECTIONS:
                    cv2.line(frame, pts[a], pts[b], (0, 255, 0), 2)
                for l, p in zip(rec.landmarks, pts):
                    # per-point colour: green = confident, red = low visibility
                    c = (0, 255, 0) if l["visibility"] >= MIN_VIS else (0, 0, 255)
                    cv2.circle(frame, p, 3, c, -1)
                bb = rec.bbox
                cv2.rectangle(frame, (int(bb[0] * w), int(bb[1] * h)),
                              (int(bb[2] * w), int(bb[3] * h)), (255, 200, 0), 1)
                label = f"t={rec.timestamp_ms/1000:.2f}s conf={rec.confidence:.2f} " \
                        f"low={rec.region_confidence['lower_body']:.2f}"
            else:
                label = f"frame {i}: no subject"
            cv2.putText(frame, label, (12, 40), cv2.FONT_HERSHEY_SIMPLEX, 1.0,
                        (0, 255, 255), 2)
            writer.write(frame)
            i += 1
    finally:
        cap.release()
        writer.release()
    return out_path


# ── CLI ───────────────────────────────────────────────────────────────────────
def _main(argv=None):
    import argparse
    ap = argparse.ArgumentParser(description="Layer 1 spine — decode/pose/track/overlay.")
    ap.add_argument("clip")
    ap.add_argument("--model", required=True, help="path to pose_landmarker .task")
    ap.add_argument("--series", help="write the per-frame series JSON here")
    ap.add_argument("--overlay", help="write a tracked-skeleton overlay mp4 here")
    args = ap.parse_args(argv)

    result = process_clip(args.clip, args.model)
    print(json.dumps(result.summary, indent=2))
    if args.series:
        with open(args.series, "w", encoding="utf-8") as f:
            f.write(result.to_json())
        print(f"series -> {args.series}")
    if args.overlay:
        render_overlay(args.clip, result, args.overlay)
        print(f"overlay -> {args.overlay}")


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    _main()
