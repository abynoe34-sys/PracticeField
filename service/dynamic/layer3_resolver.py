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

SOURCE OF TRUTH (2026-09-07): QB is read from the Supabase `checkpoints_v2` table via
`checkpoints_v2_source` (cleaning + normalisation). WR is still read from the legacy
`service/rulesets/wr_ruleset.json` because its pose annotation has not been authored into
checkpoints_v2 yet (Step 4 (d), a DATA prerequisite). Each position has exactly one source.
It resolves derived (non-MediaPipe) landmark tokens via `landmark_derivations.py`, and
**fails loudly** on any token outside the controlled vocabulary — no silent skipping.

ROW-LEVEL EXCLUSION GUARD (2026-09-08, Option B): individual unannotated rows (NULL
measurable_by_pose) are excluded from the resolved checklist, rather than gating the whole
technique. A partially-annotated technique resolves its annotated rows and reports the
excluded count — never hiding ready content behind a few content-gap rows, but never
silently returning a partial checklist as if complete. The summary carries
`not_migrated_techniques` (techniques where EVERY matched row is unannotated → 0 resolve,
e.g. QB Ball Carry 0/5), `partial_exclusions` (resolved some, excluded some — e.g. QB
Exchange 36 resolved / 10 excluded), and `excluded_unannotated_total`.
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
import checkpoints_v2_source as cv2  # noqa: E402

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
    requires_hands: bool = False     # any landmark needs the Hand landmarker (2nd detector)
    formation: str | None = None     # checkpoints_v2 formation (All formations / Gun / Pistol / …)
    row_id: int | None = None        # checkpoints_v2 row id — stable ordering key when unphased


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


# ── source selection: checkpoints_v2 vs legacy JSON ──────────────────────────────
# QB (2026-09-07), WR (2026-09-08) and TE (2026-09-08) are served from the new source of
# truth (checkpoints_v2) — all fully pose-annotated (QB 327/342 ready techniques; WR 291/291;
# TE 308/308, zero NULL measurable_by_pose). DB/RB — and OL once annotated — have ZERO pose
# annotation in checkpoints_v2, so they still fall through to the legacy JSON until authored
# (a DATA prerequisite). Each position has exactly ONE source — no per-technique mixing.
# NOTE: wiring a position here means the resolver no longer reads its wr_/*_ruleset.json, but
# the JSON files remain in place — retiring them (Step 6) is a separate, still-held decision.
V2_POSITIONS = {"QB", "WR", "TE"}


def _load_records(position: str, prefer_snapshot: bool = False) -> tuple[list[dict], str]:
    """Return (records, source_tag). checkpoints_v2 records already carry the keys the
    checkpoint builder reads (normalize_row); legacy JSON records are augmented with the
    v2-only keys (formation/label/annotated/id) so one builder serves both."""
    if position in V2_POSITIONS:
        return cv2.load_normalized(position, prefer_snapshot=prefer_snapshot), "checkpoints_v2"
    recs = load_catalogue(position)
    for r in recs:
        r.setdefault("formation", None)
        r.setdefault("label", (r.get("name", "").split(" - ")[-1]).strip())
        r.setdefault("annotated", True)
        r.setdefault("id", None)
    return recs, "legacy_json"


def _formation_ok(rec_formation: str | None, requested: str | None) -> bool:
    """Formation matching. 'All formations' rows apply to any requested formation. Records
    with no formation (legacy JSON) are never filtered out by a formation request."""
    if requested is None or rec_formation is None:
        return True
    return rec_formation == requested or rec_formation == "All formations"


