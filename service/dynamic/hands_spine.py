"""
hands_spine.py — the Hand Landmarker spine for the Dynamic Movement pipeline.

A SECOND detector alongside the pose spine (layer1_spine). MediaPipe Pose gives only
Wrist / Thumb / Index per hand (thumb & index low-fidelity), with no pinky/middle/ring and
no palm orientation — which blocks the defining feature of several WR/QB techniques (the
thumbs-diamond vs pinkies-basket catch, grip on a press release, finger spread on the
snap). MediaPipe Hands gives 21 landmarks per hand, covering all of it.

This module is the DECISION-INDEPENDENT spine only: it runs Hands over a clip and FUSES the
raw 21-landmark stream onto the pose series by frame index, assigning anatomical left/right
by proximity to the pose wrists. It produces NO derived quantities (thumbs-together, palm
normal, finger spread) and touches NO vocabulary — those, the Layer-3 hand-need wiring, and
the ~40-row catalogue retiering are deliberately held until the approved hand vocabulary
lands in the catalogue.

Design points that matter:
  - FRESH VIDEO-mode HandLandmarker per clip, created and closed here — never shared
    (Gotcha #18: a VIDEO-mode landmarker is stateful; a shared instance collides timestamps
    across clips, exactly as it did for Pose).
  - Strictly-monotonic timestamps (max(last+1, int(i*ms_per_frame))), like the pose spine.
  - LEFT/RIGHT BY POSE-WRIST PROXIMITY. MediaPipe Hands emits its own handedness label, but
    it is image-mirror-dependent and unreliable to consume raw (a spike measured it
    disagreeing with pose proximity on the majority of frames). The hand's wrist landmark
    sits a median ~0.008 of frame from the correct pose wrist, so proximity is the reliable
    arbiter — we assign L/R by it and REPORT the raw label + whether it agreed, never
    silently trusting the label.
  - Per-hand confidence reported and NOT smoothed. Hands are the hardest thing in the frame
    (occluded by the ball, fastest-moving, gloved, small when the camera is set back), and
    worst at the impact frame. HAND_CONF_FLOOR gates it: below the floor the hand is marked
    `below_floor` so a dependent checkpoint can be returned not-assessable rather than
    guessed. Floor is intentionally stricter than pose's 0.25 — set to 0.6 for now; pin the
    exact 0.6–0.7 value once we have catching footage (owner decision 3).
  - No interpolation across dropped frames — a frame with no hand is an explicit absence.

Model: scripts/hand_landmarker.task (gitignored like the pose model; the Dockerfile must
wget it — https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/
float16/1/hand_landmarker.task — when the pipeline actually invokes Hands, which is part of
the held wiring).

Selective invocation: Hands is a second heavy model on top of the ~80s pose pass and most
techniques (stance, drop, route stem) need no hand data. The caller decides whether to run
it (Layer 3 will signal the requirement once wired); `skipped_result()` records a clip that
deliberately skipped Hands, distinguishable from one where detection failed.
"""

from __future__ import annotations

import json
import math
import time
from dataclasses import dataclass, field, asdict

import cv2
import mediapipe as mp
from mediapipe.tasks.python import BaseOptions
from mediapipe.tasks.python.vision import (
    HandLandmarker, HandLandmarkerOptions, RunningMode,
)

# pose wrist indices (BlazePose-33)
POSE_LWR, POSE_RWR = 15, 16
HAND_WRIST = 0  # MediaPipe Hands landmark 0 is the wrist

# Stricter than pose's MIN_VIS=0.25 (owner decision 3): hands are least reliable exactly at
# the impact frame, so a higher floor yields honest "not assessable" over confident-wrong.
HAND_CONF_FLOOR = 0.60  # pin the exact 0.6–0.7 once catching footage exists
NUM_HANDS = 2


