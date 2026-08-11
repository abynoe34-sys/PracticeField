"""
layer2_phases.py — Layer 2 of the Dynamic Movement Analysis pipeline.

Layer 1 (layer1_spine) produces a per-frame series: landmarks, world coordinates,
timestamps, per-region confidence. It does not know what any frame MEANS. Layer 2
segments that series into named moments — stance, movement start, the drop and its
steps, the plant, the load, the release, the follow-through.

It is built from POSITION-AGNOSTIC primitives (ground contact / steps, crossover,
direction of travel, vertical oscillation, arm-elevation/release). QB phase naming sits
on top of those primitives, so WR/DB/OL catalogues can reuse the primitives later.

THE HONESTY CONTRACT (the most important part):
  - Layer 2 never invents a phase it cannot find. A missing phase is returned as an
    explicit absence WITH A REASON, never a guessed frame.
  - Every present phase carries a confidence and a detection basis (which primitive
    fired, at which frame).
  - No interpolation: a plant is not back-estimated from the release.
  - Confidence varies with the underlying landmark confidence (Layer 1 already degrades
    honestly at fast-motion moments; Layer 2 inherits that, not smooths it).

EXPLICITLY NOT here: no measurement, no verdicts/thresholds, no catalogue reads, no ball
tracking (release is detected from arm kinematics alone), no multi-person, no run-concept.

Optional context (hints that raise confidence, never required):
  - `technique` (e.g. "Gun 5 Step") → expect a step/crossover count, report a mismatch.
  - `handedness` → else inferred from which wrist elevates most (reported as inferred).
"""

from __future__ import annotations

import json
import math
from dataclasses import dataclass, field, asdict

import numpy as np

# BlazePose-33 indices
NOSE = 0
LSH, RSH = 11, 12
LEL, REL = 13, 14
LWR, RWR = 15, 16
LHIP, RHIP = 23, 24
LKNE, RKNE = 25, 26
LANK, RANK = 27, 28
LHEEL, RHEEL = 29, 30
LFI, RFI = 31, 32

MIN_VIS = 0.25

# Thresholds. Vertical quantities are normalised by TORSO LENGTH (shoulder-mid →
# hip-mid), a clip-stable scale, NOT per-frame shoulder width — shoulder width collapses
# under foreshortening (a side-on clip has near-zero shoulder width and would blow up any
# elevation ratio). First-cut values; tune only against calibrated footage.
MOVE_ON = 0.010    # motion (torso-len/frame) above this = moving
MOVE_OFF = 0.006   # motion below this = still (hysteresis)
MOVE_MIN_RUN = 4   # frames of sustained motion to call it a real start
STEP_REFRACTORY = 10  # min frames between plants of the SAME foot (~0.17s @ 60fps)
STEP_MIN_SWING = 0.12 # foot must rise this far (torso-len) before a plant counts
# Release is measured in WORLD space (metric, hip-centred) so it's camera-angle-
# independent — normalised by the world torso length (shoulder-mid → hip-mid, ~0.45 m).
# Measured separation on the dev clips: a get-off arm-swing peaks ~0.44 torso above the
# shoulder; a real overhead throw ~0.63. First-cut threshold sits between; a peak within
# REL_MARGIN of it is flagged low-confidence rather than asserted.
REL_ELEV_MIN = 0.55   # throwing wrist must peak this far above the shoulder (world torso)
REL_ELEV_CAP = 1.60   # beyond this is a landmark glitch — ignored, not trusted
REL_RISE_MIN = 0.30   # the throwing arm must actually RISE by this much into the peak
REL_MARGIN = 0.10     # peak within this of the threshold → release flagged low-confidence


# ── result types ──────────────────────────────────────────────────────────────
@dataclass
class StepEvent:
    order: int
    foot: str                 # 'left' | 'right'
    plant_frame: int
    plant_ts_ms: int
    stride_sw: float | None    # displacement from previous plant, in shoulder widths
    crossover: str | None      # 'foot' (designed) | 'knee' (karaoke fault) | None
    confidence: float          # mean feet-region visibility around the plant


