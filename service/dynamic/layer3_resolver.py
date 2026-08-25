"""
layer3_resolver.py — Layer 3 of the Dynamic Movement Analysis pipeline.

A RESOLVER, not an analyser. Given a situation (position / variation / technique, plus
optional context: available camera views, Layer 2 phases, handedness) it returns the
ORDERED CHECKLIST a coach would watch on that rep — each checkpoint with its landmarks
(derived tokens resolved), camera angle, measurability tier, standard, fault trigger,
measurable signal, threshold status, and any coaching cue the catalogue already carries.

It answers "what would a coach watch on this rep, and what can the camera actually see."
It **does not measure anything and does not judge anything** — no values, no verdicts, no
scores, no pass/fail. That is Layer 4, gated on calibration. Every numeric value in the
catalogue's `measurable_signal` is a RECOMMENDATION, not a rule, until a row's
`thresholds_status` is `Calibrated` (no row is, yet).

This is the first component that READS `service/rulesets/qb_ruleset.json`. It resolves the
derived (non-MediaPipe) landmark tokens via `landmark_derivations.py`, and **fails loudly**
on any token outside the controlled vocabulary — no silent skipping.
"""

from __future__ import annotations

import json
import os
import sys
from dataclasses import dataclass, field, asdict

# landmark_derivations lives in service/rulesets — make it importable regardless of cwd.
_RULESETS = os.path.normpath(os.path.join(os.path.dirname(__file__), "..", "rulesets"))
if _RULESETS not in sys.path:
    sys.path.insert(0, _RULESETS)
import landmark_derivations as ld  # noqa: E402

# Per-position catalogue files. Each export self-declares its record_count in meta, so we
# validate against that rather than a hardcoded constant (counts differ per position and
# change over time as coaching content is authored).
CATALOGUE_FILES = {
    "QB": os.path.join(_RULESETS, "qb_ruleset.json"),
    "WR": os.path.join(_RULESETS, "wr_ruleset.json"),
}

# Layer 2 phase order — used to order the checklist in rep sequence.
PHASE_ORDER = ["Pre-snap / stance", "Snap / movement start", "Drop / movement",
               "Plant", "Load", "Release", "Follow-through"]

TIER_GUIDANCE = {
    "judge": "measurable; judgeable ONLY once this row is Calibrated — currently its "
             "thresholds are Draft, so report the observed value, never declare a fault",
    "proxy_only": "proxy / partial signal only — never state full confidence",
    "skip": "not visible in a solo clip — must never be judged or fabricated",
}


class UnknownLandmarkError(ValueError):
    pass


# ── result types ────────────────────────────────────────────────────────────────
@dataclass
class ResolvedCheckpoint:
    name: str
    variation: str
    technique: str
    measurement: str
    tier: str                        # judge | proxy_only | skip
    tier_guidance: str
    camera_angle: str                # Side | Front | Both
    static_or_dynamic: str
    thresholds_status: str           # Draft | Calibrated | Not Applicable
    standard: str
    fault_trigger: str
    measurable_signal: str           # recommendations, NOT rules — never a verdict
    coaching_cue: str | None
    landmarks: list[str]
    landmarks_resolved: list[dict]   # each token → how it resolves
    anchor_phase: str
    phase: str | None = None         # catalogue-declared phase (WR); None when not phase-structured
    phase_order: float | None = None # its position in the required sequence — the order is coached
    assessable: bool = True
    not_assessable_reasons: list[str] = field(default_factory=list)
    phase_confidence: float | None = None
    conditional_notes: list[str] = field(default_factory=list)


@dataclass
class ResolverResult:
    query: dict
    summary: dict
    checkpoints: list[ResolvedCheckpoint]

    def to_json(self) -> str:
        return json.dumps({"query": self.query, "summary": self.summary,
                           "checkpoints": [asdict(c) for c in self.checkpoints]},
                          ensure_ascii=False, indent=2)


