"""
Draw skeleton overlays on the three stance stills.
Each detected person gets a distinct colour and a large "P0 / P1" label
at their hip midpoint so you can confirm identity across frames.
Also draws the shoulder->hip measurement line used for M1 slope.
"""

import cv2, math, sys
import mediapipe as mp
from mediapipe.tasks.python        import BaseOptions
from mediapipe.tasks.python.vision import PoseLandmarker, PoseLandmarkerOptions, RunningMode

MODEL_PATH = r"C:\Users\abyno\PracticeField\scripts\pose_landmarker_heavy.task"
SCRIPTS    = r"C:\Users\abyno\PracticeField\scripts"

STILLS = [
    ("0606_rep1_7s.png", "check_7s.png"),
    ("0606_rep1_8s.png", "check_8s.png"),
    ("0606_rep1_9s.png", "check_9s.png"),
]

# One colour per person index (BGR)
PERSON_COLOURS = [
    (0,   220,  60),   # green   – person 0
    (60,  100, 255),   # orange  – person 1
    (255,  60, 200),   # magenta – person 2
    (0,   220, 255),   # yellow  – person 3
]

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

L_SHOULDER, R_SHOULDER = 11, 12
L_HIP,      R_HIP      = 23, 24
MIN_VIS = 0.20


def draw_person(frame, lms, w, h, col, label):
    # Skeleton connections
    for (a, b) in POSE_CONNECTIONS:
        la, lb = lms[a], lms[b]
        va = la.visibility if la.visibility is not None else 0
        vb = lb.visibility if lb.visibility is not None else 0
        if va < MIN_VIS or vb < MIN_VIS:
            continue
        pta = (int(la.x * w), int(la.y * h))
        ptb = (int(lb.x * w), int(lb.y * h))
        cv2.line(frame, pta, ptb, col, 3, cv2.LINE_AA)

    # Landmark dots
    for lm in lms:
        vis = lm.visibility if lm.visibility is not None else 0
        if vis < MIN_VIS:
            continue
        cx, cy = int(lm.x * w), int(lm.y * h)
        r = max(4, int(vis * 9))
        cv2.circle(frame, (cx, cy), r,     col,           -1, cv2.LINE_AA)
        cv2.circle(frame, (cx, cy), r + 1, (255,255,255),  1, cv2.LINE_AA)

    # Shoulder→hip measurement line
    vs = [(lms[i].visibility or 0) for i in (L_SHOULDER, R_SHOULDER, L_HIP, R_HIP)]
    if all(v >= MIN_VIS for v in vs):
        sx = int((lms[L_SHOULDER].x + lms[R_SHOULDER].x) / 2 * w)
        sy = int((lms[L_SHOULDER].y + lms[R_SHOULDER].y) / 2 * h)
        hx = int((lms[L_HIP].x     + lms[R_HIP].x)      / 2 * w)
        hy = int((lms[L_HIP].y     + lms[R_HIP].y)       / 2 * h)
        cv2.line(frame, (sx, sy), (hx, hy), (0, 220, 255), 4, cv2.LINE_AA)
        for pt in ((sx, sy), (hx, hy)):
            cv2.circle(frame, pt, 9,  (255, 255, 0),   -1, cv2.LINE_AA)
            cv2.circle(frame, pt, 10, (255, 255, 255),  1, cv2.LINE_AA)

    # Large person label at hip midpoint (or fallback to shoulder)
    lx = int((lms[L_HIP].x + lms[R_HIP].x) / 2 * w) if (lms[L_HIP].visibility or 0) > MIN_VIS else \
         int((lms[L_SHOULDER].x + lms[R_SHOULDER].x) / 2 * w)
    ly = int((lms[L_HIP].y + lms[R_HIP].y) / 2 * h) if (lms[L_HIP].visibility or 0) > MIN_VIS else \
         int((lms[L_SHOULDER].y + lms[R_SHOULDER].y) / 2 * h)

    # Background rect for readability
    font, scale, thick = cv2.FONT_HERSHEY_SIMPLEX, 1.6, 3
    (tw, th), _ = cv2.getTextSize(label, font, scale, thick)
    pad = 8
    cv2.rectangle(frame,
                  (lx - pad, ly - th - pad),
                  (lx + tw + pad, ly + pad),
                  (20, 20, 20), -1)
    cv2.putText(frame, label, (lx, ly), font, scale, col, thick, cv2.LINE_AA)


def main():
    options = PoseLandmarkerOptions(
        base_options        = BaseOptions(model_asset_path=MODEL_PATH),
        running_mode        = RunningMode.IMAGE,
        num_poses           = 4,
        min_pose_detection_confidence = 0.4,
        min_pose_presence_confidence  = 0.4,
    )

    with PoseLandmarker.create_from_options(options) as det:
        for src_name, dst_name in STILLS:
            src = f"{SCRIPTS}\\{src_name}"
            dst = f"{SCRIPTS}\\{dst_name}"

            frame = cv2.imread(src)
            if frame is None:
                print(f"ERROR: cannot read {src}"); continue

            h, w = frame.shape[:2]
            rgb    = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            mp_img = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb)
            result = det.detect(mp_img)

            if not result.pose_landmarks:
                print(f"{src_name}: NO DETECTION")
                cv2.imwrite(dst, frame)
                continue

            n = len(result.pose_landmarks)
            for p_idx, lms in enumerate(result.pose_landmarks):
                col   = PERSON_COLOURS[p_idx % len(PERSON_COLOURS)]
                label = f"P{p_idx}"
                draw_person(frame, lms, w, h, col, label)

            # Top-left legend
            for p_idx in range(n):
                col = PERSON_COLOURS[p_idx % len(PERSON_COLOURS)]
                y   = 40 + p_idx * 38
                cv2.rectangle(frame, (10, y - 22), (30, y + 6), col, -1)
                cv2.putText(frame, f"P{p_idx}", (36, y),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.9, col, 2, cv2.LINE_AA)

            cv2.imwrite(dst, frame)
            print(f"{src_name} -> {dst_name}  ({n} persons detected)")

    print("Done.")
    print()
    print("[QA] Review the check images, then delete them:")
    for _, dst_name in STILLS:
        print(f"     del \"{SCRIPTS}\\{dst_name}\"")
    print("Source stills are NOT deleted here — run m1_measure_stills.py to extract")
    print("measurements and delete source when you are satisfied with detection quality.")


if __name__ == "__main__":
    main()