@dataclass
class HandData:
    confidence: float                 # MediaPipe per-hand classification score
    below_floor: bool                 # confidence < HAND_CONF_FLOOR
    raw_label: str                    # MediaPipe's own 'Left'/'Right' (image-space, advisory)
    label_agrees: bool                # did the raw label match the pose-proximity assignment?
    wrist_gap: float                  # dist(hand wrist, assigned pose wrist), normalised image
    landmarks: list[dict]             # 21 image landmarks {x,y,z}
    world_landmarks: list[dict] | None  # 21 metric wrist-relative landmarks {x,y,z}


@dataclass
class HandFrame:
    frame_index: int
    timestamp_ms: int
    num_hands: int
    left: HandData | None = None      # anatomical, by pose-wrist proximity
    right: HandData | None = None


@dataclass
class HandClipResult:
    source: str
    fps: float
    frame_count: int
    ran: bool                         # False = deliberately skipped (not a failure)
    skip_reason: str | None
    conf_floor: float
    processing_seconds: float
    frames: list[HandFrame] = field(default_factory=list)
    summary: dict = field(default_factory=dict)

    def to_json(self) -> str:
        return json.dumps({
            "source": self.source, "fps": self.fps, "frame_count": self.frame_count,
            "ran": self.ran, "skip_reason": self.skip_reason, "conf_floor": self.conf_floor,
            "processing_seconds": round(self.processing_seconds, 3),
            "summary": self.summary,
            "frames": [asdict(f) for f in self.frames],
        }, ensure_ascii=False)


def skipped_result(clip_path: str, reason: str) -> HandClipResult:
    """A clip that deliberately did NOT run Hands (no hand-dependent checkpoints applied).
    Distinguishable from a clip where detection failed."""
    return HandClipResult(source=clip_path, fps=0.0, frame_count=0, ran=False,
                          skip_reason=reason, conf_floor=HAND_CONF_FLOOR,
                          processing_seconds=0.0,
                          summary={"note": f"Hands not run: {reason}"})


def _pose_lookup(pose_series) -> dict:
    """Accept a ClipSpineResult, its frames, or a parsed series dict/list → {frame_index: frame}."""
    if hasattr(pose_series, "frames"):
        frames = [asdict(f) if hasattr(f, "__dataclass_fields__") else f for f in pose_series.frames]
    elif isinstance(pose_series, dict) and "frames" in pose_series:
        frames = pose_series["frames"]
    elif isinstance(pose_series, list):
        frames = pose_series
    else:
        raise TypeError("pose_series must be a ClipSpineResult, a series dict, or a frames list")
    return {f["frame_index"]: f for f in frames}


def _make_landmarker(model_path: str) -> HandLandmarker:
    """Fresh VIDEO-mode Hand landmarker. One per clip — never shared (Gotcha #18)."""
    return HandLandmarker.create_from_options(HandLandmarkerOptions(
        base_options=BaseOptions(model_asset_path=model_path),
        running_mode=RunningMode.VIDEO, num_hands=NUM_HANDS,
        min_hand_detection_confidence=0.3, min_hand_presence_confidence=0.3,
        min_tracking_confidence=0.3))


def _pack(lms) -> list[dict]:
    return [{"x": round(l.x, 5), "y": round(l.y, 5), "z": round(l.z, 5)} for l in lms]