@dataclass
class Phase:
    name: str
    start_frame: int
    end_frame: int
    start_ts_ms: int
    end_ts_ms: int
    confidence: float
    basis: str


@dataclass
class AbsentPhase:
    name: str
    reason: str


@dataclass
class PhaseResult:
    source: str
    fps: float
    frame_count: int
    present: list[Phase] = field(default_factory=list)
    absent: list[AbsentPhase] = field(default_factory=list)
    steps: list[StepEvent] = field(default_factory=list)
    handedness: str | None = None
    handedness_basis: str = ""
    direction: str | None = None
    direction_basis: str = ""
    primitives: dict = field(default_factory=dict)
    notes: list[str] = field(default_factory=list)

    def to_json(self) -> str:
        return json.dumps({
            "source": self.source, "fps": self.fps, "frame_count": self.frame_count,
            "handedness": self.handedness, "handedness_basis": self.handedness_basis,
            "direction": self.direction, "direction_basis": self.direction_basis,
            "present": [asdict(p) for p in self.present],
            "absent": [asdict(a) for a in self.absent],
            "steps": [asdict(s) for s in self.steps],
            "primitives": self.primitives, "notes": self.notes,
        }, ensure_ascii=False, indent=2)


# ── series extraction ───────────────────────────────────────────────────────────
def _frames_of(clip) -> tuple[list[dict], float, str]:
    """Accept a ClipSpineResult, its .frames, or a parsed series dict/list."""
    if hasattr(clip, "frames"):  # ClipSpineResult
        fr = [asdict(f) if hasattr(f, "__dataclass_fields__") else f for f in clip.frames]
        return fr, float(clip.fps), getattr(clip, "source", "")
    if isinstance(clip, dict) and "frames" in clip:
        return clip["frames"], float(clip.get("fps", 60.0)), clip.get("source", "")
    if isinstance(clip, list):
        return clip, 60.0, ""
    raise TypeError("layer2 expects a ClipSpineResult, a series dict, or a frames list")


def _xy(frame: dict, idx: int):
    """(x, y) of a landmark if detected & visible enough, else (nan, nan)."""
    lms = frame.get("landmarks")
    if not lms:
        return math.nan, math.nan
    l = lms[idx]
    if (l.get("visibility") or 0.0) < MIN_VIS:
        return math.nan, math.nan
    return l["x"], l["y"]


def _nan_smooth(a: np.ndarray, w: int = 5) -> np.ndarray:
    """Moving average ignoring NaNs (keeps NaN where the whole window is NaN)."""
    n = len(a)
    out = np.full(n, np.nan)
    half = w // 2
    for i in range(n):
        seg = a[max(0, i - half): i + half + 1]
        seg = seg[~np.isnan(seg)]
        if len(seg):
            out[i] = seg.mean()
    return out


