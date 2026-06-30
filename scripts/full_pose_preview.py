"""
full_pose_preview.py

PURPOSE
-------
One-off PREVIEW script — not part of the validated calibration pipeline.
Draws ALL 33 BlazePose landmarks (confidence-coded) with the full skeleton
and every computable joint angle labelled on the image.

Dot colour key:
  Red   = high confidence (vis >= 0.5)
  Orange = medium confidence (vis 0.2–0.5)
  Grey  = low confidence (vis < 0.2) — drawn but treat with caution

This does NOT write to any calibration CSV, does NOT delete the source
image, and is NOT wired into back_slope_angle.py / m1_measure_stills.py.

USAGE
-----
    py scripts/full_pose_preview.py path/to/still.jpg
"""

import sys
import os
import math
import cv2
import mediapipe as mp
from mediapipe.tasks.python        import BaseOptions
from mediapipe.tasks.python.vision import PoseLandmarker, PoseLandmarkerOptions, RunningMode

_DIR       = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH = os.path.join(_DIR, "pose_landmarker_heavy.task")
OUT_PATH   = os.path.join(_DIR, "full_pose_preview_overlay.jpg")

# BlazePose 33-point indices
NOSE = 0
L_EYE_IN, L_EYE, L_EYE_OUT = 1, 2, 3
R_EYE_IN, R_EYE, R_EYE_OUT = 4, 5, 6
L_EAR, R_EAR               = 7, 8
L_MOUTH, R_MOUTH            = 9, 10
L_SHOULDER, R_SHOULDER      = 11, 12
L_ELBOW,    R_ELBOW         = 13, 14
L_WRIST,    R_WRIST         = 15, 16
L_PINKY,    R_PINKY         = 17, 18
L_INDEX,    R_INDEX         = 19, 20
L_THUMB,    R_THUMB         = 21, 22
L_HIP,      R_HIP           = 23, 24
L_KNEE,     R_KNEE          = 25, 26
L_ANKLE,    R_ANKLE         = 27, 28
L_HEEL,     R_HEEL          = 29, 30
L_FOOT,     R_FOOT          = 31, 32

LM_NAMES = {
    0:"nose",
    11:"L shoulder", 12:"R shoulder",
    13:"L elbow",    14:"R elbow",
    15:"L wrist",    16:"R wrist",
    23:"L hip",      24:"R hip",
    25:"L knee",     26:"R knee",
    27:"L ankle",    28:"R ankle",
    29:"L heel",     30:"R heel",
    31:"L foot",     32:"R foot",
}

# Full BlazePose skeleton (excluding face interior micro-edges)
SKELETON = [
    (L_SHOULDER, R_SHOULDER), (L_HIP, R_HIP),
    (L_SHOULDER, L_HIP),       (R_SHOULDER, R_HIP),
    (L_SHOULDER, L_ELBOW),     (L_ELBOW, L_WRIST),
    (R_SHOULDER, R_ELBOW),     (R_ELBOW, R_WRIST),
    (L_WRIST, L_PINKY), (L_WRIST, L_INDEX), (L_WRIST, L_THUMB),
    (R_WRIST, R_PINKY), (R_WRIST, R_INDEX), (R_WRIST, R_THUMB),
    (L_HIP, L_KNEE),   (L_KNEE, L_ANKLE),
    (R_HIP, R_KNEE),   (R_KNEE, R_ANKLE),
    (L_ANKLE, L_HEEL), (L_HEEL, L_FOOT),   (L_ANKLE, L_FOOT),
    (R_ANKLE, R_HEEL), (R_HEEL, R_FOOT),   (R_ANKLE, R_FOOT),
    # head
    (NOSE, L_EYE_IN), (L_EYE_IN, L_EYE), (L_EYE, L_EYE_OUT), (L_EYE_OUT, L_EAR),
    (NOSE, R_EYE_IN), (R_EYE_IN, R_EYE), (R_EYE, R_EYE_OUT), (R_EYE_OUT, R_EAR),
    (L_MOUTH, R_MOUTH),
    (L_SHOULDER, L_EAR), (R_SHOULDER, R_EAR),
]


def angle_at(vertex, a, b):
    """Angle in degrees at vertex between rays vertex->a and vertex->b."""
    vax, vay = a[0]-vertex[0], a[1]-vertex[1]
    vbx, vby = b[0]-vertex[0], b[1]-vertex[1]
    mag_a = math.hypot(vax, vay)
    mag_b = math.hypot(vbx, vby)
    if mag_a < 1e-6 or mag_b < 1e-6:
        return None
    cos_v = (vax*vbx + vay*vby) / (mag_a*mag_b)
    return math.degrees(math.acos(max(-1.0, min(1.0, cos_v))))