# ── catalogue loading + validation ───────────────────────────────────────────────
def load_catalogue(position: str = "QB") -> list[dict]:
    path = CATALOGUE_FILES.get(position)
    if path is None:
        raise ValueError(f"no catalogue for position '{position}' (have: {sorted(CATALOGUE_FILES)})")
    with open(path, encoding="utf-8") as f:
        data = json.load(f)
    recs = data["records"]
    declared = data.get("meta", {}).get("record_count", len(recs))
    if len(recs) != declared:
        raise ValueError(f"{position} catalogue count {len(recs)} != declared {declared}")
    for r in recs:
        if not r.get("measurable_by_pose"):
            raise ValueError(f"null Measurable-by-Pose on {r.get('name')}")
        if not r.get("thresholds_status"):
            raise ValueError(f"null Thresholds Status on {r.get('name')}")
        for tok in r.get("pose_landmarks", []):
            if tok not in ld.CONTROLLED_VOCAB:
                raise UnknownLandmarkError(f"token '{tok}' on {r.get('name')} not in vocab")
    return recs


# ── landmark resolution ───────────────────────────────────────────────────────────
def _resolve_token(tok: str, hand: str | None) -> dict:
    """Resolve one landmark token. Fails loudly if outside the controlled vocabulary."""
    if tok not in ld.CONTROLLED_VOCAB:
        raise UnknownLandmarkError(f"landmark token '{tok}' outside controlled vocabulary")
    kind = ld.classify(tok)
    if kind == "mediapipe":
        return {"token": tok, "kind": "mediapipe", "resolves_to": [tok],
                "index": ld.MEDIAPIPE_INDEX[tok]}
    d = ld.DERIVATIONS[tok]
    out = {"token": tok, "kind": d["kind"], "resolves_to": list(d["from"]), "rule": d["rule"]}
    if d.get("ambiguous"):
        out["ambiguous"] = True
    if d["kind"] == "handedness":
        # unsided Elbow / Wrist → the THROWING side
        if hand in ("left", "right"):
            side = "Right" if hand == "right" else "Left"
            out["resolves_to"] = [f"{side} {tok}"]
            out["handedness_resolved"] = f"{hand} (throwing arm)"
        else:
            out["handedness_resolved"] = None
            out["note"] = "throwing arm — unresolved until handedness is known"
    if d["kind"] == "external":
        out["note"] = "not pose-derivable (needs ball tracking)"
    return out


# ── camera-view coverage ──────────────────────────────────────────────────────────
def _view_ok(camera_angle: str, views: set[str] | None) -> tuple[bool, str | None]:
    if views is None:
        return True, "camera views not specified — assumed available"
    ca = camera_angle.lower()
    if ca == "both":
        return (len(views) > 0), (None if views else "no camera view supplied")
    if ca in views:
        return True, None
    return False, f"requires the {camera_angle} view; available: {sorted(views) or 'none'}"


# ── phase anchoring (heuristic; documents where each checkpoint sits in the rep) ──
def anchor_phase(variation: str, technique: str, measurement: str) -> str:
    t, m = technique.lower(), measurement.lower()
    if t == "stance":
        return "Pre-snap / stance"
    if "follow through" in m or "landing" in m:
        return "Follow-through"
    if variation == "Throwing":
        if any(k in m for k in ("loading", "takeoff", "airborne", "ground force",
                                "weight transfer", "separation", "core rotation", "torso angle")):
            return "Load"
        return "Release"
    if "snap" in m:
        return "Snap / movement start"
    if "plant" in m:
        return "Plant"
    if "throwing platform" in m or "base width" in m or "post-fake reset" in m or "reset" in m:
        return "Plant"
    return "Drop / movement"


