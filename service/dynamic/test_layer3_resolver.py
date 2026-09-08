"""
test_layer3_resolver.py — first committed test suite for Layer 3 (Step 4 part b).

Runnable without a framework:  <venv>/python test_layer3_resolver.py
Exits nonzero on any failure. QB is resolved from the checkpoints_v2 offline snapshot
(prefer_snapshot=True) so tests are reproducible without a DB; WR from the legacy JSON.

The load-bearing check is test_22_cues_resolve_with_correct_cue: the whole migration existed
to preserve those cues, so "resolves without erroring" is NOT the bar — each migrated cue must
come back attached to the CORRECT checkpoint (verified by checkpoints_v2 row id), none dropped,
none misattached. Same write-then-read-back discipline as the Step-3 migration.
"""

from __future__ import annotations

import json
import os
import sys

_HERE = os.path.dirname(os.path.abspath(__file__))
if _HERE not in sys.path:
    sys.path.insert(0, _HERE)
_RULESETS = os.path.normpath(os.path.join(_HERE, "..", "rulesets"))
if _RULESETS not in sys.path:
    sys.path.insert(0, _RULESETS)

import layer3_resolver as L3

_SNAPSHOT = os.path.join(_RULESETS, "testdata", "checkpoints_v2_snapshot.json")
_checks = []


def check(name, cond, detail=""):
    _checks.append((name, bool(cond), detail))


def QB(**kw):
    kw.setdefault("prefer_snapshot", True)
    return L3.resolve("QB", **kw)


def WR(**kw):
    kw.setdefault("prefer_snapshot", True)
    return L3.resolve("WR", **kw)


def TE(**kw):
    kw.setdefault("prefer_snapshot", True)
    return L3.resolve("TE", **kw)


# ── 1. no verdicts anywhere (the core invariant) ──────────────────────────────────
def test_no_verdicts():
    r = QB()
    check("summary.contains_verdicts is False", r.summary["contains_verdicts"] is False)
    # no checkpoint carries a score/verdict/grade/pass-fail field
    forbidden = {"verdict", "score", "grade", "pass", "fail", "passed", "result"}
    leaked = [c.name for c in r.checkpoints if forbidden & set(vars(c).keys())]
    check("no checkpoint has a verdict/score/grade field", not leaked, f"{leaked[:2]}")


# ── 2. fail-loud on an unknown landmark token ─────────────────────────────────────
def test_fail_loud_unknown_token():
    bad = [{"position": "QB", "variation": "5 Step", "technique": "Drop-Back", "formation": "Gun",
            "label": "x", "name": "x", "judge": True, "proxy_only": False, "skip": False,
            "measurable_by_pose": "Yes", "camera_angle": "Side", "static_or_dynamic": "Dynamic",
            "thresholds_status": "Draft", "phase": None, "phase_order": None, "id": 1,
            "pose_landmarks": ["Left Shoulder", "Nonexistent Landmark"]}]
    try:
        L3.resolve("QB", catalogue=bad, source="checkpoints_v2")
        check("resolve raises on unknown landmark token", False, "no exception")
    except L3.UnknownLandmarkError:
        check("resolve raises on unknown landmark token", True)


# ── 3. camera-view gating: uncovered view → not-assessable, list NOT shortened ─────
def test_camera_view_gating():
    full = QB(technique="Drop-Back")
    side = QB(technique="Drop-Back", available_views=["side"])
    check("view gating does not shorten the checklist", len(full.checkpoints) == len(side.checkpoints),
          f"{len(full.checkpoints)} vs {len(side.checkpoints)}")
    front = [c for c in side.checkpoints if c.camera_angle == "Front"]
    bad = [c for c in front if c.assessable or not any("view" in x for x in c.not_assessable_reasons)]
    check("Front checkpoints are not-assessable under side-only, with a reason",
          front and not bad, f"front={len(front)}, bad={len(bad)}")