def _build_signals(frames: list[dict]) -> dict:
    n = len(frames)
    S = {k: np.full(n, np.nan) for k in (
        "sw", "hipx", "hipy", "shx", "shy", "nosex",
        "lank_y", "rank_y", "lfi_x", "rfi_x", "lank_x", "rank_x",
        "lwr_y", "rwr_y", "lkne_x", "rkne_x",
        "cx", "cy", "conf", "feet_c", "arms_c", "lower_c", "upper_c",
        # world-space (metric, hip-centred, camera-angle-independent) — for release
        "w_shy", "w_lwr_y", "w_rwr_y", "w_torso")}
    ts = np.zeros(n, dtype=np.int64)
    for i, f in enumerate(frames):
        ts[i] = f.get("timestamp_ms", i)
        if not f.get("detected"):
            continue
        lsx, lsy = _xy(f, LSH); rsx, rsy = _xy(f, RSH)
        lhx, lhy = _xy(f, LHIP); rhx, rhy = _xy(f, RHIP)
        sw = abs(lsx - rsx) if not (math.isnan(lsx) or math.isnan(rsx)) else math.nan
        S["sw"][i] = sw
        S["shx"][i] = np.nanmean([lsx, rsx]); S["shy"][i] = np.nanmean([lsy, rsy])
        S["hipx"][i] = np.nanmean([lhx, rhx]); S["hipy"][i] = np.nanmean([lhy, rhy])
        S["nosex"][i] = _xy(f, NOSE)[0]
        # feet: prefer foot-index, fall back to ankle
        for side, ank, fi in (("l", LANK, LFI), ("r", RANK, RFI)):
            ax, ay = _xy(f, ank); fx, fy = _xy(f, fi)
            S[f"{side}ank_y"][i] = ay if not math.isnan(ay) else fy
            S[f"{side}ank_x"][i] = ax if not math.isnan(ax) else fx
        S["lfi_x"][i] = _xy(f, LFI)[0]; S["rfi_x"][i] = _xy(f, RFI)[0]
        S["lkne_x"][i] = _xy(f, LKNE)[0]; S["rkne_x"][i] = _xy(f, RKNE)[0]
        S["lwr_y"][i] = _xy(f, LWR)[1]; S["rwr_y"][i] = _xy(f, RWR)[1]
        # world landmarks — vertical wrist elevation is view-independent here, unlike the
        # image-y projection which collapses under a side vs front camera.
        wl = f.get("world_landmarks")
        if wl:
            def _wy(idx):
                l = wl[idx]
                return l["y"] if (l.get("visibility") or 0.0) >= MIN_VIS else math.nan
            S["w_shy"][i] = np.nanmean([_wy(LSH), _wy(RSH)])
            S["w_lwr_y"][i] = _wy(LWR); S["w_rwr_y"][i] = _wy(RWR)
            shm = [np.nanmean([wl[LSH][k], wl[RSH][k]]) for k in ("x", "y", "z")]
            hpm = [np.nanmean([wl[LHIP][k], wl[RHIP][k]]) for k in ("x", "y", "z")]
            S["w_torso"][i] = math.sqrt(sum((shm[j] - hpm[j]) ** 2 for j in range(3)))
        c = f.get("centroid") or [math.nan, math.nan]
        S["cx"][i], S["cy"][i] = c[0], c[1]
        S["conf"][i] = f.get("confidence") or math.nan
        rc = f.get("region_confidence") or {}
        S["feet_c"][i] = rc.get("feet", math.nan)
        S["arms_c"][i] = np.nanmean([rc.get("left_arm", math.nan), rc.get("right_arm", math.nan)])
        S["lower_c"][i] = rc.get("lower_body", math.nan)
        S["upper_c"][i] = rc.get("upper_body", math.nan)
    S["ts"] = ts
    return S


def _mean_conf(sig: np.ndarray, a: int, b: int) -> float:
    seg = sig[max(0, a): b + 1]
    seg = seg[~np.isnan(seg)]
    return round(float(seg.mean()), 3) if len(seg) else 0.0


def _torso_len(S: dict) -> float:
    """Clip-stable vertical scale = median |hip_mid_y − shoulder_mid_y|. Robust to the
    shoulder-width collapse that foreshortening causes in side views."""
    tl = np.abs(S["hipy"] - S["shy"])
    tl = tl[~np.isnan(tl)]
    return float(np.median(tl)) if len(tl) else float("nan")


# ── primitives ──────────────────────────────────────────────────────────────────
def _motion(S: dict) -> np.ndarray:
    """Per-frame motion magnitude (sw/frame): centroid speed + mean wrist/ankle speed."""
    n = len(S["ts"])
    sw = _nan_smooth(S["sw"], 9)
    def spd(x, y):
        v = np.full(n, np.nan)
        for i in range(1, n):
            if not any(np.isnan([x[i], x[i-1], y[i], y[i-1], sw[i]])) and sw[i] > 1e-6:
                v[i] = math.hypot(x[i]-x[i-1], y[i]-y[i-1]) / sw[i]
        return v
    parts = [spd(S["cx"], S["cy"]), spd(S["lank_x"], S["lank_y"]),
             spd(S["rank_x"], S["rank_y"])]
    m = np.nanmean(np.vstack(parts), axis=0)
    return _nan_smooth(m, 5)


