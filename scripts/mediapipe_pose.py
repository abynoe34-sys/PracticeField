"""
MediaPipe Pose Landmarker (Tasks API, 0.10.x)
33-point skeleton overlay — detection only, no angle computation.

Uses the heavy model for best accuracy on non-upright / bent-stance athletes.
Running mode: VIDEO (frame timestamps passed in order, enables temporal smoothing).

Colour scheme:
  Green  — upper body  (shoulders, elbows, wrists, hands)
  Amber  — lower body  (hips, knees, ankles, feet)
  Lavender — face      (nose, eyes, ears, mouth)
  White  — connections
"""

import sys
import cv2
import numpy as np
import mediapipe as mp
from mediapipe.tasks.python         import vision as mp_vision
from mediapipe.tasks.python         import BaseOptions
from mediapipe.tasks.python.vision  import PoseLandmarker, PoseLandmarkerOptions, RunningMode

# ── Config ────────────────────────────────────────────────────────────────────
INPUT      = r"C:\Users\abyno\AppData\Local\CapCut\Videos\0607(1)\0607(1)-1.mp4"
OUTPUT     = r"C:\Users\abyno\PracticeField\scripts\mp_pose_output.mp4"
MODEL_PATH = r"C:\Users\abyno\PracticeField\scripts\pose_landmarker_heavy.task"

# ── COCO-33 connection set (MediaPipe Pose Landmarker topology) ───────────────
# (start_idx, end_idx) — matches the 33-landmark BlazePose schema
POSE_CONNECTIONS = [
    # Face
    (0,1),(1,2),(2,3),(3,7),
    (0,4),(4,5),(5,6),(6,8),
    (9,10),
    # Torso
    (11,12),(11,23),(12,24),(23,24),
    # Right arm
    (12,14),(14,16),(16,18),(18,20),(16,22),
    # Left arm
    (11,13),(13,15),(15,17),(17,19),(15,21),
    # Right leg
    (24,26),(26,28),(28,30),(30,32),(28,32),
    # Left leg
    (23,25),(25,27),(27,29),(29,31),(27,31),
]

# Landmark index → body region
FACE_IDS  = set(range(0, 11))
UPPER_IDS = {11,12,13,14,15,16,17,18,19,20,21,22}
LOWER_IDS = {23,24,25,26,27,28,29,30,31,32}

COL_UPPER    = (0,   220,  60)
COL_LOWER    = (60,  180, 255)
COL_FACE     = (200, 200, 255)
COL_BONE     = (230, 230, 230)
COL_NO_DET   = (50,   50, 200)

def lm_colour(idx):
    if idx in FACE_IDS:  return COL_FACE
    if idx in UPPER_IDS: return COL_UPPER
    return COL_LOWER


def draw_skeleton(frame, landmarks, w, h):
    """Draw connections then landmark dots."""
    # connections first (underneath dots)
    for (a, b) in POSE_CONNECTIONS:
        la, lb = landmarks[a], landmarks[b]
        vis_a  = la.visibility if la.visibility is not None else 0
        vis_b  = lb.visibility if lb.visibility is not None else 0
        if vis_a < 0.25 or vis_b < 0.25:
            continue
        pt_a = (int(la.x * w), int(la.y * h))
        pt_b = (int(lb.x * w), int(lb.y * h))
        alpha = min(vis_a, vis_b)
        # colour blended from endpoint regions
        c1, c2 = lm_colour(a), lm_colour(b)
        col = tuple(int((x+y)/2 * alpha + 80*(1-alpha)) for x,y in zip(c1,c2))
        thickness = max(1, int(alpha * 3))
        cv2.line(frame, pt_a, pt_b, col, thickness, cv2.LINE_AA)

    # landmark dots on top
    for idx, lm in enumerate(landmarks):
        vis = lm.visibility if lm.visibility is not None else 0
        if vis < 0.20:
            continue
        cx, cy = int(lm.x * w), int(lm.y * h)
        col    = lm_colour(idx)
        r      = max(3, int(vis * 7))
        cv2.circle(frame, (cx, cy), r,     col,           -1, cv2.LINE_AA)
        cv2.circle(frame, (cx, cy), r + 1, (255,255,255),  1, cv2.LINE_AA)