# ── conditional-note pattern ─────────────────────────────────────────────────────
def _conditional_notes(technique: str, measurement: str, hand_source: str) -> list[str]:
    t, m = technique.lower(), measurement.lower()
    notes: list[str] = []
    if t == "stance" and "foot alignment" in m and hand_source == "none":
        notes.append(
            "Foot stagger depends on handedness, which isn't known for this rep. The "
            "non-throwing-side foot sits slightly back — if the QB is right-handed the LEFT "
            "foot is back, if left-handed the RIGHT foot is back, so the throwing foot can "
            "load and push off without a false step. Report the observed stagger and let the "
            "player confirm it against their throwing hand; do not assert correct/incorrect.")
    if t == "hand off" and "footwork" in m:
        notes.append(
            "Open angle / track is reported, not judged: the aiming point depends on the "
            "called run concept (dive, trap, power…), which isn't captured. Report the measured "
            "angle and track shape; do not score it against a fixed clock position.")
    return notes


# ── handedness precedence ─────────────────────────────────────────────────────────
def _resolve_handedness(supplied: str | None, phases: dict | None) -> tuple[str | None, str, bool]:
    inferred = (phases or {}).get("handedness")
    disagree = bool(supplied and inferred and supplied != inferred)
    if supplied:
        return supplied, "supplied (stored player attribute)", disagree
    if inferred:
        return inferred, "inferred (Layer 2, from the throwing arm at release)", disagree
    return None, "none", disagree