# ── 4. handedness precedence + derived-token resolution ───────────────────────────
def test_handedness_and_derived_tokens():
    none_h = QB(technique="Throwing")
    # find a checkpoint with an unsided throwing-arm token (handedness kind)
    def hand_tokens(res):
        out = []
        for c in res.checkpoints:
            for rr in c.landmarks_resolved:
                if rr.get("kind") == "handedness":
                    out.append((c, rr))
        return out
    ht = hand_tokens(none_h)
    check("QB Throwing exposes an unsided Elbow/Wrist token", bool(ht),
          "no handedness-kind token found")
    if ht:
        _, rr = ht[0]
        check("unsided token is unresolved when handedness unknown", rr.get("handedness_resolved") is None)
    right = QB(technique="Throwing", handedness="right")
    ht_r = hand_tokens(right)
    if ht_r:
        _, rr = ht_r[0]
        check("unsided token resolves to a Right landmark under handedness=right",
              rr.get("resolves_to") and rr["resolves_to"][0].startswith("Right"), f'{rr.get("resolves_to")}')
    # disagreement surfaced, never silently overridden
    dis = QB(technique="Throwing", handedness="left",
             phases={"handedness": "right", "present": [], "absent": []})
    check("supplied handedness wins and disagreement is flagged",
          dis.summary["handedness"]["value"] == "left" and dis.summary["handedness"]["disagreement"] is True)


# ── 5. formation matching ('All formations' wildcard; Gun excludes Pistol) ─────────
def test_formation_matching():
    gun = QB(technique="Drop-Back", variation="5 Step", formation="Gun")
    check("Gun query returns only Gun or All-formations rows",
          all(c.formation in ("Gun", "All formations") for c in gun.checkpoints),
          f'{sorted({c.formation for c in gun.checkpoints})}')
    check("Gun query excludes Pistol/Under-Center-only rows",
          all(c.formation not in ("Pistol", "Under Center") for c in gun.checkpoints))


# ── 6. not-migrated guard (NULL gates; ready techniques resolve) ──────────────────
def test_not_migrated_guard():
    ex = QB(technique="Exchange")
    check("Exchange (36/46) resolves 0 checkpoints", len(ex.checkpoints) == 0)
    check("Exchange reported not-migrated with counts",
          any(t["technique"] == "Exchange" and t["annotated"] == 36 and t["total"] == 46
              for t in ex.summary["not_migrated_techniques"]))
    allq = QB()
    nm = {t["technique"] for t in allq.summary["not_migrated_techniques"]}
    check("position-only query flags Ball Carry + Exchange not-migrated", nm == {"Ball Carry", "Exchange"}, f"{nm}")
    ready_techs = {c.technique for c in allq.checkpoints}
    check("only ready techniques appear in checkpoints",
          ready_techs == {"Drop-Back", "Pocket Movement", "Stance", "Throwing"}, f"{ready_techs}")


# ── 7. 'No' (skip) rows still resolve; ordering is stable ─────────────────────────
def test_skip_rows_resolve_and_ordering():
    allq = QB()
    check("skip-tier ('No') checkpoints are present, not dropped",
          any(c.tier == "skip" for c in allq.checkpoints))
    # unphased QB techniques order by row_id ascending within the technique
    db = [c for c in allq.checkpoints if c.technique == "Drop-Back"]
    ids = [c.row_id for c in db]
    check("unphased Drop-Back checkpoints are ordered by row_id", ids == sorted(ids), "not sorted")


# ── 8. WR now resolves from checkpoints_v2 (Step 4 WR wiring, 2026-09-08) ──────────
def test_wr_from_checkpoints_v2():
    wr = WR()
    check("WR source is checkpoints_v2 (no longer legacy_json)", wr.summary["source"] == "checkpoints_v2",
          f'{wr.summary["source"]}')
    check("WR resolves all 291 rows", wr.summary["total"] == 291, f'{wr.summary["total"]}')
    check("WR: no not-migrated techniques (all annotated, 0 NULL mbp)",
          wr.summary["not_migrated_techniques"] == [], f'{wr.summary["not_migrated_techniques"]}')
    check("WR: no verdicts", wr.summary["contains_verdicts"] is False)
    check("WR: no skip-tier rows (WR has no 'No' rows)", wr.summary["by_tier"]["skip"] == 0,
          f'{wr.summary["by_tier"]}')


