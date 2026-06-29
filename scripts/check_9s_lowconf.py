"""
Re-run MediaPipe on 0606_rep1_9s.png with min_detection_confidence=0.3.
Saves overlay to check_9s_lowconf.png and prints M1 measurements for all persons.
"""

import cv2, math
import mediapipe as mp
from mediapipe.tasks.python        import BaseOptions
from mediapipe.tasks.python.vision import PoseLandmarker, PoseLandmarkerOptions, RunningMode

MODEL_PATH = r"C:\Users\abyno\PracticeField\scripts\pose_landmarker_heavy.task"
SRC        = r"C:\Users\abyno\PracticeField\scripts\0606_rep1_9s.png"
DST        = r"C:\Users\abyno\PracticeField\scripts\check_9s_lowconf.png"

PERSON_COLOURS = [
    (0,   220,  60),
    (60,  100, 255),
    (255,  60, 200),
    (0,   220, 255),
    (255, 200,   0),
]

POSE_CONNECTIONS = [
    (0,1),(1,2),(2,3),(3,7),(0,4),(4,5),(5,6),(6,8),(9,10),
    (11,12),(11,23),(12,24),(23,24),
    (12,14),(14,16),(16,18),(18,20),(16,22),
    (11,13),(13,15),(15,17),(17,19),(15,21),
    (24,26),(26,28),(28,30),(30,32),(28,32),
    (23,25),(25,27),(27,29),(29,31),(27,31),
]

L_SHOULDER, R_SHOULDER = 11, 12
L_HIP,      R_HIP      = 23, 24
MIN_VIS = 0.20


def m1_slope(lms):
    vis = [(lms[i].visibility or 0) for i in (L_SHOULDER, R_SHOULDER, L_HIP, R_HIP)]
    if any(v < MIN_VIS for v in vis):
        return None, None, None
    sx = (lms[L_SHOULDER].x + lms[R_SHOULDER].x) / 2
    sy = (lms[L_SHOULDER].y + lms[R_SHOULDER].y) / 2
    hx = (lms[L_HIP].x     + lms[R_HIP].x)      / 2
    hy = (lms[L_HIP].y     + lms[R_HIP].y)       / 2
    dx, dy = hx - sx, -(hy - sy)
    raw = math.degrees(math.atan2(dy, dx))
    nose_x = lms[0].x
    facing_right = nose_x > hx
    horiz = (sx - hx) if facing_right else (hx - sx)
    lean  = math.degrees(math.atan2(horiz, hy - sy))
    higher = "shoulders" if sy < hy else "hips"
    return round(raw, 2), round(lean, 2), higher


def draw_person(frame, lms, w, h, col, label):
    for (a, b) in POSE_CONNECTIONS:
        va = lms[a].visibility or 0
        vb = lms[b].visibility or 0
        if va < MIN_VIS or vb < MIN_VIS:
            continue
        cv2.line(frame,
                 (int(lms[a].x*w), int(lms[a].y*h)),
                 (int(lms[b].x*w), int(lms[b].y*h)),
                 col, 3, cv2.LINE_AA)
    for lm in lms:
        vis = lm.visibility or 0
        if vis < MIN_VIS:
            continue
        cx, cy = int(lm.x*w), int(lm.y*h)
        r = max(4, int(vis*9))
        cv2.circle(frame, (cx,cy), r,     col,          -1, cv2.LINE_AA)
        cv2.circle(frame, (cx,cy), r+1, (255,255,255),   1, cv2.LINE_AA)

    # Measurement line
    vs = [(lms[i].visibility or 0) for i in (L_SHOULDER, R_SHOULDER, L_HIP, R_HIP)]
    if all(v >= MIN_VIS for v in vs):
        sx = int((lms[L_SHOULDER].x + lms[R_SHOULDER].x)/2*w)
        sy = int((lms[L_SHOULDER].y + lms[R_SHOULDER].y)/2*h)
        hx = int((lms[L_HIP].x     + lms[R_HIP].x)     /2*w)
        hy = int((lms[L_HIP].y     + lms[R_HIP].y)     /2*h)
        cv2.line(frame, (sx,sy), (hx,hy), (0,220,255), 4, cv2.LINE_AA)
        for pt in ((sx,sy),(hx,hy)):
            cv2.circle(frame, pt, 9,  (255,255,0),   -1, cv2.LINE_AA)
            cv2.circle(frame, pt, 10, (255,255,255),   1, cv2.LINE_AA)

    # Person label at hip
    lx = int((lms[L_HIP].x + lms[R_HIP].x)/2*w)
    ly = int((lms[L_HIP].y + lms[R_HIP].y)/2*h)
    font, scale, thick = cv2.FONT_HERSHEY_SIMPLEX, 1.6, 3
    (tw, th), _ = cv2.getTextSize(label, font, scale, thick)
    cv2.rectangle(frame, (lx-8, ly-th-8), (lx+tw+8, ly+8), (20,20,20), -1)
    cv2.putText(frame, label, (lx, ly), font, scale, col, thick, cv2.LINE_AA)


frame = cv2.imread(SRC)
h, w  = frame.shape[:2]

options = PoseLandmarkerOptions(
    base_options        = BaseOptions(model_asset_path=MODEL_PATH),
    running_mode        = RunningMode.IMAGE,
    num_poses           = 6,
    min_pose_detection_confidence = 0.3,
    min_pose_presence_confidence  = 0.3,
)

with PoseLandmarker.create_from_options(options) as det:
    result = det.detect(mp.Image(image_format=mp.ImageFormat.SRGB,
                                 data=cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)))

n = len(result.pose_landmarks) if result.pose_landmarks else 0
print(f"Detected {n} persons (conf=0.3)\n")
print(f"{'Person':>6}  {'slope_deg':>10}  {'lean_from_vert':>14}  {'higher':>10}  note")
print("-" * 56)

for p_idx, lms in enumerate(result.pose_landmarks or []):
    col   = PERSON_COLOURS[p_idx % len(PERSON_COLOURS)]
    label = f"P{p_idx}"
    draw_person(frame, lms, w, h, col, label)

    raw, lean, higher = m1_slope(lms)
    if raw is None:
        print(f"{p_idx:>6}  {'N/A':>10}  {'N/A':>14}  {'N/A':>10}  low_vis")
    else:
        new = "" if p_idx < 2 else "  *** NEW ***"
        print(f"{p_idx:>6}  {raw:>10.2f}  {lean:>14.2f}  {higher:>10}{new}")

# Legend
for p_idx in range(n):
    col = PERSON_COLOURS[p_idx % len(PERSON_COLOURS)]
    y   = 40 + p_idx * 38
    cv2.rectangle(frame, (10, y-22), (30, y+6), col, -1)
    cv2.putText(frame, f"P{p_idx}", (36, y),
                cv2.FONT_HERSHEY_SIMPLEX, 0.9, col, 2, cv2.LINE_AA)

# Watermark the confidence setting
cv2.putText(frame, "conf=0.3", (w-180, h-15),
            cv2.FONT_HERSHEY_SIMPLEX, 0.7, (180,180,180), 2, cv2.LINE_AA)

cv2.imwrite(DST, frame)
print(f"\nSaved: {DST}")
print()
print(f"[QA] Review the output, then delete it:  del \"{DST}\"")
