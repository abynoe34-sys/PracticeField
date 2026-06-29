"""
Back-slope overlay video (MediaPipe Tasks API, 0.10.x)

Per frame:
  1. Draw the 33-point skeleton (same colours as mediapipe_pose.py)
  2. Draw the shoulder-midpoint → hip-midpoint line (the exact measurement line)
  3. Print signed back-slope angle in the top-right corner

Signed angle convention (same as back_slope_angle.py):
   0° = back perfectly flat / horizontal
  +ve = hips anatomically higher than shoulders (forward load, weight on hand)
  -ve = shoulders anatomically higher           (sitting back on heels)

  Formula: atan2(sy - hy, |hx - sx|)
  abs(dx) makes the result facing-direction neutral.
"""

import sys
import math
import cv2
import numpy as np
import mediapipe as mp
from mediapipe.tasks.python        import BaseOptions
from mediapipe.tasks.python.vision import PoseLandmarker, PoseLandmarkerOptions, RunningMode

# ── Config ────────────────────────────────────────────────────────────────────
INPUT      = r"C:\Users\abyno\AppData\Local\CapCut\Videos\0606 (3)(3)\0606 (3)(3)-1.mp4"
OUTPUT     = r"C:\Users\abyno\PracticeField\scripts\back_slope_overlay.mp4"
MODEL_PATH = r"C:\Users\abyno\PracticeField\scripts\pose_landmarker_heavy.task"

# Landmark indices
L_SHOULDER, R_SHOULDER = 11, 12
L_HIP,      R_HIP      = 23, 24
MIN_VIS = 0.25

# ── Skeleton colours ──────────────────────────────────────────────────────────
COL_UPPER  = (0,   220,  60)   # green
COL_LOWER  = (60,  180, 255)   # amber/blue
COL_FACE   = (200, 200, 255)   # lavender
COL_BONE   = (230, 230, 230)   # white connections
COL_NO_DET = (50,   50, 200)   # red (no detection HUD)

# Back-slope line colour
COL_LINE   = (0, 220, 255)     # bright yellow-green
COL_DOT    = (255, 255,   0)   # cyan midpoint dots

POSE_CONNECTIONS = [
    (0,1),(1,2),(2,3),(3,7),
    (0,4),(4,5),(5,6),(6,8),
    (9,10),
    (11,12),(11,23),(12,24),(23,24),
    (12,14),(14,16),(16,18),(18,20),(16,22),
    (11,13),(13,15),(15,17),(17,19),(15,21),
    (24,26),(26,28),(28,30),(30,32),(28,32),
    (23,25),(25,27),(27,29),(29,31),(27,31),
]

FACE_IDS  = set(range(0, 11))
UPPER_IDS = {11,12,13,14,15,16,17,18,19,20,21,22}

def lm_colour(idx):
    if idx in FACE_IDS:  return COL_FACE
    if idx in UPPER_IDS: return COL_UPPER
    return COL_LOWER


def draw_skeleton(frame, landmarks, w, h):
    for (a, b) in POSE_CONNECTIONS:
        la, lb = landmarks[a], landmarks[b]
        va = la.visibility if la.visibility is not None else 0
        vb = lb.visibility if lb.visibility is not None else 0
        if va < MIN_VIS or vb < MIN_VIS:
            continue
        pta = (int(la.x * w), int(la.y * h))
        ptb = (int(lb.x * w), int(lb.y * h))
        alpha = min(va, vb)
        c1, c2 = lm_colour(a), lm_colour(b)
        col = tuple(int((x+y)/2 * alpha + 80*(1-alpha)) for x,y in zip(c1,c2))
        cv2.line(frame, pta, ptb, col, max(1, int(alpha*3)), cv2.LINE_AA)

    for idx, lm in enumerate(landmarks):
        vis = lm.visibility if lm.visibility is not None else 0
        if vis < 0.20:
            continue
        cx, cy = int(lm.x * w), int(lm.y * h)
        col = lm_colour(idx)
        r   = max(3, int(vis * 7))
        cv2.circle(frame, (cx, cy), r,     col,           -1, cv2.LINE_AA)
        cv2.circle(frame, (cx, cy), r + 1, (255,255,255),  1, cv2.LINE_AA)


def draw_slope_line(frame, landmarks, w, h):
    """
    Draw the shoulder-midpoint → hip-midpoint line and return forward_lean (°).
    Returns None if any landmark has low visibility.
    """
    pts = [landmarks[i] for i in (L_SHOULDER, R_SHOULDER, L_HIP, R_HIP)]
    vis = [lm.visibility if lm.visibility is not None else 0.0 for lm in pts]
    if any(v < MIN_VIS for v in vis):
        return None

    ls, rs = landmarks[L_SHOULDER], landmarks[R_SHOULDER]
    lh, rh = landmarks[L_HIP],      landmarks[R_HIP]

    sx = (ls.x + rs.x) / 2;  sy = (ls.y + rs.y) / 2
    hx = (lh.x + rh.x) / 2;  hy = (lh.y + rh.y) / 2

    spt = (int(sx * w), int(sy * h))
    hpt = (int(hx * w), int(hy * h))

    # Thick bright line
    cv2.line(frame, spt, hpt, COL_LINE, 4, cv2.LINE_AA)

    # Midpoint dots (filled circle + white ring)
    for pt in (spt, hpt):
        cv2.circle(frame, pt, 8,  COL_DOT,         -1, cv2.LINE_AA)
        cv2.circle(frame, pt, 9,  (255, 255, 255),   1, cv2.LINE_AA)

    # Labels
    cv2.putText(frame, "SHLDR", (spt[0]+10, spt[1]-6),
                cv2.FONT_HERSHEY_SIMPLEX, 0.45, COL_LINE, 1, cv2.LINE_AA)
    cv2.putText(frame, "HIP",   (hpt[0]+10, hpt[1]-6),
                cv2.FONT_HERSHEY_SIMPLEX, 0.45, COL_LINE, 1, cv2.LINE_AA)

    # Signed back-slope angle (same formula as back_slope_angle.py)
    # (sy - hy): positive when hips are anatomically higher
    # abs(hx - sx): facing-direction neutral horizontal extent
    signed_angle = math.degrees(math.atan2(sy - hy, abs(hx - sx)))
    return signed_angle