def detect_stance_movement_start(S: dict) -> tuple[int | None, int | None, str]:
    """Leading low-motion stance, then the first sustained motion frame. Honest about a
    clip that begins already moving (stance = None)."""
    m = _motion(S)
    n = len(m)
    start = None
    for i in range(n):
        if not np.isnan(m[i]) and m[i] > MOVE_ON:
            run = [j for j in range(i, min(n, i + MOVE_MIN_RUN))]
            if all((not np.isnan(m[j])) and m[j] > MOVE_OFF for j in run):
                start = i
                break
    if start is None:
        return None, None, "no sustained movement detected (clip may be stance-only)"
    if start == 0:
        return None, 0, "clip begins already in motion (no stance captured)"
    return 0, start, f"motion rose above {MOVE_ON} torso-len/frame at frame {start} and stayed"


def detect_ground_contacts(S: dict, tl: float) -> dict:
    """Per-foot plant frames: a foot is planted at a local vertical MINIMUM (foot lowest
    = rel maximum) that is (a) preceded by a real swing of ≥ STEP_MIN_SWING torso-len,
    and (b) separated from the previous plant of that foot by ≥ STEP_REFRACTORY frames.
    Conservative on purpose — a jittery foot signal must not spray false steps."""
    n = len(S["ts"])
    R = STEP_REFRACTORY
    out = {}
    for side in ("l", "r"):
        ank = _nan_smooth(S[f"{side}ank_y"], 5)
        rel = np.full(n, np.nan)
        for i in range(n):
            if not any(np.isnan([ank[i], S["hipy"][i]])) and tl and tl > 1e-6:
                rel[i] = (ank[i] - S["hipy"][i]) / tl     # foot below hips, larger = lower
        plants, last = [], -10 ** 9
        for i in range(R, n - R):
            if np.isnan(rel[i]):
                continue
            seg = rel[i - R:i + R + 1]
            if np.all(np.isnan(seg)) or rel[i] < np.nanmax(seg):
                continue                                   # not the local lowest point
            pre = rel[max(0, i - 20):i]; pre = pre[~np.isnan(pre)]
            if not len(pre) or (rel[i] - np.min(pre)) < STEP_MIN_SWING:
                continue                                   # no real swing before this plant
            if i - last < R:
                continue                                   # refractory
            plants.append(i); last = i
        out[side] = plants
    out["confidence"] = _mean_conf(S["feet_c"], 0, n - 1)
    return out


def _order(a, b):
    if math.isnan(a) or math.isnan(b):
        return 0
    return 1 if a < b else -1


def detect_steps(S: dict, contacts: dict, tl: float) -> list[StepEvent]:
    """Compose ground contacts into an ordered step list with stride length (in
    torso-length units — a side-view-stable scale; shoulder width is front-view-only per
    the derivation module) and a per-plant crossover classification (foot vs knee)."""
    n = len(S["ts"])
    events = []
    for side, foot in (("l", "left"), ("r", "right")):
        for fr in contacts[side]:
            events.append((fr, foot, side))
    events.sort()
    # baseline L/R order (feet & knees) taken from the earliest detected frame
    base_feet = base_knee = 0
    for i in range(n):
        of = _order(S["lfi_x"][i], S["rfi_x"][i]); ok = _order(S["lkne_x"][i], S["rkne_x"][i])
        if of and ok:
            base_feet, base_knee = of, ok
            break
    steps, prev_x = [], None
    for k, (fr, foot, side) in enumerate(events):
        fx = S[f"{side}ank_x"][fr]
        stride = None
        if prev_x is not None and not math.isnan(fx) and not math.isnan(prev_x) and tl and tl > 1e-6:
            stride = round(abs(fx - prev_x) / tl, 3)
        prev_x = fx if not math.isnan(fx) else prev_x
        feet_flip = _order(S["lfi_x"][fr], S["rfi_x"][fr]) not in (0, base_feet)
        knee_flip = _order(S["lkne_x"][fr], S["rkne_x"][fr]) not in (0, base_knee)
        steps.append(StepEvent(
            order=k + 1, foot=foot, plant_frame=fr, plant_ts_ms=int(S["ts"][fr]),
            stride_sw=stride, crossover=classify_crossover(feet_flip, knee_flip),
            confidence=_mean_conf(S["feet_c"], fr - 2, fr + 2)))
    return steps


