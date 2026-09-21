"""
layer4_judge.py — Layer 4: Measurement & Judging.

Sits on top of Layer 3's resolved checkpoints. It adds NO new detection — it only
evaluates quantities that Layers 1–3 already produced (scalars, time series, phase/event
frame indices) via nine check types, and, ONLY where the catalogue permits, judges them.

THE ONE RULE (handover §6.5, owner's absolute ruling), enforced ONCE, centrally, in
`judge_checkpoint` — never inside a check type:
  * Thresholds Status = Draft         → compute + report the measured value; verdict is
                                         `measured_only`. NEVER pass/fail. (every row today:
                                         1,655 Draft / 10 Not Applicable)
  * Thresholds Status = Calibrated    → may declare pass/fail. (no row holds this yet — 0 Calibrated)
  * Thresholds Status = Not Applicable → Layer 4 does not run for this checkpoint (returns None).
There is exactly one branch that can emit pass/fail (the Calibrated branch of the gate); a
check type's `judge` callable is NEVER invoked from the Draft path, so no Draft row can
produce a fault by construction.

verdict ∈ { "not_assessable" (a required input was missing — propagate, per Layer 3),
            "measured_only" (Draft), "pass" | "fail" (Calibrated only) }.

COORDINATE / FRAME DISCIPLINE (handover §6.8 + the two lessons already learned): these
evaluators take quantities that are ALREADY extracted in the correct frame and scale — the
caller (the per-row measurement extractor) is responsible for using WORLD landmarks within a
single tracked object, IMAGE landmarks between two independently-tracked objects (pose vs.
hand — the inter-hand bug), never the Z axis, and scaling in shoulder widths / torso lengths.
Layer 4 never sees raw landmarks, so it cannot reintroduce those bugs; it also must not
paper over them by guessing a unit.

SCHEMA NOTE: `Check Type` and `Threshold Parameters` (handover §1) now EXIST as columns on
the Supabase `checkpoints_v2` table (migration-v22) — the earlier "held for Airtable sign-off"
note is resolved. Both are still empty on every row (calibration is 0% authored), so Layer 4
continues to take `check_type` and `params` as explicit inputs; once populated,
`checkpoints_v2_source` carries them and Layer 3 passes them through unchanged.
"""

from __future__ import annotations

import math
from dataclasses import dataclass
from typing import Callable

# ── verdicts ──────────────────────────────────────────────────────────────────
NOT_ASSESSABLE = "not_assessable"
MEASURED_ONLY = "measured_only"
PASS = "pass"
FAIL = "fail"

DRAFT = "Draft"
CALIBRATED = "Calibrated"
NOT_APPLICABLE = "Not Applicable"


class CalibrationError(Exception):
    """Raised loudly when a Calibrated row lacks the Threshold Parameters its check needs —
    the same fail-loud discipline as an empty-landmarks Calibrated row in the validator."""


# ── check-type spec ───────────────────────────────────────────────────────────
@dataclass
class CheckSpec:
    # compute(inputs, params) -> (measured: dict, missing_inputs: list[str]).
    # MUST NOT decide pass/fail and MUST NOT depend on `params` for anything but purely
    # observational extras (e.g. Range's margin) — the verdict lives only in `judge`.
    compute: Callable
    # judge(measured, params) -> bool (True = pass). Invoked ONLY on the Calibrated path.
    judge: Callable
    # param keys that must be present (and non-empty) for a Calibrated row.
    required_params: tuple


def _num(x):
    return isinstance(x, (int, float)) and not (isinstance(x, float) and math.isnan(x))


# ── 2.1 Range ─────────────────────────────────────────────────────────────────
def _range_compute(inp, params):
    v = inp.get("value")
    if not _num(v):
        return {"value": None, "unit": inp.get("unit"), "margin_from_nearest_bound": None}, ["value"]
    margin = None
    if params and _num(params.get("min")) and _num(params.get("max")):
        margin = round(min(v - params["min"], params["max"] - v), 6)  # +inside, -outside
    return {"value": v, "unit": inp.get("unit"), "margin_from_nearest_bound": margin}, []


def _range_judge(measured, params):
    return params["min"] <= measured["value"] <= params["max"]


# ── 2.2 Trend ─────────────────────────────────────────────────────────────────
def _slope_sign(series):
    n = len(series)
    xs = list(range(n)); mx = (n - 1) / 2; my = sum(series) / n
    num = sum((xs[i] - mx) * (series[i] - my) for i in range(n))
    if abs(num) < 1e-12:
        return 0
    return 1 if num > 0 else -1