def test_wr_phased_ordering():
    """A phased Release variation resolves in phase_order sequence (Split Release, clean 4 phases)."""
    sp = WR(technique="Release", variation="Split Release")
    orders = [c.phase_order for c in sp.checkpoints]
    check("WR Split Release: every checkpoint has a phase_order", all(o is not None for o in orders))
    check("WR Split Release: checklist is ordered by phase_order", orders == sorted(orders), f"{orders}")
    # phases appear in their coached sequence
    seq = []
    for c in sp.checkpoints:
        if not seq or seq[-1] != c.phase:
            seq.append(c.phase)
    check("WR Split Release: phase sequence Split->Hesitation->Plant&Drive->Vertical Escape",
          seq == ["The Split", "The Hesitation", "The Plant & Drive", "The Vertical Escape"], f"{seq}")


def test_wr_unphased_ordering():
    """An unphased WR technique (Stance) falls back to row_id ordering (no phase_order)."""
    st = WR(technique="Stance")
    check("WR Stance: all unphased (phase_order is None)", all(c.phase_order is None for c in st.checkpoints))
    ids = [c.row_id for c in st.checkpoints]
    check("WR Stance: ordered by row_id when unphased", ids == sorted(ids), f"{ids}")


# ── 9. THE verification: all 22 migrated cues resolve on the CORRECT checkpoint ────
def test_22_cues_resolve_with_correct_cue():
    snap = json.load(open(_SNAPSHOT, encoding="utf-8"))["rows"]
    truth = {r["id"]: r["coaching_cue"] for r in snap if r.get("coaching_cue")}
    check("snapshot ground truth has exactly 22 cue rows", len(truth) == 22, f"{len(truth)}")

    resolved = {c.row_id: c.coaching_cue for c in QB().checkpoints if c.coaching_cue}
    # every migrated cue must resolve, on the right row id, with the exact cue text
    missing = [i for i in truth if i not in resolved]
    wrong = {i: (truth[i], resolved.get(i)) for i in truth if resolved.get(i) != truth[i]}
    extra = [i for i in resolved if i not in truth]
    check("all 22 cue rows resolve (none dropped)", not missing, f"missing ids: {missing}")
    check("each cue matches its row exactly (none misattached)", not wrong, f"mismatches: {list(wrong.items())[:2]}")
    check("no unexpected checkpoint carries a cue (no spillover)", not extra, f"extra ids: {extra}")
    check("resolved cue count is exactly 22", len(resolved) == 22, f"{len(resolved)}")


# ── 10. WR must-land spot-check (the WR equivalent of the 22-cue check) ────────────
def test_wr_must_land_split_release():
    """Split Release (the cleanest 4-phase Release variation) must resolve intact, in order,
    with the anchor row we independently verified during the clustering review (id 862)."""
    sp = WR(technique="Release", variation="Split Release")
    check("WR Split Release resolves all 24 rows", len(sp.checkpoints) == 24, f"{len(sp.checkpoints)}")
    from collections import Counter
    per_phase = Counter(c.phase for c in sp.checkpoints)
    check("WR Split Release: 4 phases x 6 checkpoints each",
          set(per_phase.values()) == {6} and len(per_phase) == 4, f"{dict(per_phase)}")
    # Anchor = id 865, the exact row independently verified during the clustering review
    # ("The head comes round to track straight upfield…"). (862 is a DIFFERENT checkpoint in
    # the same Vertical Escape phase — the hips-rotate-downfield one; don't confuse them.)
    anchor = next((c for c in sp.checkpoints if c.row_id == 865), None)
    check("WR Split Release: anchor row 865 present", anchor is not None)
    if anchor:
        check("row 865 is Vertical Escape phase", anchor.phase == "The Vertical Escape", f"{anchor.phase}")
        check("row 865 content intact (head comes round to track upfield)",
              "track straight upfield" in anchor.standard.lower()
              or "re-establishing vision" in anchor.standard.lower(), anchor.standard[:60])