def classify_crossover(feet_flip: bool, knee_flip: bool) -> str | None:
    """Position-agnostic crossover classifier.

    'foot'  — the FEET cross (their L/R x-order flips vs stance) while the KNEES stay on
              the linear path. This is the DESIGNED crossover of a QB drop — NOT a fault.
    'knee'  — the KNEES cross the midline (karaoke-style). This IS a fault, regardless of
              the feet. Knee-crossing dominates the classification.
    None    — neither crosses.
    """
    if knee_flip:
        return "knee"
    if feet_flip:
        return "foot"
    return None


def detect_direction(S: dict, tl: float, a: int, b: int) -> tuple[str, str, float]:
    """Direction of travel over [a,b] from centroid displacement, relative to facing.
    Returns (label, basis, confidence). 2D genuinely cannot resolve toward/away from a
    front camera, so that case returns LOW confidence rather than a confident guess — the
    caller must not gate phase presence on a low-confidence direction."""
    xs = S["cx"][a:b + 1]; ys = S["cy"][a:b + 1]
    xs = xs[~np.isnan(xs)]; ys = ys[~np.isnan(ys)]
    if len(xs) < 2 or not tl or tl <= 1e-6:
        return "unknown", "insufficient centroid track", 0.0
    dx = xs[-1] - xs[0]; dy = ys[-1] - ys[0]
    mag = math.hypot(dx, dy) / tl
    # facing: sign of nose-vs-hip horizontal offset (median over the window)
    off = np.nanmedian((S["nosex"][a:b + 1] - S["hipx"][a:b + 1]))
    off_tl = (off / tl) if not math.isnan(off) else 0.0
    if abs(off_tl) < 0.15:
        return ("toward/away (depth)",
                f"facing the camera (nose≈hips, offset {off_tl:.2f} torso-len) — 2D cannot "
                f"resolve a backward drop from forward on a front view; in-frame travel "
                f"{mag:.2f} torso-len", 0.2)
    if mag < 0.5:
        return "minimal", f"centroid moved only {mag:.2f} torso-len in frame", 0.3
    if abs(dx) >= abs(dy):
        lab = "forward" if (dx > 0) == (off_tl > 0) else "backward"
        conf = round(min(0.9, 0.4 + mag / 10), 2)
        return lab, f"centroid moved {mag:.2f} torso-len horizontally ({lab} relative to facing)", conf
    return "vertical-in-frame", f"centroid moved {mag:.2f} torso-len vertically in frame", 0.3


def vertical_oscillation(S: dict, tl: float, a: int, b: int) -> float:
    """Bounce-vs-glide: hip vertical std over [a,b], in torso-length units. A within-clip
    relative measure — the 2D vertical scale is camera-angle-dependent, so do not compare
    the raw value across clips of different camera angles."""
    hip = S["hipy"][a:b + 1]
    hip = hip[~np.isnan(hip)]
    if len(hip) < 3 or not tl or tl <= 1e-6:
        return float("nan")
    return round(float(np.std(hip) / tl), 3)