def _trend_compute(inp, params):
    s = inp.get("series")
    if not s or len(s) < 2 or any(not _num(x) for x in s):
        return {"direction": None, "smoothness_fraction": None}, ["series"]
    sign = _slope_sign(s)
    direction = {1: "increasing", -1: "decreasing", 0: "flat"}[sign]
    steps = [s[i + 1] - s[i] for i in range(len(s) - 1)]
    consistent = sum(1 for d in steps if (d > 0 and sign > 0) or (d < 0 and sign < 0) or (d == 0 and sign == 0))
    return {"direction": direction, "smoothness_fraction": round(consistent / len(steps), 4)}, []


def _trend_judge(measured, params):
    return (measured["direction"] == params["expected_direction"]
            and measured["smoothness_fraction"] >= params["smoothness_floor"])


# ── 2.3 Synchronisation ───────────────────────────────────────────────────────
def _sync_compute(inp, params):
    a, b = inp.get("frame_a"), inp.get("frame_b")
    missing = [k for k, v in (("frame_a", a), ("frame_b", b)) if v is None]
    if missing:
        return {"offset_frames": None}, missing
    return {"offset_frames": b - a}, []


def _sync_judge(measured, params):
    return abs(measured["offset_frames"]) <= params["max_offset_frames"]


# ── 2.4 Stillness ─────────────────────────────────────────────────────────────
def _disp(a, b):
    if isinstance(a, (list, tuple)):
        return math.sqrt(sum((a[i] - b[i]) ** 2 for i in range(len(a))))
    return abs(a - b)


def _stillness_compute(inp, params):
    s = inp.get("series")
    if not s or len(s) < 2:
        return {"window_duration_frames": (len(s) if s else 0), "max_displacement": None}, ["series"]
    md = max(_disp(s[i + 1], s[i]) for i in range(len(s) - 1))
    return {"window_duration_frames": len(s), "max_displacement": round(md, 6)}, []


def _stillness_judge(measured, params):
    return measured["max_displacement"] <= params["max_displacement"]


# ── 2.5 Cross-phase comparison ────────────────────────────────────────────────
def _cross_compute(inp, params):
    v1, v2 = inp.get("value_phase1"), inp.get("value_phase2")
    missing = [k for k, v in (("value_phase1", v1), ("value_phase2", v2)) if not _num(v)]
    if missing:
        return {"value_phase1": v1, "value_phase2": v2, "drift": None}, missing
    return {"value_phase1": v1, "value_phase2": v2, "drift": round(v2 - v1, 6)}, []


def _cross_judge(measured, params):
    return abs(measured["drift"]) <= params["max_drift"]