def draw_hud(frame, frame_n, total, detected, n_visible):
    h, w = frame.shape[:2]
    cv2.putText(frame, f"frame {frame_n}/{total}",
                (10, h - 12), cv2.FONT_HERSHEY_SIMPLEX,
                0.5, (180,180,180), 1, cv2.LINE_AA)
    if detected:
        txt = f"DETECTED  {n_visible}/33 landmarks visible"
        col = (0, 220, 60)
    else:
        txt = "NO DETECTION"
        col = COL_NO_DET
    cv2.putText(frame, txt, (10, 28),
                cv2.FONT_HERSHEY_SIMPLEX, 0.65, col, 2, cv2.LINE_AA)


def main():
    cap = cv2.VideoCapture(INPUT)
    if not cap.isOpened():
        print(f"ERROR: cannot open {INPUT}"); sys.exit(1)

    fps    = cap.get(cv2.CAP_PROP_FPS) or 30.0
    width  = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    total  = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    print(f"Input : {width}x{height} @ {fps:.1f} fps — {total} frames")

    out = cv2.VideoWriter(
        OUTPUT,
        cv2.VideoWriter_fourcc(*"mp4v"),
        fps,
        (width, height),
    )

    options = PoseLandmarkerOptions(
        base_options         = BaseOptions(model_asset_path=MODEL_PATH),
        running_mode         = RunningMode.VIDEO,
        num_poses            = 2,       # track up to 2 people
        min_pose_detection_confidence  = 0.5,
        min_pose_presence_confidence   = 0.5,
        min_tracking_confidence        = 0.5,
        output_segmentation_masks      = False,
    )

    frame_n      = 0
    det_frames   = 0
    nodet_frames = 0
    ms_per_frame = 1000.0 / fps   # timestamp step in milliseconds

    with PoseLandmarker.create_from_options(options) as detector:
        while True:
            ok, frame = cap.read()
            if not ok:
                break
            frame_n += 1

            rgb       = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            mp_image  = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb)
            timestamp = int(frame_n * ms_per_frame)   # monotonic ms

            result = detector.detect_for_video(mp_image, timestamp)

            if result.pose_landmarks:
                det_frames += 1
                for pose_lms in result.pose_landmarks:
                    n_vis = sum(1 for lm in pose_lms
                                if (lm.visibility or 0) > 0.5)
                    draw_skeleton(frame, pose_lms, width, height)
                # HUD shows stats for first person detected
                first_pose_n_vis = sum(
                    1 for lm in result.pose_landmarks[0]
                    if (lm.visibility or 0) > 0.5
                )
                draw_hud(frame, frame_n, total,
                         detected=True, n_visible=first_pose_n_vis)
            else:
                nodet_frames += 1
                draw_hud(frame, frame_n, total,
                         detected=False, n_visible=0)

            out.write(frame)

            if frame_n % 30 == 0:
                print(f"  {frame_n}/{total}  ({frame_n/total*100:.0f}%)  "
                      f"detected={det_frames}  no-det={nodet_frames}")

    cap.release()
    out.release()

    print("\n--- Summary ---")
    print(f"  Total frames : {total}")
    print(f"  Detected     : {det_frames}  ({det_frames/total*100:.1f}%)")
    print(f"  No detection : {nodet_frames}  ({nodet_frames/total*100:.1f}%)")
    print(f"  Output       : {OUTPUT}")
    print()
    print("  [QA] Review the output video, then delete it:")
    print(f"       del \"{OUTPUT}\"")
    print("  Source footage is NOT deleted here — run back_slope_angle.py to extract")
    print("  measurements and delete source when you are satisfied with detection quality.")


if __name__ == "__main__":
    main()