def detect_release(S: dict, handedness: str | None) -> dict:
    """Infer the throwing arm and the release frame from WORLD-space wrist elevation above
    the shoulder line, normalised by the world torso length — camera-angle-independent, so
    a side-view get-off and a front-view throw sit on the same scale. Release must be
    detectable from arm kinematics ALONE (no ball). Guards against confidently-wrong:
      - world elevations beyond REL_ELEV_CAP are landmark glitches and are ignored;
      - the arm must RISE by REL_RISE_MIN into the peak (a static high hand is not a throw);
      - a peak within REL_MARGIN of the threshold is reported as a LOW-confidence release,
        not asserted."""
    n = len(S["ts"])
    w_torso = np.nanmedian(S["w_torso"])
    elev = {}
    for side, wr in (("left", "w_lwr_y"), ("right", "w_rwr_y")):
        e = np.full(n, np.nan)
        for i in range(n):
            # world y grows downward → (shoulder_y − wrist_y) > 0 when the wrist is higher
            if not any(np.isnan([S[wr][i], S["w_shy"][i]])) and w_torso and w_torso > 1e-6:
                v = (S["w_shy"][i] - S[wr][i]) / w_torso
                if abs(v) <= REL_ELEV_CAP:
                    e[i] = v
        elev[side] = _nan_smooth(e, 3)
    peak = {s: (float(np.nanmax(elev[s])) if np.any(~np.isnan(elev[s])) else -math.inf) for s in elev}
    inferred = "right" if peak["right"] >= peak["left"] else "left"
    basis = (f"world wrist elevation: right peaked {peak['right']:.2f} torso above shoulder, "
             f"left {peak['left']:.2f}")
    hand = handedness or inferred
    agree = handedness is None or handedness == inferred
    thr = elev[hand]
    pk = float(np.nanmax(thr)) if np.any(~np.isnan(thr)) else -math.inf
    res = {"handedness": hand, "handedness_inferred": inferred,
           "handedness_basis": basis + ("" if agree else f" — NOTE: supplied '{handedness}' "
                                        f"disagrees with inferred '{inferred}'"),
           "release_frame": None, "load_frame": None, "peak_elev_tl": round(pk, 3),
           "confidence": 0.0, "basis": ""}
    if pk < REL_ELEV_MIN:
        res["reason"] = (f"no release — throwing-arm wrist never went overhead (world peak "
                         f"{pk:.2f} torso above shoulder < {REL_ELEV_MIN} required)")
        return res
    rf = int(np.nanargmax(thr))
    pre = thr[max(0, rf - 25):rf]; pre = pre[~np.isnan(pre)]
    rise = (pk - float(np.min(pre))) if len(pre) else 0.0
    if rise < REL_RISE_MIN:
        res["reason"] = (f"no release — arm was high (world peak {pk:.2f} torso) but did not "
                         f"RISE into it (rise {rise:.2f} < {REL_RISE_MIN}); looks static, not a throw")
        return res
    res["release_frame"] = rf
    marginal = pk < REL_ELEV_MIN + REL_MARGIN
    res["confidence"] = round(min(0.95, 0.5 + (pk - REL_ELEV_MIN)), 2)
    res["basis"] = (f"throwing ({hand}) wrist peaked {pk:.2f} torso above shoulder (world), "
                    f"frame {rf}, rise {rise:.2f}" + (" — MARGINAL, low confidence" if marginal else ""))
    lf = None                                             # load = arm's low point before release
    for i in range(rf - 1, 0, -1):
        if np.isnan(thr[i]):
            continue
        if thr[i] <= np.nanmin(thr[max(0, i - 3):i + 4]) and thr[i] < pk - REL_RISE_MIN:
            lf = i
            break
    res["load_frame"] = lf
    return res