def process_hand_clip(clip_path: str, pose_series, model_path: str,
                      conf_floor: float = HAND_CONF_FLOOR) -> HandClipResult:
    """Run Hands over the clip and fuse it onto the pose series by frame index. Assigns
    anatomical L/R by proximity to the pose wrists; reports raw-label disagreements and
    per-hand confidence honestly. Creates and closes its own landmarker (Gotcha #18)."""
    pose = _pose_lookup(pose_series)
    cap = cv2.VideoCapture(clip_path)
    if not cap.isOpened():
        raise RuntimeError(f"Cannot open clip: {clip_path}")
    fps = cap.get(cv2.CAP_PROP_FPS) or 30.0
    frame_count = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    ms = 1000.0 / fps

    lm = _make_landmarker(model_path)
    frames: list[HandFrame] = []
    last_ts, i = -1, 0
    det = 0; confs: list[float] = []; disagree = 0; hand_instances = 0; gaps: list[float] = []
    t0 = time.perf_counter()
    try:
        while True:
            ok, frame = cap.read()
            if not ok:
                break
            ts = max(last_ts + 1, int(i * ms)); last_ts = ts
            res = lm.detect_for_video(
                mp.Image(image_format=mp.ImageFormat.SRGB, data=cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)), ts)
            cands = res.hand_landmarks or []
            world = res.hand_world_landmarks or []
            hf = HandFrame(frame_index=i, timestamp_ms=ts, num_hands=len(cands))
            prec = pose.get(i)
            plw = prw = None
            if prec and prec.get("landmarks"):
                pl = prec["landmarks"]
                plw = (pl[POSE_LWR]["x"], pl[POSE_LWR]["y"])
                prw = (pl[POSE_RWR]["x"], pl[POSE_RWR]["y"])
            if cands:
                det += 1
            for hi, hl in enumerate(cands):
                hand_instances += 1
                score = res.handedness[hi][0].score
                raw_label = res.handedness[hi][0].category_name  # 'Left'/'Right' (advisory)
                confs.append(score)
                wx, wy = hl[HAND_WRIST].x, hl[HAND_WRIST].y
                # assign anatomical L/R by pose-wrist proximity (the reliable arbiter)
                if plw and prw:
                    dl = math.hypot(wx - plw[0], wy - plw[1])
                    dr = math.hypot(wx - prw[0], wy - prw[1])
                    assigned = "left" if dl < dr else "right"
                    gap = min(dl, dr); gaps.append(gap)
                else:
                    assigned = raw_label.lower()  # no pose wrist this frame — fall back to label
                    gap = float("nan")
                agrees = raw_label.lower() == assigned
                if not agrees:
                    disagree += 1
                data = HandData(confidence=round(score, 4), below_floor=score < conf_floor,
                                raw_label=raw_label, label_agrees=agrees, wrist_gap=round(gap, 5),
                                landmarks=_pack(hl),
                                world_landmarks=_pack(world[hi]) if hi < len(world) else None)
                if assigned == "left":
                    hf.left = data
                else:
                    hf.right = data
            frames.append(hf)
            i += 1
    finally:
        cap.release()
        lm.close()

    dur = time.perf_counter() - t0
    n = frame_count or len(frames) or 1
    import statistics as st
    conf_stats = {}
    if confs:
        conf_stats = {"mean": round(st.mean(confs), 4),
                      "std": round(st.pstdev(confs), 4) if len(confs) > 1 else 0.0,
                      "min": round(min(confs), 4), "max": round(max(confs), 4),
                      "below_floor_frac": round(sum(c < conf_floor for c in confs) / len(confs), 4)}
    result = HandClipResult(
        source=clip_path, fps=fps, frame_count=frame_count, ran=True, skip_reason=None,
        conf_floor=conf_floor, processing_seconds=dur, frames=frames)
    result.summary = {
        "hand_detection_rate": round(det / n, 4),
        "hand_instances": hand_instances,
        "confidence": conf_stats,
        "raw_label_disagreements": disagree,
        "raw_label_disagreement_frac": round(disagree / hand_instances, 4) if hand_instances else None,
        "wrist_gap_median": round(st.median(gaps), 5) if gaps else None,
        "seconds": round(dur, 3),
        "realtime_x": round((frame_count / fps) / dur, 2) if dur > 0 and fps else None,
    }
    return result


def _main(argv=None):
    import argparse
    ap = argparse.ArgumentParser(description="Hand spine — detect + fuse Hands onto a pose series.")
    ap.add_argument("clip")
    ap.add_argument("pose_series", help="a Layer 1 pose series JSON")
    ap.add_argument("--model", required=True)
    ap.add_argument("--out", help="write the fused hand series JSON here")
    args = ap.parse_args(argv)
    pose = json.load(open(args.pose_series, encoding="utf-8"))
    res = process_hand_clip(args.clip, pose, args.model)
    print(json.dumps(res.summary, indent=2))
    if args.out:
        open(args.out, "w", encoding="utf-8").write(res.to_json())
        print(f"fused hand series -> {args.out}")


if __name__ == "__main__":
    _main()