def test_wr_must_land_catching_tier_is_actual_not_aspirational():
    """The 8 CLAUDE.md-'Part C' retiering rows resolve at their ACTUAL tier (proxy_only /
    Partial), NOT the aspirational judge/Needs Motion. This is a deliberate tripwire: it
    fails loud if those rows are ever flipped toward the stale aspiration WITHOUT the
    hand-token work that flip actually requires (a named, separate follow-up)."""
    cat = WR(technique="Catching")
    by_id = {c.row_id: c for c in cat.checkpoints}
    target_ids = [709, 712, 715, 718, 721, 724, 727, 728]  # 7 Extend&Bait + OtS/The Strike
    missing = [i for i in target_ids if i not in by_id]
    check("all 8 retiered Catching rows resolve", not missing, f"missing: {missing}")
    not_proxy = [(i, by_id[i].tier) for i in target_ids if i in by_id and by_id[i].tier != "proxy_only"]
    check("8 retiered Catching rows are proxy_only (actual), NOT judge/Needs Motion",
          not not_proxy, f"unexpected tiers: {not_proxy}")
    # none of them use a Hand-landmarker token yet (the flip's justification is absent)
    hands_used = [i for i in target_ids if i in by_id and by_id[i].requires_hands]
    check("8 retiered Catching rows are hands-free (flip's justification not present)",
          not hands_used, f"rows unexpectedly needing hands: {hands_used}")


# ── 11. TE resolves from checkpoints_v2 (Step 4 TE wiring, 2026-09-08) ─────────────
def test_te_from_checkpoints_v2():
    te = TE()
    check("TE source is checkpoints_v2", te.summary["source"] == "checkpoints_v2", f'{te.summary["source"]}')
    check("TE resolves all 308 rows", te.summary["total"] == 308, f'{te.summary["total"]}')
    check("TE: no not-migrated techniques (all annotated)", te.summary["not_migrated_techniques"] == [],
          f'{te.summary["not_migrated_techniques"]}')
    check("TE: no verdicts", te.summary["contains_verdicts"] is False)
    check("TE: no skip-tier rows", te.summary["by_tier"]["skip"] == 0, f'{te.summary["by_tier"]}')


def test_te_mixed_phase_per_variation_ordering():
    """TE's First Step is partially phased at the technique level, but all-or-nothing per
    variation: Start (WR-copied) is fully unphased -> row_id order; Start - 2 Point (TE-original)
    is fully phased -> phase_order. Confirm each variation orders correctly, no interleaving."""
    unph = TE(technique="First Step", variation="Start")
    check("TE First Step/Start is fully unphased", all(c.phase_order is None for c in unph.checkpoints))
    ids = [c.row_id for c in unph.checkpoints]
    check("TE First Step/Start orders by row_id", ids == sorted(ids), f"{ids}")
    ph = TE(technique="First Step", variation="Start - 2 Point")
    check("TE First Step/Start - 2 Point is fully phased", all(c.phase_order is not None for c in ph.checkpoints))
    orders = [c.phase_order for c in ph.checkpoints]
    check("TE First Step/Start - 2 Point orders by phase_order", orders == sorted(orders), f"{orders}")


# ── 12. TE must-land: join-copy fidelity + anchor + a TE-original technique ────────
def _by_positional_key(res):
    """Map (variation, phase, rank-within-(variation,phase)-by-row_id) -> checkpoint.
    Reconstructs the copy's alignment key (annotation was copied positionally within group)."""
    from collections import defaultdict
    groups = defaultdict(list)
    for c in res.checkpoints:
        groups[(c.variation, c.phase)].append(c)
    out = {}
    for (var, ph), cps in groups.items():
        for rank, c in enumerate(sorted(cps, key=lambda x: (x.row_id if x.row_id is not None else 0))):
            out[(var, ph, rank)] = c
    return out