def label_box(img, text, pos, font_scale, thickness, text_color, box_color):
    (tw, th), baseline = cv2.getTextSize(text, cv2.FONT_HERSHEY_SIMPLEX, font_scale, thickness)
    x, y = int(pos[0]), int(pos[1])
    pad = max(4, int(font_scale * 5))
    cv2.rectangle(img, (x-pad, y-th-pad), (x+tw+pad, y+baseline+pad), box_color, -1)
    cv2.rectangle(img, (x-pad, y-th-pad), (x+tw+pad, y+baseline+pad), (255,255,255), 1)
    cv2.putText(img, text, (x, y), cv2.FONT_HERSHEY_SIMPLEX,
                font_scale, text_color, thickness, cv2.LINE_AA)


def draw_arc(img, vertex, a, b, radius, color, thick):
    ang1 = math.degrees(math.atan2(-(a[1]-vertex[1]), a[0]-vertex[0]))
    ang2 = math.degrees(math.atan2(-(b[1]-vertex[1]), b[0]-vertex[0]))
    s, e = sorted([ang1, ang2])
    if e - s > 180:
        s, e = e, s + 360
    cv2.ellipse(img, vertex, (radius, radius), 0, -e, -s, color, thick, cv2.LINE_AA)


def dot_color(vis_val):
    if vis_val >= 0.5:
        return (0, 0, 220)    # red   — high conf
    elif vis_val >= 0.2:
        return (0, 140, 255)  # orange — medium
    else:
        return (160, 160, 160) # grey  — low conf