# ── landmark resolution ───────────────────────────────────────────────────────────
def _resolve_token(tok: str, hand: str | None) -> dict:
    """Resolve one landmark token. Fails loudly if outside the controlled vocabulary."""
    if tok not in ld.CONTROLLED_VOCAB:
        raise UnknownLandmarkError(f"landmark token '{tok}' outside controlled vocabulary")
    kind = ld.classify(tok)
    if kind == "mediapipe":
        return {"token": tok, "kind": "mediapipe", "resolves_to": [tok],
                "index": ld.MEDIAPIPE_INDEX[tok]}
    if kind == "hands":
        side, idx = ld.HANDS_INDEX[tok]
        out = {"token": tok, "kind": "hands", "source": "hand_landmarker",
               "hand_index": idx, "requires_hands": True}
        if tok in ld.REPOINTED_FROM_POSE:
            out["note"] = "repointed from the low-fidelity pose point to the Hand landmarker"
        return out
    if kind == "hands_geometric":
        d = ld.HANDS_DERIVED[tok]
        return {"token": tok, "kind": "hands_geometric", "source": "hand_landmarker",
                "resolves_to": list(d["from"]), "rule": d["rule"], "requires_hands": True}
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
    # `measurement` is the synthesized label (phase, or IES leading clause) under the
    # checkpoints_v2 taxonomy. Keys updated from old vocab (technique "hand off" is now
    # "Exchange"; there is no "foot alignment" checkpoint label — key on stagger/foot text).
    t, m = technique.lower(), measurement.lower()
    notes: list[str] = []
    if t == "stance" and hand_source == "none" and any(
            k in m for k in ("foot", "stagger", "non-throwing", "staggered")):
        notes.append(
            "Foot stagger depends on handedness, which isn't known for this rep. The "
            "non-throwing-side foot sits slightly back — if the QB is right-handed the LEFT "
            "foot is back, if left-handed the RIGHT foot is back, so the throwing foot can "
            "load and push off without a false step. Report the observed stagger and let the "
            "player confirm it against their throwing hand; do not assert correct/incorrect.")
    if t == "exchange" and any(k in m for k in ("footwork", "track", "open", "path", "aiming")):
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
            hands_available: bool | None = None,
            formation: str | None = None,
            catalogue: list[dict] | None = None,
            source: str | None = None,
            prefer_snapshot: bool = False) -> ResolverResult:
    if catalogue is not None:
        recs, source = catalogue, (source or "checkpoints_v2")
    else:
        recs, source = _load_records(position, prefer_snapshot=prefer_snapshot)
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
        if not _formation_ok(r.get("formation"), formation):
            return False
        return True

    matched = [r for r in recs if match(r)]

    # ROW-LEVEL exclusion guard (2026-09-08, Option B): exclude individual rows that are not yet
    # pose-annotated (NULL measurable_by_pose -> normalize_row sets annotated=False), rather than
    # gating the whole technique. This resolves the annotated rows of a partially-annotated
    # technique instead of hiding them behind a few content-gap rows — but stays HONEST about
    # what's missing: every excluded row is counted and reported per technique in the summary, so
    # an incomplete checklist can never look complete. Legacy JSON rows are annotated=True by
    # construction, so this is a no-op for them (and for any fully-annotated v2 technique).
    rows: list[dict] = []
    tech_stats: dict[str, dict] = {}  # technique -> {resolved, excluded}
    for r in matched:
        st = tech_stats.setdefault(r.get("technique"), {"resolved": 0, "excluded": 0})
        if r.get("annotated", True):
            rows.append(r); st["resolved"] += 1
        else:
            st["excluded"] += 1
    # Techniques with ZERO resolvable rows (every matched row unannotated) -> still "not migrated".
    not_migrated = [{"technique": t, "resolved": 0, "excluded_unannotated": s["excluded"],
                     "total": s["resolved"] + s["excluded"]}
                    for t, s in tech_stats.items() if s["resolved"] == 0 and s["excluded"] > 0]
    # Techniques that DO resolve but dropped some unannotated rows -> partial, reported explicitly.
    partial_exclusions = [{"technique": t, "resolved": s["resolved"],
                           "excluded_unannotated": s["excluded"], "total": s["resolved"] + s["excluded"]}
                          for t, s in tech_stats.items() if s["resolved"] > 0 and s["excluded"] > 0]

    checkpoints: list[ResolvedCheckpoint] = []
    for r in rows:
        # checkpoints_v2 has no checkpoint-title field — use the synthesized label (phase, else
        # IES leading clause). Legacy JSON records were given a `label` in _load_records too.
        measurement = (r.get("label") or (r.get("name", "").split(" - ")[-1])).strip()
        tier = "judge" if r["judge"] else "proxy_only" if r["proxy_only"] else "skip"
        resolved = [_resolve_token(t, hand) for t in r.get("pose_landmarks", [])]
        # A real catalogue phase is authoritative for ordering + Layer-2 scoping. The QB anchor
        # heuristic is retained ONLY as an ordering fallback (its buckets are NOT used to gate).
        cat_phase = r.get("phase") or None
        cat_order = r.get("phase_order")
        ap = cat_phase or anchor_phase(r.get("variation") or "", r.get("technique") or "", measurement)

        reasons: list[str] = []
        # camera view coverage
        view_ok, view_note = _view_ok(r.get("camera_angle") or "Both", views)
        if not view_ok:
            reasons.append(view_note)
        # Layer-2 phase coverage — gate ONLY on a REAL catalogue phase (cat_phase), never on the
        # anchor heuristic, so an unphased QB technique (Drop-Back/Stance/Throwing) is never
        # falsely gated. NOTE: checkpoints_v2's phase vocabulary ("The Five-Point Lock", …) does
        # not yet map to Layer 2's segmentation names, so in practice this gates nothing for QB
        # today — a documented follow-up (see summary.phase_scoping).
        phase_conf = None
        if phases is not None and cat_phase is not None:
            if cat_phase in present:
                phase_conf = present[cat_phase].get("confidence")
                basis = (present[cat_phase].get("basis") or "")
                if "MARGINAL" in basis or (phase_conf is not None and phase_conf < 0.5):
                    reasons.append(f"phase '{cat_phase}' present but LOW-CONFIDENCE "
                                   f"(conf {phase_conf}) — any timing here is uncertain, not firm")
            elif cat_phase in absent:
                reasons.append(f"phase '{cat_phase}' not detected in this clip: {absent[cat_phase]}")
            else:
                reasons.append(f"phase '{cat_phase}' not present in the Layer 2 segmentation")
        # unsided throwing-arm token but no handedness
        if hand is None and any(rr["kind"] == "handedness" for rr in resolved):
            reasons.append("throwing-arm landmark (unsided Elbow/Wrist) unresolved — "
                           "handedness unknown")
        needs_hands_cp = any(rr.get("requires_hands") for rr in resolved)
        if needs_hands_cp and hands_available is False:
            reasons.append("requires the Hand landmarker, which did not run for this clip")

        # 'assessable' = the app could attempt this checkpoint. A LOW-CONFIDENCE phase note
        # does NOT flip it to unassessable — it stays assessable-but-flagged.
        hard_block = [x for x in reasons if not x.startswith("phase '") or "not detected" in x
                      or "not present" in x]
        assessable = len(hard_block) == 0

        checkpoints.append(ResolvedCheckpoint(
            name=r.get("name") or measurement, variation=r.get("variation") or "",
            technique=r.get("technique") or "",
            measurement=measurement, tier=tier, tier_guidance=TIER_GUIDANCE[tier],
            camera_angle=r.get("camera_angle") or "Both",
            static_or_dynamic=r.get("static_or_dynamic") or "",
            thresholds_status=r.get("thresholds_status") or "", standard=r.get("ideal_execution_standard") or "",
            fault_trigger=r.get("fault_trigger") or "", measurable_signal=r.get("measurable_signal") or "",
            coaching_cue=(r.get("coaching_cue") or None),
            landmarks=list(r.get("pose_landmarks", [])), landmarks_resolved=resolved,
            anchor_phase=ap, phase=cat_phase, phase_order=cat_order,
            assessable=assessable, not_assessable_reasons=reasons, phase_confidence=phase_conf,
            conditional_notes=_conditional_notes(r.get("technique") or "", measurement, hand_source),
            requires_hands=needs_hands_cp, formation=r.get("formation"), row_id=r.get("id")))

    # Order in rep sequence: a real phase_order wins; else the row id (stable insertion order —
    # honest about being arbitrary for unphased techniques, per the Step-4 decision); else the
    # legacy anchor-phase bucket; then name.
    def _order_key(c):
        if c.phase_order is not None:
            return (0, c.phase_order, str(c.name))
        if c.row_id is not None:
            return (1, c.row_id, str(c.name))
        idx = PHASE_ORDER.index(c.anchor_phase) if c.anchor_phase in PHASE_ORDER else 99
        return (2, idx, str(c.name))
    checkpoints.sort(key=_order_key)

    by_tier = {t: sum(1 for c in checkpoints if c.tier == t) for t in ("judge", "proxy_only", "skip")}
    na = [c for c in checkpoints if not c.assessable]
    summary = {
        "total": len(checkpoints),
        "source": source,
        "by_tier": by_tier,
        "assessable": sum(1 for c in checkpoints if c.assessable),
        "not_assessable": len(na),
        "not_assessable_reasons": {
            "view": sum(1 for c in na if any("view" in x for x in c.not_assessable_reasons)),
            "phase_absent": sum(1 for c in na if any("not detected" in x or "not present" in x
                                                     for x in c.not_assessable_reasons)),
            "handedness": sum(1 for c in na if any("handedness" in x for x in c.not_assessable_reasons)),
        },
        # Techniques matching the query with ZERO resolvable rows (every matched row unannotated)
        # — surfaced explicitly, never returned as a silently-thin checklist.
        "not_migrated_techniques": sorted(not_migrated, key=lambda x: x["technique"] or ""),
        # Techniques that DO resolve but had some unannotated rows excluded — the honesty signal
        # that a resolved checklist is partial. "N resolved, M not yet annotated", never silent.
        "partial_exclusions": sorted(partial_exclusions, key=lambda x: x["technique"] or ""),
        "excluded_unannotated_total": sum(s["excluded"] for s in tech_stats.values()),
        "handedness": {"value": hand, "source": hand_source, "disagreement": hand_disagree},
        "needs_hands": any(c.requires_hands for c in checkpoints),
        "hands_available": hands_available,
        # Layer-2 phase scoping is currently applied only on a real catalogue phase; the
        # checkpoints_v2 phase vocabulary is not yet mapped to Layer 2 (a documented follow-up).
        "phase_scoping": "catalogue-phase-only (checkpoints_v2 phase↔Layer2 mapping deferred)",
        "contains_verdicts": False,  # invariant: Layer 3 never emits a verdict/score/grade
    }
    query = {"position": position, "variation": variation, "technique": technique,
             "formation": formation,
             "available_views": sorted(views) if views is not None else None,
             "phases_provided": phases is not None, "source": source}
    return ResolverResult(query=query, summary=summary, checkpoints=checkpoints)