# ── the resolver ──────────────────────────────────────────────────────────────────
def resolve(position: str,
            variation: str | None = None,
            technique: str | None = None,
            available_views: list[str] | set[str] | None = None,
            phases: dict | None = None,
            handedness: str | None = None,
            catalogue: list[dict] | None = None) -> ResolverResult:
    recs = catalogue if catalogue is not None else load_catalogue(position)
    views = {v.lower() for v in available_views} if available_views is not None else None
    hand, hand_source, hand_disagree = _resolve_handedness(handedness, phases)

    # phase context from Layer 2 (present names→confidence, absent names→reason)
    present = {p["name"]: p for p in (phases or {}).get("present", [])}
    absent = {a["name"]: a["reason"] for a in (phases or {}).get("absent", [])}

    def match(r):
        if r.get("position") != position:
            return False
        if variation is not None and r.get("variation") != variation:
            return False
        if technique is not None and r.get("technique") != technique:
            return False
        return True

    rows = [r for r in recs if match(r)]
    checkpoints: list[ResolvedCheckpoint] = []
    for r in rows:
        measurement = (r["name"].split(" - ")[-1]).strip()
        tier = "judge" if r["judge"] else "proxy_only" if r["proxy_only"] else "skip"
        resolved = [_resolve_token(t, hand) for t in r.get("pose_landmarks", [])]
        # A catalogue-declared phase (WR's Phase field) is authoritative — the order is
        # coached and lives in the catalogue. Fall back to the QB anchor heuristic otherwise.
        cat_phase = r.get("phase") or None
        cat_order = r.get("phase_order")
        ap = cat_phase or anchor_phase(r["variation"], r["technique"], measurement)

        reasons: list[str] = []
        # camera view coverage
        view_ok, view_note = _view_ok(r["camera_angle"], views)
        if not view_ok:
            reasons.append(view_note)
        # phase coverage (only when Layer 2 context supplied)
        phase_conf = None
        if phases is not None:
            if ap in present:
                phase_conf = present[ap].get("confidence")
                basis = (present[ap].get("basis") or "")
                if "MARGINAL" in basis or (phase_conf is not None and phase_conf < 0.5):
                    reasons.append(f"phase '{ap}' present but LOW-CONFIDENCE "
                                   f"(conf {phase_conf}) — any timing here is uncertain, not firm")
            elif ap in absent:
                reasons.append(f"phase '{ap}' not detected in this clip: {absent[ap]}")
            else:
                reasons.append(f"phase '{ap}' not present in the Layer 2 segmentation")
        # unsided throwing-arm token but no handedness
        if hand is None and any(rr["kind"] == "handedness" for rr in resolved):
            reasons.append("throwing-arm landmark (unsided Elbow/Wrist) unresolved — "
                           "handedness unknown")

        # 'assessable' = the app could attempt this checkpoint. A LOW-CONFIDENCE phase note
        # does NOT flip it to unassessable — it stays assessable-but-flagged.
        hard_block = [x for x in reasons if not x.startswith("phase '") or "not detected" in x
                      or "not present" in x]
        assessable = len(hard_block) == 0

        checkpoints.append(ResolvedCheckpoint(
            name=r["name"], variation=r["variation"], technique=r["technique"],
            measurement=measurement, tier=tier, tier_guidance=TIER_GUIDANCE[tier],
            camera_angle=r["camera_angle"], static_or_dynamic=r.get("static_or_dynamic") or "",
            thresholds_status=r["thresholds_status"], standard=r.get("ideal_execution_standard") or "",
            fault_trigger=r.get("fault_trigger") or "", measurable_signal=r.get("measurable_signal") or "",
            coaching_cue=(r.get("coaching_cue") or None),
            landmarks=list(r.get("pose_landmarks", [])), landmarks_resolved=resolved,
            anchor_phase=ap, phase=cat_phase, phase_order=cat_order,
            assessable=assessable, not_assessable_reasons=reasons, phase_confidence=phase_conf,
            conditional_notes=_conditional_notes(r["technique"], measurement, hand_source)))

    # order the checklist in rep sequence: a catalogue-declared phase_order (WR) wins;
    # otherwise fall back to the QB anchor-phase order. Then by name.
    def _order_key(c):
        if c.phase_order is not None:
            return (0, c.phase_order, c.name)
        idx = PHASE_ORDER.index(c.anchor_phase) if c.anchor_phase in PHASE_ORDER else 99
        return (0, idx, c.name)
    checkpoints.sort(key=_order_key)

    by_tier = {t: sum(1 for c in checkpoints if c.tier == t) for t in ("judge", "proxy_only", "skip")}
    na = [c for c in checkpoints if not c.assessable]
    summary = {
        "total": len(checkpoints),
        "by_tier": by_tier,
        "assessable": sum(1 for c in checkpoints if c.assessable),
        "not_assessable": len(na),
        "not_assessable_reasons": {
            "view": sum(1 for c in na if any("view" in x for x in c.not_assessable_reasons)),
            "phase_absent": sum(1 for c in na if any("not detected" in x or "not present" in x
                                                     for x in c.not_assessable_reasons)),
            "handedness": sum(1 for c in na if any("handedness" in x for x in c.not_assessable_reasons)),
        },
        "handedness": {"value": hand, "source": hand_source, "disagreement": hand_disagree},
        "contains_verdicts": False,  # invariant: Layer 3 never emits a verdict/score/grade
    }
    query = {"position": position, "variation": variation, "technique": technique,
             "available_views": sorted(views) if views is not None else None,
             "phases_provided": phases is not None}
    return ResolverResult(query=query, summary=summary, checkpoints=checkpoints)


def _main(argv=None):
    import argparse
    ap = argparse.ArgumentParser(description="Layer 3 — applicable-checks resolver over the catalogue.")
    ap.add_argument("position")
    ap.add_argument("--variation"); ap.add_argument("--technique")
    ap.add_argument("--views", help="comma-separated: side,front")
    ap.add_argument("--handedness", choices=["left", "right"])
    ap.add_argument("--phases", help="a Layer 2 PhaseResult JSON to scope by")
    args = ap.parse_args(argv)
    phases = json.load(open(args.phases, encoding="utf-8")) if args.phases else None
    views = args.views.split(",") if args.views else None
    res = resolve(args.position, args.variation, args.technique, views, phases, args.handedness)
    print(res.to_json())


if __name__ == "__main__":
    _main()