# ── composition ─────────────────────────────────────────────────────────────────
def detect_phases(clip, technique: str | None = None, handedness: str | None = None) -> PhaseResult:
    frames, fps, source = _frames_of(clip)
    n = len(frames)
    S = _build_signals(frames)
    tl = _torso_len(S)
    R = PhaseResult(source=source, fps=fps, frame_count=n)

    stance_start, move_start, move_basis = detect_stance_movement_start(S)
    rel = detect_release(S, handedness)
    R.handedness = rel["handedness"]; R.handedness_basis = rel["handedness_basis"]
    if handedness is None:
        R.notes.append(f"handedness INFERRED as '{rel['handedness_inferred']}' ({rel['handedness_basis']})")

    # window over which travel/steps are meaningful
    end_move = rel["release_frame"] if rel["release_frame"] is not None else n - 1
    win_a = move_start if move_start is not None else 0
    direction, dir_basis, dir_conf = detect_direction(S, tl, win_a, end_move)
    R.direction, R.direction_basis = direction, dir_basis

    contacts = detect_ground_contacts(S, tl)
    R.steps = detect_steps(S, contacts, tl)

    osc = vertical_oscillation(S, tl, win_a, end_move)
    R.primitives = {
        "torso_len_scale": round(tl, 4) if not math.isnan(tl) else None,
        "ground_contacts": {"left": contacts["l"], "right": contacts["r"],
                            "confidence": contacts["confidence"]},
        "step_count": len(R.steps),
        "crossovers": {"foot": sum(s.crossover == "foot" for s in R.steps),
                       "knee": sum(s.crossover == "knee" for s in R.steps)},
        "direction": {"label": direction, "basis": dir_basis, "confidence": dir_conf},
        "vertical_oscillation_tl": osc,
        "release": {k: rel[k] for k in ("release_frame", "load_frame", "peak_elev_tl", "basis")},
    }

    def ts(i): return int(S["ts"][i])

    # Pre-snap / stance
    if stance_start is not None and move_start is not None:
        R.present.append(Phase("Pre-snap / stance", stance_start, move_start - 1,
                               ts(stance_start), ts(move_start - 1),
                               _mean_conf(S["conf"], stance_start, move_start - 1),
                               f"low-motion period before movement start"))
        R.present.append(Phase("Snap / movement start", move_start, move_start,
                               ts(move_start), ts(move_start), _mean_conf(S["conf"], move_start, move_start),
                               move_basis))
    else:
        R.absent.append(AbsentPhase("Pre-snap / stance", move_basis))
        if move_start is not None:
            R.present.append(Phase("Snap / movement start", move_start, move_start,
                                   ts(move_start), ts(move_start), _mean_conf(S["conf"], move_start, move_start),
                                   move_basis))
        else:
            R.absent.append(AbsentPhase("Snap / movement start", move_basis))

    # Drop / movement. Direction from 2D is unreliable, so the movement SPAN is reported
    # as present (it genuinely happened) with the measured direction + its confidence in
    # the basis — never asserting backward-drop vs forward-get-off beyond what the
    # confidence supports. No phase is invented; none is suppressed on a shaky direction.
    plant_frame = None
    if move_start is not None:
        drop_end = rel["load_frame"] or rel["release_frame"] or end_move
        steps_in = [s for s in R.steps if move_start <= s.plant_frame <= drop_end]
        R.present.append(Phase("Drop / movement", move_start, drop_end, ts(move_start), ts(drop_end),
                               _mean_conf(S["lower_c"], move_start, drop_end),
                               f"travel between movement start and the throwing motion; "
                               f"direction '{direction}' (confidence {dir_conf}: {dir_basis}); "
                               f"{len(steps_in)} step(s)"))
        # Plant = last step plant before the load/throw (NOT interpolated from the release)
        if steps_in:
            plant_frame = steps_in[-1].plant_frame
            R.present.append(Phase("Plant", plant_frame, plant_frame, ts(plant_frame), ts(plant_frame),
                                   _mean_conf(S["feet_c"], plant_frame - 2, plant_frame + 2),
                                   f"final detected step plant before the throwing motion (step {steps_in[-1].order})"))
        else:
            R.absent.append(AbsentPhase("Plant",
                f"no step plant located before the throwing motion (steps detected: {len(R.steps)}, "
                f"feet confidence {contacts['confidence']:.2f})"))

    # Load / Release / Follow-through
    if rel["release_frame"] is not None:
        rf = rel["release_frame"]
        if rel["load_frame"] is not None:
            lf = rel["load_frame"]
            R.present.append(Phase("Load", lf, rf - 1, ts(lf), ts(rf - 1),
                                   _mean_conf(S["arms_c"], lf, rf - 1),
                                   f"throwing-arm elevation began rising at frame {lf}"))
        else:
            R.absent.append(AbsentPhase("Load", "arm's pre-release low point not isolable"))
        R.present.append(Phase("Release", rf, rf, ts(rf), ts(rf),
                               _mean_conf(S["arms_c"], rf - 2, rf + 2), rel["basis"]))
        # Follow-through = release → motion settles
        m = _motion(S); settle = n - 1
        for i in range(rf + 1, n):
            if not np.isnan(m[i]) and m[i] < MOVE_OFF:
                settle = i
                break
        R.present.append(Phase("Follow-through", rf + 1, settle, ts(min(rf + 1, n - 1)), ts(settle),
                               _mean_conf(S["arms_c"], rf + 1, settle),
                               "deceleration after release until motion settled"))
    else:
        for name in ("Load", "Release", "Follow-through"):
            R.absent.append(AbsentPhase(name, rel["reason"]))

    # technique hint reconciliation (report, don't enforce)
    if technique:
        R.notes.append(_reconcile_technique(technique, R.steps))
    return R