# ── 2.6 Convergence ───────────────────────────────────────────────────────────
def _median(xs):
    s = sorted(xs); n = len(s)
    return s[n // 2] if n % 2 else (s[n // 2 - 1] + s[n // 2]) / 2


def _conv_compute(inp, params):
    values = inp.get("values") or {}
    missing = [k for k, v in values.items() if not _num(v)]
    if missing or len(values) < 2:
        return {"values": values, "spread": None, "outlier_signal": None}, (missing or ["values"])
    vals = list(values.values())
    med = _median(vals)
    outlier = max(values, key=lambda k: abs(values[k] - med))
    return {"values": values, "spread": round(max(vals) - min(vals), 6), "outlier_signal": outlier}, []


def _conv_judge(measured, params):
    return measured["spread"] <= params["max_spread"]


# ── 2.7 Correlation over a window ─────────────────────────────────────────────
def _pearson(a, b):
    n = len(a); ma = sum(a) / n; mb = sum(b) / n
    da = [x - ma for x in a]; db = [x - mb for x in b]
    denom = math.sqrt(sum(x * x for x in da) * sum(x * x for x in db))
    if denom < 1e-12:
        return 0.0
    return sum(da[i] * db[i] for i in range(n)) / denom


def _corr_compute(inp, params):
    a, b = inp.get("series_a"), inp.get("series_b")
    if not a or not b or len(a) < 3 or len(b) < 3:
        return {"correlation_coefficient": None, "best_lag_frames": None}, ["series_a" if not a else "series_b"]
    max_lag = int((params or {}).get("max_lag_frames", 10))
    best = (None, -2.0)  # (lag, corr)
    for lag in range(-max_lag, max_lag + 1):
        if lag >= 0:
            xa, xb = a[: len(a) - lag], b[lag:]
        else:
            xa, xb = a[-lag:], b[: len(b) + lag]
        m = min(len(xa), len(xb))
        if m < 3:
            continue
        c = _pearson(xa[:m], xb[:m])
        # prefer higher correlation; on a tie prefer the smaller |lag| (no spurious lag when
        # every shift correlates equally — e.g. a monotonic ramp).
        if c > best[1] + 1e-9 or (abs(c - best[1]) <= 1e-9 and (best[0] is None or abs(lag) < abs(best[0]))):
            best = (lag, c)
    return {"correlation_coefficient": round(best[1], 4), "best_lag_frames": best[0]}, []


def _corr_judge(measured, params):
    lo, hi = params.get("expected_lag_range", [-999, 999])
    return (measured["correlation_coefficient"] >= params["min_correlation"]
            and lo <= measured["best_lag_frames"] <= hi)


# ── 2.8 Ordering within a frame window ────────────────────────────────────────
def _order_compute(inp, params):
    a, b = inp.get("frame_a"), inp.get("frame_b")
    missing = [k for k, v in (("frame_a", a), ("frame_b", b)) if v is None]
    if missing:
        return {"first_event": None, "gap_frames": None}, missing
    first = "A" if a <= b else "B"
    return {"first_event": first, "gap_frames": abs(a - b)}, []


def _order_judge(measured, params):
    return measured["first_event"] == params["expected_first"]


# ── 2.9 Strict event ordering ─────────────────────────────────────────────────
def _strict_compute(inp, params):
    a, b = inp.get("frame_a"), inp.get("frame_b")
    missing = [k for k, v in (("frame_a", a), ("frame_b", b)) if v is None]
    if missing:
        return {"gap_frames": None}, missing
    return {"gap_frames": b - a}, []   # signed: B must lead by >= min_gap


def _strict_judge(measured, params):
    return measured["gap_frames"] >= params["min_gap_frames"]


REGISTRY = {
    "range": CheckSpec(_range_compute, _range_judge, ("min", "max")),
    "trend": CheckSpec(_trend_compute, _trend_judge, ("expected_direction", "smoothness_floor")),
    "synchronisation": CheckSpec(_sync_compute, _sync_judge, ("max_offset_frames",)),
    "stillness": CheckSpec(_stillness_compute, _stillness_judge, ("max_displacement",)),
    "cross_phase": CheckSpec(_cross_compute, _cross_judge, ("max_drift",)),
    "convergence": CheckSpec(_conv_compute, _conv_judge, ("max_spread",)),
    "correlation": CheckSpec(_corr_compute, _corr_judge, ("min_correlation", "expected_lag_range")),
    "ordering_window": CheckSpec(_order_compute, _order_judge, ("expected_first",)),
    "strict_ordering": CheckSpec(_strict_compute, _strict_judge, ("min_gap_frames",)),
}
CHECK_TYPES = tuple(REGISTRY)


# ── the central gate — the ONLY place a pass/fail can be produced ─────────────
def judge_checkpoint(check_type: str,
                     thresholds_status: str,
                     checkpoint_id: str,
                     inputs: dict,
                     params: dict | None = None) -> dict | None:
    """Evaluate one checkpoint. Returns the §3 envelope, or None when Not Applicable.
    The Draft/Calibrated ruling is enforced HERE and nowhere else."""
    if thresholds_status == NOT_APPLICABLE:
        return None
    if thresholds_status not in (DRAFT, CALIBRATED):
        raise ValueError(f"unknown thresholds_status {thresholds_status!r}")
    if check_type not in REGISTRY:
        raise ValueError(f"unknown check_type {check_type!r} (expected one of {CHECK_TYPES})")

    spec = REGISTRY[check_type]
    measured, missing = spec.compute(inputs, params)

    if missing:
        verdict = NOT_ASSESSABLE
    elif thresholds_status == DRAFT:
        verdict = MEASURED_ONLY                      # never pass/fail — judge() not called
    else:                                            # CALIBRATED
        _require_params(check_type, spec, params)
        verdict = PASS if spec.judge(measured, params) else FAIL

    env = {
        "checkpoint_id": checkpoint_id,
        "check_type": check_type,
        "thresholds_status": thresholds_status,
        "verdict": verdict,
        "measured": measured,
    }
    if missing:
        env["missing_inputs"] = missing
    return env


def _require_params(check_type, spec, params):
    if not params:
        raise CalibrationError(f"{check_type}: Calibrated row but Threshold Parameters is empty")
    absent = [k for k in spec.required_params if params.get(k) is None]
    if absent:
        raise CalibrationError(f"{check_type}: Calibrated row missing Threshold Parameters {absent}")


# ── deterministic parser for the `Threshold Parameters` text field (§1) ───────
def parse_threshold_parameters(text: str | None) -> dict:
    """Parse the `key: value` lines of the Threshold Parameters field into a dict, coercing
    numbers and simple `[a, b]` lists. Deterministic — no prose guessing. Empty text → {}.
    (An empty field is EXPECTED on a Draft row; a Calibrated row with an empty field is an
    error the caller/validator must flag loudly — see _require_params.)"""
    out: dict = {}
    for line in (text or "").splitlines():
        line = line.strip()
        if not line or ":" not in line:
            continue
        key, _, raw = line.partition(":")
        out[key.strip()] = _coerce(raw.strip())
    return out


def _coerce(raw: str):
    if raw.startswith("[") and raw.endswith("]"):
        return [_coerce(p.strip()) for p in raw[1:-1].split(",") if p.strip()]
    try:
        return int(raw)
    except ValueError:
        pass
    try:
        return float(raw)
    except ValueError:
        return raw