def _main(argv=None):
    import argparse
    ap = argparse.ArgumentParser(description="Layer 3 — applicable-checks resolver over the catalogue.")
    ap.add_argument("position")
    ap.add_argument("--variation"); ap.add_argument("--technique")
    ap.add_argument("--formation", help="checkpoints_v2 formation (e.g. Gun / Pistol / Under Center)")
    ap.add_argument("--views", help="comma-separated: side,front")
    ap.add_argument("--handedness", choices=["left", "right"])
    ap.add_argument("--phases", help="a Layer 2 PhaseResult JSON to scope by")
    ap.add_argument("--hands", choices=["available", "unavailable"],
                    help="whether the Hand landmarker ran for this clip (gates hand-dependent checks)")
    ap.add_argument("--snapshot", action="store_true",
                    help="prefer the local checkpoints_v2 snapshot over a live DB read")
    args = ap.parse_args(argv)
    phases = json.load(open(args.phases, encoding="utf-8")) if args.phases else None
    views = args.views.split(",") if args.views else None
    hands_avail = {"available": True, "unavailable": False}.get(args.hands)
    res = resolve(args.position, args.variation, args.technique, views, phases, args.handedness,
                  hands_available=hands_avail, formation=args.formation, prefer_snapshot=args.snapshot)
    print(res.to_json())


if __name__ == "__main__":
    _main()