_EXPECTED = {  # technique → (steps, crossovers) — drops only; a hint, not a rule
    "3 step": (3, 1), "5 step": (5, 2), "7 step": (7, 3),
}


def _reconcile_technique(technique: str, steps: list[StepEvent]) -> str:
    key = next((k for k in _EXPECTED if k in technique.lower()), None)
    if not key:
        return f"technique hint '{technique}' — no step/crossover expectation on file"
    exp_steps, exp_cross = _EXPECTED[key]
    got_cross = sum(s.crossover in ("foot", "knee") for s in steps)
    ok = "matches" if (len(steps) == exp_steps and got_cross == exp_cross) else "MISMATCH"
    return (f"technique hint '{technique}': expected {exp_steps} steps / {exp_cross} crossovers, "
            f"detected {len(steps)} steps / {got_cross} crossovers — {ok}")


# ── overlay (dev / verification aid) ─────────────────────────────────────────────
def render_phase_overlay(clip_path: str, series, result: PhaseResult, out_path: str) -> str:
    import cv2
    frames, fps, _ = _frames_of(series)
    by = {f["frame_index"]: f for f in frames}
    cap = cv2.VideoCapture(clip_path)
    w = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH)); h = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    vw = cv2.VideoWriter(out_path, cv2.VideoWriter_fourcc(*"mp4v"), fps, (w, h))
    # frame -> phase label
    label = {}
    for p in result.present:
        for fr in range(p.start_frame, p.end_frame + 1):
            label[fr] = f"{p.name} (c={p.confidence:.2f})"
    step_frames = {s.plant_frame: s for s in result.steps}
    rel_frame = next((p.start_frame for p in result.present if p.name == "Release"), None)
    conn = [(11,13),(13,15),(12,14),(14,16),(11,12),(23,24),(11,23),(12,24),
            (23,25),(25,27),(24,26),(26,28),(27,31),(28,32),(0,11),(0,12)]
    i = 0
    while True:
        ok, fr = cap.read()
        if not ok:
            break
        rec = by.get(i)
        if rec and rec.get("landmarks"):
            pts = [(int(l["x"]*w), int(l["y"]*h)) for l in rec["landmarks"]]
            for a, b in conn:
                cv2.line(fr, pts[a], pts[b], (0, 180, 0), 2)
        cv2.putText(fr, label.get(i, "—"), (12, 44), cv2.FONT_HERSHEY_SIMPLEX, 1.1, (0, 255, 255), 2)
        if i in step_frames:
            s = step_frames[i]
            tag = f"STEP {s.order} ({s.foot}{'' if not s.crossover else '/'+s.crossover+'-cross'})"
            cv2.putText(fr, tag, (12, 92), cv2.FONT_HERSHEY_SIMPLEX, 1.0, (255, 200, 0), 2)
        if rel_frame is not None and abs(i - rel_frame) <= 2:
            cv2.putText(fr, "RELEASE", (w // 2 - 120, 80), cv2.FONT_HERSHEY_SIMPLEX, 1.6, (0, 0, 255), 3)
        vw.write(fr)
        i += 1
    cap.release(); vw.release()
    return out_path


def _main(argv=None):
    import argparse
    ap = argparse.ArgumentParser(description="Layer 2 — phase detection over a Layer 1 series.")
    ap.add_argument("series_json", help="a Layer 1 series JSON (from layer1_spine --series)")
    ap.add_argument("--technique"); ap.add_argument("--handedness")
    ap.add_argument("--clip", help="original clip, to render a phase overlay")
    ap.add_argument("--overlay")
    args = ap.parse_args(argv)
    series = json.load(open(args.series_json, encoding="utf-8"))
    res = detect_phases(series, technique=args.technique, handedness=args.handedness)
    print(res.to_json())
    if args.clip and args.overlay:
        render_phase_overlay(args.clip, series, res, args.overlay)
        print(f"overlay -> {args.overlay}")


if __name__ == "__main__":
    _main()