def main():
    if len(sys.argv) != 2:
        print("Usage: py scripts/full_pose_preview.py path/to/still.jpg")
        sys.exit(1)

    image_path = sys.argv[1]
    image = cv2.imread(image_path)
    if image is None:
        print(f"[ERROR] Could not read image: {image_path}")
        sys.exit(1)

    h, w = image.shape[:2]
    scale      = w / 1080
    dot_r      = max(8,  int(14 * scale))
    line_thick = max(2,  int(4  * scale))
    font_scale = max(0.55, 0.95 * scale)
    txt_thick  = max(1,  int(2  * scale))
    arc_r      = max(20, int(48 * scale))

    options = PoseLandmarkerOptions(
        base_options=BaseOptions(model_asset_path=MODEL_PATH),
        running_mode=RunningMode.IMAGE,
        num_poses=1,
    )
    mp_image = mp.Image(image_format=mp.ImageFormat.SRGB,
                        data=cv2.cvtColor(image, cv2.COLOR_BGR2RGB))

    with PoseLandmarker.create_from_options(options) as det:
        result = det.detect(mp_image)

    if not result.pose_landmarks:
        print("[ERROR] No pose detected.")
        sys.exit(1)

    lm = result.pose_landmarks[0]

    def px(idx):
        return (int(lm[idx].x * w), int(lm[idx].y * h))

    def v(idx):
        return lm[idx].visibility or 0.0

    overlay = image.copy()

    # --- Print all 33 landmark visibilities ---
    print("--- BlazePose landmark visibility scores ---")
    for i, name in LM_NAMES.items():
        print(f"  {i:>2}  {name:<14}  vis={v(i):.3f}  px={px(i)}")
    print()

    # --- Skeleton ---
    for a_idx, b_idx in SKELETON:
        cv2.line(overlay, px(a_idx), px(b_idx), (0, 220, 0), line_thick, cv2.LINE_AA)

    # --- Torso centre line (amber) ---
    if True:  # always attempt, even low-conf
        sh_mid = ((px(L_SHOULDER)[0]+px(R_SHOULDER)[0])//2,
                  (px(L_SHOULDER)[1]+px(R_SHOULDER)[1])//2)
        hp_mid = ((px(L_HIP)[0]+px(R_HIP)[0])//2,
                  (px(L_HIP)[1]+px(R_HIP)[1])//2)
        cv2.line(overlay, sh_mid, hp_mid, (80,180,255), line_thick+2, cv2.LINE_AA)

    # --- Hip/ankle width reference lines ---
    cv2.line(overlay, px(L_HIP),   px(R_HIP),   (80, 180, 255), line_thick, cv2.LINE_AA)
    cv2.line(overlay, px(L_ANKLE), px(R_ANKLE), (0,  215, 255), line_thick, cv2.LINE_AA)

    # --- All 33 landmark dots ---
    for idx in range(33):
        pt = px(idx)
        col = dot_color(v(idx))
        cv2.circle(overlay, pt, dot_r,     col,           -1, cv2.LINE_AA)
        cv2.circle(overlay, pt, dot_r + 2, (255,255,255),  2, cv2.LINE_AA)

    print("--- Joint angles ---")

    # helper: compute angle + draw arc + label
    def show_angle(vertex_i, a_i, b_i, label_str, box_col, txt_col, offset):
        pt = px(vertex_i)
        ang = angle_at(pt, px(a_i), px(b_i))
        if ang is None:
            return
        draw_arc(overlay, pt, px(a_i), px(b_i), arc_r, box_col, max(1, line_thick-1))
        lx = pt[0] + offset[0]
        ly = pt[1] + offset[1]
        label_box(overlay, f"{label_str}: {ang:.0f} deg",
                  (lx, ly), font_scale, txt_thick, txt_col, box_col)
        conf_note = f" (vis={v(vertex_i):.2f})" if v(vertex_i) < 0.3 else ""
        print(f"  {label_str:<22} {ang:>6.1f} deg{conf_note}")

    off_L = (-arc_r*3, -arc_r//2)
    off_R = ( arc_r//2, -arc_r//2)

    # Back slope
    sh_mid = ((px(L_SHOULDER)[0]+px(R_SHOULDER)[0])/2,
              (px(L_SHOULDER)[1]+px(R_SHOULDER)[1])/2)
    hp_mid = ((px(L_HIP)[0]+px(R_HIP)[0])/2,
              (px(L_HIP)[1]+px(R_HIP)[1])/2)
    dx = hp_mid[0]-sh_mid[0];  dy = -(hp_mid[1]-sh_mid[1])
    slope_deg = math.degrees(math.atan2(dy, dx))
    mid_px = (int((sh_mid[0]+hp_mid[0])/2), int((sh_mid[1]+hp_mid[1])/2))
    label_box(overlay, f"back slope: {slope_deg:.1f} deg",
              (mid_px[0]+dot_r+4, mid_px[1]), font_scale, txt_thick,
              (20, 20, 20), (80, 180, 255))
    print(f"  {'back slope':<22} {slope_deg:>6.1f} deg")

    # Shoulder angles
    show_angle(L_SHOULDER, L_ELBOW, L_HIP,   "L shoulder",  (180, 0, 180),  (255,255,255), off_L)
    show_angle(R_SHOULDER, R_ELBOW, R_HIP,   "R shoulder",  (180, 0, 180),  (255,255,255), off_R)

    # Elbow angles
    show_angle(L_ELBOW, L_SHOULDER, L_WRIST, "L elbow",     (0, 200, 100),  (20,20,20),    off_L)
    show_angle(R_ELBOW, R_SHOULDER, R_WRIST, "R elbow",     (0, 200, 100),  (20,20,20),    off_R)

    # Hip angles
    show_angle(L_HIP, L_SHOULDER, L_KNEE,    "L hip",       (220, 0, 220),  (255,255,255), off_L)
    show_angle(R_HIP, R_SHOULDER, R_KNEE,    "R hip",       (220, 0, 220),  (255,255,255), off_R)

    # Knee angles
    show_angle(L_KNEE, L_HIP, L_ANKLE,       "L knee",      (0, 210, 230),  (20,20,20),    off_L)
    show_angle(R_KNEE, R_HIP, R_ANKLE,       "R knee",      (0, 210, 230),  (20,20,20),    off_R)

    # Ankle angles
    show_angle(L_ANKLE, L_KNEE, L_FOOT,      "L ankle",     (255, 200, 0),  (20,20,20),    off_L)
    show_angle(R_ANKLE, R_KNEE, R_FOOT,      "R ankle",     (255, 200, 0),  (20,20,20),    off_R)

    # Foot-width ratio
    hip_w   = abs(px(L_HIP)[0]   - px(R_HIP)[0])
    ankle_w = abs(px(L_ANKLE)[0] - px(R_ANKLE)[0])
    if hip_w > 0:
        ratio = ankle_w / hip_w
        ank_mid = ((px(L_ANKLE)[0]+px(R_ANKLE)[0])//2,
                   (px(L_ANKLE)[1]+px(R_ANKLE)[1])//2)
        label_box(overlay, f"foot/hip width: {ratio:.2f}x",
                  (ank_mid[0]-arc_r, ank_mid[1]+dot_r+8),
                  font_scale, txt_thick, (20,20,20), (0,215,255))
        print(f"\n  foot/hip width ratio: {ratio:.2f}x  (hip={hip_w}px  ankle={ankle_w}px)")

    cv2.imwrite(OUT_PATH, overlay, [cv2.IMWRITE_JPEG_QUALITY, 92])
    print(f"\n  Overlay -> {OUT_PATH}")
    print("  (Contains footage — delete manually after review.)")


if __name__ == "__main__":
    main()