def test_te_must_land_join_copy_fidelity():
    """The join-copy carried WR's ANNOTATION (landmarks + tier), not IES (TE reworded IES to say
    'tight end'). So fidelity is checked on landmarks+tier, aligned positionally the way the copy
    worked. Two reused techniques: Catching (1 row per variation/phase) and Split Release (6/phase).
    Any resolver-visible drift from the copy shows up here."""
    for tech, var in (("Catching", None), ("Release", "Split Release")):
        te = _by_positional_key(TE(technique=tech, **({"variation": var} if var else {})))
        wr = _by_positional_key(WR(technique=tech, **({"variation": var} if var else {})))
        shared = set(te) & set(wr)
        check(f"{tech}{'/'+var if var else ''}: TE/WR align on the copy key (non-empty)", bool(shared),
              f"te={len(te)} wr={len(wr)} shared={len(shared)}")
        lm_drift = [k for k in shared if te[k].landmarks != wr[k].landmarks]
        tier_drift = [k for k in shared if te[k].tier != wr[k].tier]
        check(f"{tech}{'/'+var if var else ''}: landmarks match WR (no copy drift)", not lm_drift,
              f"{len(lm_drift)} drifted, e.g. {lm_drift[:1]}")
        check(f"{tech}{'/'+var if var else ''}: tier matches WR (no copy drift)", not tier_drift,
              f"{len(tier_drift)} drifted, e.g. {tier_drift[:1]}")


def test_te_must_land_split_release_anchor():
    """TE's copy of WR's verified anchor (row 1371 = WR 865's counterpart): Split Release /
    Vertical Escape / phase_order 4 / proxy_only, landmarks copied faithfully from WR, and the
    IES is the SAME checkpoint concept but correctly reworded for TE ('tight end', NOT 'receiver')."""
    sp = TE(technique="Release", variation="Split Release")
    check("TE Split Release resolves all 24 rows", len(sp.checkpoints) == 24, f"{len(sp.checkpoints)}")
    a = next((c for c in sp.checkpoints if c.row_id == 1371), None)
    check("TE anchor row 1371 present", a is not None)
    if a:
        check("1371 phase/order = Vertical Escape / 4", a.phase == "The Vertical Escape" and a.phase_order == 4,
              f"{a.phase}/{a.phase_order}")
        check("1371 tier is proxy_only (Partial)", a.tier == "proxy_only", a.tier)
        check("1371 landmarks copied faithfully from WR 865",
              a.landmarks == ["Nose", "Left Eye", "Right Eye", "Left Ear", "Right Ear", "Neck"], f"{a.landmarks}")
        s = a.standard.lower()
        check("1371 content intact (head comes round to track upfield)",
              "track straight upfield" in s and "re-establishing vision" in s, a.standard[:60])
        check("1371 is TE-specific ('tight end', NOT 'receiver')",
              "tight end" in s and "receiver" not in s, a.standard)


def test_te_must_land_original_technique():
    """A TE-ORIGINAL technique (freshly annotated, not copied) resolves in order: First Step /
    Start - 2 Point, 5 phases in phase_order 1-5."""
    o = TE(technique="First Step", variation="Start - 2 Point")
    check("TE-original First Step/Start - 2 Point resolves 5 rows", len(o.checkpoints) == 5, f"{len(o.checkpoints)}")
    orders = [c.phase_order for c in o.checkpoints]
    check("TE-original: phase_order is exactly 1..5 in order", orders == [1, 2, 3, 4, 5], f"{orders}")
    check("TE-original: every row has non-empty standard + a label",
          all(c.standard and c.measurement for c in o.checkpoints))


def main():
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass
    for fn in (test_no_verdicts, test_fail_loud_unknown_token, test_camera_view_gating,
               test_handedness_and_derived_tokens, test_formation_matching, test_not_migrated_guard,
               test_skip_rows_resolve_and_ordering,
               test_wr_from_checkpoints_v2, test_wr_phased_ordering, test_wr_unphased_ordering,
               test_wr_must_land_split_release, test_wr_must_land_catching_tier_is_actual_not_aspirational,
               test_te_from_checkpoints_v2, test_te_mixed_phase_per_variation_ordering,
               test_te_must_land_join_copy_fidelity, test_te_must_land_split_release_anchor,
               test_te_must_land_original_technique,
               test_22_cues_resolve_with_correct_cue):
        fn()
    passed = sum(1 for _, ok, _ in _checks if ok)
    print(f"{passed}/{len(_checks)} checks passed\n")
    for name, ok, detail in _checks:
        print(f"  [{'PASS' if ok else 'FAIL'}] {name}" + (f"  -- {detail}" if not ok and detail else ""))
    if passed != len(_checks):
        sys.exit(1)


if __name__ == "__main__":
    main()