def draw_hud(frame, frame_n, total, detected, lean):
    h, w = frame.shape[:2]

    # Bottom-left: frame counter
    cv2.putText(frame, f"frame {frame_n}/{total}",
                (10, h - 12), cv2.FONT_HERSHEY_SIMPLEX,
                0.5, (180,180,180), 1, cv2.LINE_AA)

    # Top-left: detection status
    if detected:
        status_col = (0, 220, 60)
        status_txt = "DETECTED"
    else:
        status_col = COL_NO_DET
        status_txt = "NO DETECTION"
    cv2.putText(frame, status_txt, (10, 28),
                cv2.FONT_HERSHEY_SIMPLEX, 0.65, status_col, 2, cv2.LINE_AA)

    # Top-right: signed back-slope angle box
    if lean is not None:
        sign_char = "+" if lean >= 0 else ""
        lean_txt = f"SLOPE  {sign_char}{lean:.1f} deg"

        # Colour by deviation from 0° (flat back), direction-neutral
        dev = abs(lean)
        if dev < 10:
            lean_col = (0, 220, 60)    # green  — nearly flat
        elif dev < 25:
            lean_col = (0, 220, 220)   # yellow — moderate tilt
        elif dev < 45:
            lean_col = (0, 140, 255)   # orange — significant tilt
        else:
            lean_col = (60, 60, 255)   # red    — extreme tilt

        (tw, th), _ = cv2.getTextSize(lean_txt, cv2.FONT_HERSHEY_SIMPLEX, 0.75, 2)
        x0, y0 = w - tw - 16, 10
        # Semi-transparent backing rect
        overlay = frame.copy()
        cv2.rectangle(overlay, (x0 - 6, y0), (x0 + tw + 6, y0 + th + 10),
                      (20, 20, 20), -1)
        cv2.addWeighted(overlay, 0.6, frame, 0.4, 0, frame)
        cv2.putText(frame, lean_txt, (x0, y0 + th + 2),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.75, lean_col, 2, cv2.LINE_AA)


def main():
    cap = cv2.VideoCapture(INPUT)
    if not cap.isOpened():
        print(f"ERROR: cannot open {INPUT}"); sys.exit(1)

    fps    = cap.get(cv2.CAP_PROP_FPS) or 30.0
    width  = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    total  = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    print(f"Input : {width}x{height} @ {fps:.1f} fps — {total} frames")

    out = cv2.VideoWriter(OUTPUT, cv2.VideoWriter_fourcc(*"mp4v"),
                          fps, (width, height))

    options = PoseLandmarkerOptions(
        base_options        = BaseOptions(model_asset_path=MODEL_PATH),
        running_mode        = RunningMode.VIDEO,
        num_poses           = 2,
        min_pose_detection_confidence = 0.5,
        min_pose_presence_confidence  = 0.5,
        min_tracking_confidence       = 0.5,
        output_segmentation_masks     = False,
    )

    ms_per_frame = 1000.0 / fps
    det_frames   = 0
    frame_n      = 0

    with PoseLandmarker.create_from_options(options) as detector:
        while True:
            ok, frame = cap.read()
            if not ok:
                break
            frame_n += 1

            rgb     = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            mp_img  = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb)
            ts_ms   = int(frame_n * ms_per_frame)
            result  = detector.detect_for_video(mp_img, ts_ms)

            lean = None
            if result.pose_landmarks:
                det_frames += 1
                for pose_lms in result.pose_landmarks:
                    draw_skeleton(frame, pose_lms, width, height)
                # Slope line + angle on the first detected person only
                lean = draw_slope_line(frame, result.pose_landmarks[0], width, height)

            draw_hud(frame, frame_n, total, bool(result.pose_landmarks), lean)
            out.write(frame)

            if frame_n % 60 == 0:
                if lean is not None:
                    sign_char = "+" if lean >= 0 else ""
                    lean_str = f"{sign_char}{lean:.1f}"
                else:
                    lean_str = "N/A"
                print(f"  {frame_n}/{total}  ({frame_n/total*100:.0f}%)  "
                      f"detected={det_frames}  slope={lean_str} deg")

    cap.release()
    out.release()

    print("\n--- Done ---")
    print(f"  Detected : {det_frames}/{total} frames ({det_frames/total*100:.1f}%)")
    print(f"  Output   : {OUTPUT}")
    print()
    print("  [QA] Review the output video, then delete it:")
    print(f"       del \"{OUTPUT}\"")
    print("  Source footage is NOT deleted here — run back_slope_angle.py to extract")
    print("  measurements and delete source when you are satisfied with detection quality.")


if __name__ == "__main__":
    main()
