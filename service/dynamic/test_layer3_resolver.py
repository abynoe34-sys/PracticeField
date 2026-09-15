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


# ── 6. ROW-LEVEL exclusion guard (Option B, 2026-09-08) ───────────────────────────
# DELIBERATELY REWRITTEN from the former test_not_migrated_guard, which asserted the OLD
# per-technique gating (Exchange fully gated -> 0). Under Option B, unannotated ROWS are
# excluded individually: a partially-annotated technique resolves its annotated rows and
# reports the excluded count. This test asserts the NEW contract.
def test_row_level_exclusion_guard():
    # QB Exchange (36 annotated / 10 unannotated) now RESOLVES its 36, reported as partial.
    ex = QB(technique="Exchange")
    check("QB Exchange resolves its 36 annotated rows (row-level, not gated)", len(ex.checkpoints) == 36,
          f"{len(ex.checkpoints)}")
    check("QB Exchange NOT in not_migrated (it partially resolves)",
          not any(t["technique"] == "Exchange" for t in ex.summary["not_migrated_techniques"]))
    check("QB Exchange reported as partial: 36 resolved / 10 excluded / 46 total",
          any(t["technique"] == "Exchange" and t["resolved"] == 36 and t["excluded_unannotated"] == 10
              and t["total"] == 46 for t in ex.summary["partial_exclusions"]),
          f'{ex.summary["partial_exclusions"]}')
    # QB Ball Carry (0 annotated / 5 unannotated) resolves nothing -> still fully not_migrated.
    bc = QB(technique="Ball Carry")
    check("QB Ball Carry resolves 0 (all 5 rows unannotated)", len(bc.checkpoints) == 0)
    check("QB Ball Carry in not_migrated (0 resolved / 5 excluded)",
          any(t["technique"] == "Ball Carry" and t["resolved"] == 0 and t["excluded_unannotated"] == 5
              for t in bc.summary["not_migrated_techniques"]), f'{bc.summary["not_migrated_techniques"]}')
    # position-wide: only Ball Carry fully not-migrated; Exchange is a partial; Exchange rows now appear.
    allq = QB()
    nm = {t["technique"] for t in allq.summary["not_migrated_techniques"]}
    check("QB position-only: only Ball Carry fully not-migrated", nm == {"Ball Carry"}, f"{nm}")
    pe = {t["technique"] for t in allq.summary["partial_exclusions"]}
    check("QB position-only: Exchange reported as a partial exclusion", pe == {"Exchange"}, f"{pe}")
    techs = {c.technique for c in allq.checkpoints}
    check("QB resolved techniques now include Exchange's annotated rows",
          techs == {"Drop-Back", "Pocket Movement", "Stance", "Throwing", "Exchange"}, f"{techs}")
    check("QB excluded_unannotated_total = 15 (Exchange 10 + Ball Carry 5)",
          allq.summary["excluded_unannotated_total"] == 15, f'{allq.summary["excluded_unannotated_total"]}')


def test_wr_te_exclusion_is_noop():
    """Option B must be a TRUE no-op for WR and TE (zero null rows): no exclusions, nothing
    dropped, totals unchanged from before the guard change (WR 291, TE 308)."""
    for pos, total in (("WR", 291), ("TE", 308)):
        r = L3.resolve(pos, prefer_snapshot=True)
        check(f"{pos}: total unchanged ({total})", r.summary["total"] == total, f'{r.summary["total"]}')
        check(f"{pos}: zero excluded (no-op)", r.summary["excluded_unannotated_total"] == 0)
        check(f"{pos}: no not_migrated, no partial_exclusions",
              r.summary["not_migrated_techniques"] == [] and r.summary["partial_exclusions"] == [])


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


# ── 13. OL resolves from checkpoints_v2 — 5 positions (Step 4 OL wiring, 2026-09-08) ─
def OL(pos, **kw):
    kw.setdefault("prefer_snapshot", True)
    return L3.resolve(pos, **kw)


_OL_POSITIONS = ["OL_Center", "OL_Left Guard", "OL_Right Guard", "OL_Left Tackle", "OL_Right Tackle"]


def test_ol_center_stance_partial_exclusion():
    """THE scenario the row-level guard was built for, verified literally first: OL_Center Stance
    has 16 annotated + 2 unannotated content-gap rows (ids 13, 18). It must resolve the 16 and
    report the 2 as a PARTIAL exclusion — NOT gate the whole technique, NOT silently drop them."""
    st = OL("OL_Center", technique="Stance")
    check("OL_Center Stance resolves its 16 annotated rows", len(st.checkpoints) == 16, f"{len(st.checkpoints)}")
    check("OL_Center Stance NOT in not_migrated (it partially resolves)",
          not any(t["technique"] == "Stance" for t in st.summary["not_migrated_techniques"]))
    check("OL_Center Stance reported partial: 16 resolved / 2 excluded / 18 total",
          any(t["technique"] == "Stance" and t["resolved"] == 16 and t["excluded_unannotated"] == 2
              and t["total"] == 18 for t in st.summary["partial_exclusions"]),
          f'{st.summary["partial_exclusions"]}')
    resolved_ids = {c.row_id for c in st.checkpoints}
    check("OL_Center Stance content-gap ids 13 & 18 are NOT resolved", not ({13, 18} & resolved_ids),
          f"{ {13,18} & resolved_ids }")


def test_ol_from_checkpoints_v2():
    for pos in _OL_POSITIONS:
        r = OL(pos)
        check(f"{pos}: source is checkpoints_v2", r.summary["source"] == "checkpoints_v2")
        check(f"{pos}: no verdicts", r.summary["contains_verdicts"] is False)
        # Blocking fully annotated; Stance partially -> excluded_total = the Stance content gap
        exp_excluded = 4 if "Tackle" in pos else 2
        check(f"{pos}: excluded_unannotated_total = {exp_excluded} (Stance content gap)",
              r.summary["excluded_unannotated_total"] == exp_excluded, f'{r.summary["excluded_unannotated_total"]}')
        check(f"{pos}: Blocking fully resolves (no exclusion, no not_migrated)",
              not any(t["technique"] == "Blocking" for t in r.summary["partial_exclusions"] + r.summary["not_migrated_techniques"]))


def test_ol_formation_specific_resolution():
    """OL is the first position where formation genuinely varies (Gun/Pistol/Under Center in Stance).
    Gun vs Under Center for the same technique must return distinct, non-overlapping content."""
    allst = OL("OL_Center", technique="Stance")
    gun = OL("OL_Center", technique="Stance", formation="Gun")
    uc = OL("OL_Center", technique="Stance", formation="Under Center")
    check("OL_Center Stance no-formation spans Gun/Pistol/Under Center",
          {c.formation for c in allst.checkpoints} == {"Gun", "Pistol", "Under Center"},
          f'{sorted({c.formation for c in allst.checkpoints})}')
    check("formation=Gun returns only Gun rows", gun.checkpoints and all(c.formation == "Gun" for c in gun.checkpoints))
    check("formation=Under Center returns only Under Center rows",
          uc.checkpoints and all(c.formation == "Under Center" for c in uc.checkpoints))
    check("Gun and Under Center resolve DISTINCT rows (no overlap)",
          not ({c.row_id for c in gun.checkpoints} & {c.row_id for c in uc.checkpoints}))


def test_ol_center_guard_blocking_branch():
    """Center/Guard branch: a Center Blocking variation resolves in phase order (Blocking is phased,
    All-formations)."""
    r = OL("OL_Center", technique="Blocking", variation="Pass_Pro")
    check("OL_Center Blocking/Pass_Pro resolves rows", len(r.checkpoints) > 0, f"{len(r.checkpoints)}")
    orders = [c.phase_order for c in r.checkpoints]
    check("OL_Center Blocking/Pass_Pro all phased", all(o is not None for o in orders))
    check("OL_Center Blocking/Pass_Pro ordered by phase_order", orders == sorted(orders), f"{orders}")
    check("OL_Center Blocking is formation-agnostic (All formations)",
          all(c.formation == "All formations" for c in r.checkpoints))


def test_ol_tackle_2point_branch():
    """Tackle branch: the Tackle-specific 2-Point split (which Center/Guards don't have) resolves —
    both a Blocking Pass_Pro - 2 Point variation and Stance 2-Point."""
    b = OL("OL_Left Tackle", technique="Blocking", variation="Pass_Pro - 2 Point")
    check("OL_LT Blocking/Pass_Pro - 2 Point resolves rows", len(b.checkpoints) > 0, f"{len(b.checkpoints)}")
    check("OL_LT Pass_Pro - 2 Point rows all that variation",
          all(c.variation == "Pass_Pro - 2 Point" for c in b.checkpoints))
    s2 = OL("OL_Left Tackle", technique="Stance", variation="2-Point")
    check("OL_LT Stance/2-Point resolves (Tackle-only stance variation)", len(s2.checkpoints) > 0, f"{len(s2.checkpoints)}")


def test_ol_exclusion_reported_all_positions():
    """The 14-row content gap (all Stance) is excluded AND reported across every OL position —
    never silently dropped. Per-position Stance excluded counts: Center/Guards 2, Tackles 4 (total 14)."""
    total_excluded = 0
    for pos in _OL_POSITIONS:
        st = OL(pos, technique="Stance")
        pe = [t for t in st.summary["partial_exclusions"] if t["technique"] == "Stance"]
        check(f"{pos} Stance reported as partial_exclusion", len(pe) == 1, f'{st.summary["partial_exclusions"]}')
        if pe:
            total_excluded += pe[0]["excluded_unannotated"]
    check("OL Stance excluded rows total exactly 14 across all positions", total_excluded == 14, f"{total_excluded}")


# ── 14. RB resolves from checkpoints_v2 — 3 positions (Step 4 RB wiring, 2026-09-09) ─
def RB(pos, **kw):
    kw.setdefault("prefer_snapshot", True)
    return L3.resolve(pos, **kw)


def test_rb_from_checkpoints_v2():
    for pos, total in (("RB", 86), ("RB_HB", 45), ("RB_FB", 20)):
        r = RB(pos)
        check(f"{pos}: source is checkpoints_v2", r.summary["source"] == "checkpoints_v2")
        check(f"{pos}: resolves all {total} rows", r.summary["total"] == total, f'{r.summary["total"]}')
        check(f"{pos}: all ready (no not_migrated, no partial exclusions)",
              not r.summary["not_migrated_techniques"] and not r.summary["partial_exclusions"]
              and r.summary["excluded_unannotated_total"] == 0)
        check(f"{pos}: no verdicts, no skip-tier", r.summary["contains_verdicts"] is False and r.summary["by_tier"]["skip"] == 0)


def test_rb_wr_copy_fidelity():
    """Must-land 1: RB's WR-copied rows (Catching, Ball Carry, Blocking-Cut) resolve with landmarks+tier
    IDENTICAL to WR's originals, aligned positionally within (variation, phase). Grounded 21/21 + 5/5 + 5/5."""
    for tech in ("Catching", "Ball Carry", "Blocking"):
        rb = _by_positional_key(RB("RB", technique=tech))
        wr = _by_positional_key(WR(technique=tech, variation="Execution") if tech == "Blocking" else WR(technique=tech))
        # Blocking: RB has variation 'Cut'; align RB Cut against WR's Cut rows specifically
        if tech == "Blocking":
            rb = _by_positional_key(RB("RB", technique="Blocking", variation="Cut"))
            wr = _by_positional_key(WR(technique="Blocking", variation="Cut"))
        shared = set(rb) & set(wr)
        check(f"RB {tech}: aligns with WR on the copy key (non-empty)", bool(shared),
              f"rb={len(rb)} wr={len(wr)} shared={len(shared)}")
        lm = [k for k in shared if rb[k].landmarks != wr[k].landmarks]
        ti = [k for k in shared if rb[k].tier != wr[k].tier]
        check(f"RB {tech}: landmarks match WR (no copy drift)", not lm, f"{len(lm)} drifted")
        check(f"RB {tech}: tier matches WR (no copy drift)", not ti, f"{len(ti)} drifted")


def test_rb_hb_only_exchange():
    """Must-land 2: RB_HB-only technique. Exchange (Handoff/Toss/Option) resolves under RB_HB and is
    ABSENT under RB and RB_FB (three-way technique-set independence)."""
    hb = RB("RB_HB", technique="Exchange")
    check("RB_HB Exchange resolves 15 rows", len(hb.checkpoints) == 15, f"{len(hb.checkpoints)}")
    check("RB_HB Exchange variations = Handoff/Option/Toss",
          {c.variation for c in hb.checkpoints} == {"Handoff", "Option", "Toss"}, f'{sorted({c.variation for c in hb.checkpoints})}')
    check("RB has NO Exchange", len(RB("RB", technique="Exchange").checkpoints) == 0)
    check("RB_FB has NO Exchange", len(RB("RB_FB", technique="Exchange").checkpoints) == 0)


def test_rb_fb_only_technique():
    """Must-land 3: RB_FB-only structure. Blocking Run - 3 Point + Stance 3-Point resolve under RB_FB;
    RB_FB has no Exchange, and its 3-Point Blocking split is absent from RB_HB (which is 2-Point)."""
    b = RB("RB_FB", technique="Blocking", variation="Run - 3 Point")
    check("RB_FB Blocking/Run - 3 Point resolves", len(b.checkpoints) > 0, f"{len(b.checkpoints)}")
    check("RB_FB Blocking/Run - 3 Point rows all that variation",
          all(c.variation == "Run - 3 Point" for c in b.checkpoints))
    st = RB("RB_FB", technique="Stance", variation="3-Point")
    check("RB_FB Stance/3-Point resolves", len(st.checkpoints) > 0, f"{len(st.checkpoints)}")
    check("RB_HB has NO Run - 3 Point (it's 2-Point)",
          len(RB("RB_HB", technique="Blocking", variation="Run - 3 Point").checkpoints) == 0)


def test_rb_hb_formation_specific():
    """Must-land 4: RB_HB First Step/Starts is the only RB place formation varies (Gun/Pistol/Under
    Center). Gun vs Under Center return distinct, non-overlapping content."""
    allfs = RB("RB_HB", technique="First Step")
    gun = RB("RB_HB", technique="First Step", formation="Gun")
    uc = RB("RB_HB", technique="First Step", formation="Under Center")
    check("RB_HB First Step spans Gun/Pistol/Under Center",
          {c.formation for c in allfs.checkpoints} == {"Gun", "Pistol", "Under Center"},
          f'{sorted({c.formation for c in allfs.checkpoints})}')
    check("formation=Gun returns only Gun rows", gun.checkpoints and all(c.formation == "Gun" for c in gun.checkpoints))
    check("formation=Under Center returns only Under Center rows",
          uc.checkpoints and all(c.formation == "Under Center" for c in uc.checkpoints))
    check("Gun and Under Center resolve DISTINCT rows (no overlap)",
          not ({c.row_id for c in gun.checkpoints} & {c.row_id for c in uc.checkpoints}))


# ── 15. DB resolves from checkpoints_v2 — 4 positions (Step 4 DB wiring, 2026-09-09) ─
def DB(pos, **kw):
    kw.setdefault("prefer_snapshot", True)
    return L3.resolve(pos, **kw)


def test_db_from_checkpoints_v2():
    # Counts current as of the 2026-09-15 fault-tiering pilot split (11 DB 'Also:' rows -> 23),
    # on top of the 2026-09-13 Zone->Cover re-annotation. DB total 126 -> 138.
    for pos, total in (("DB_Corner", 70), ("DB_Nickel", 23), ("DB_Safety_Free", 24), ("DB_Safety_Strong", 21)):
        r = DB(pos)
        check(f"{pos}: source is checkpoints_v2", r.summary["source"] == "checkpoints_v2")
        check(f"{pos}: resolves all {total} rows", r.summary["total"] == total, f'{r.summary["total"]}')
        check(f"{pos}: all ready (no not_migrated/partial)",
              not r.summary["not_migrated_techniques"] and not r.summary["partial_exclusions"]
              and r.summary["excluded_unannotated_total"] == 0)
        check(f"{pos}: no verdicts, no skip-tier", r.summary["contains_verdicts"] is False and r.summary["by_tier"]["skip"] == 0)
        check(f"{pos}: techniques are First Step + Stance only (no Catching)",
              {c.technique for c in r.checkpoints} == {"First Step", "Stance"}, f'{sorted({c.technique for c in r.checkpoints})}')


def test_db_coverage_depth_distinct():
    """DB's coverage vocab lives in `formation` (Cover 1/2/3 + Man, coverage-agnostic = All Coverages).
    ASSERTS POSITIVELY: a Cover 2 query must return real Cover-2-SPECIFIC rows (count > 0), so a dead/
    renamed formation string fails loud here instead of passing vacuously on wildcard-only rows (the
    exact failure the old Zone-string test hid — it queried a nonexistent formation, got only the
    'All Coverages' wildcard rows, and every assertion held while testing nothing real)."""
    c2 = DB("DB_Corner", technique="First Step", formation="Cover 2")
    c3 = DB("DB_Corner", technique="First Step", formation="Cover 3")
    c2_specific = {c.row_id for c in c2.checkpoints if c.formation == "Cover 2"}
    c3_specific = {c.row_id for c in c3.checkpoints if c.formation == "Cover 3"}
    check("Cover 2 query returns REAL Cover-2-specific rows (>0, not just wildcard)", len(c2_specific) > 0,
          f"{len(c2_specific)}")
    check("Cover 3 query returns REAL Cover-3-specific rows (>0)", len(c3_specific) > 0, f"{len(c3_specific)}")
    check("Cover 2 returns only Cover 2 (+ All Coverages wildcard), no Cover 1/3",
          all(c.formation in ("Cover 2", "All Coverages") for c in c2.checkpoints)
          and not any(c.formation in ("Cover 1", "Cover 3") for c in c2.checkpoints))
    check("Cover 2 and Cover 3 coverage-specific rows are non-overlapping", not (c2_specific & c3_specific))


def test_db_all_coverages_is_wildcard():
    """LOCKS OPTION A (2026-09-09 decision): 'All Coverages' rows are coverage-agnostic and MUST appear
    in a specific-coverage query — a DB in Cover 2/Man still has a stance and may backpedal. If someone
    reverts _formation_ok to exclude them (the pre-decision behavior), this fails loud."""
    bp_ids = {c.row_id for c in DB("DB_Corner", technique="First Step").checkpoints if c.variation == "Backpedal"}
    check("DB_Corner has Backpedal (All Coverages) rows", len(bp_ids) == 5, f"{sorted(bp_ids)}")
    c2 = {c.row_id for c in DB("DB_Corner", technique="First Step", formation="Cover 2").checkpoints}
    man = {c.row_id for c in DB("DB_Corner", technique="First Step", formation="Man").checkpoints}
    check("Backpedal (All Coverages) rows ARE included in a Cover 2 query", bp_ids <= c2, f"missing: {bp_ids - c2}")
    check("Backpedal (All Coverages) rows ARE included in a Man query", bp_ids <= man, f"missing: {bp_ids - man}")
    # coverage-agnostic Stance (all All Coverages) appears in a position+coverage query
    pos_c2 = DB("DB_Corner", formation="Cover 2")
    check("coverage-agnostic Stance appears in a position-level Cover 2 query",
          "Stance" in {c.technique for c in pos_c2.checkpoints}, f'{sorted({c.technique for c in pos_c2.checkpoints})}')


def test_db_backpedal_position_independence():
    """Four-way technique/variation-set independence: Backpedal exists only in Corner + Safety_Free."""
    have = {p: any(c.variation == "Backpedal" for c in DB(p, technique="First Step").checkpoints)
            for p in ("DB_Corner", "DB_Nickel", "DB_Safety_Free", "DB_Safety_Strong")}
    check("Backpedal present in Corner + Safety_Free only",
          have == {"DB_Corner": True, "DB_Nickel": False, "DB_Safety_Free": True, "DB_Safety_Strong": False}, f"{have}")


def test_db_pilot_split_landed():
    """The 2026-09-15 DB fault-tiering pilot: the 11 'Also:'-bundled DB rows are now 23 one-fault
    rows. Verifies (a) NO DB checkpoint still bundles faults, (b) the sharpest case (row 1772) is
    correctly split — the primary lunge fault carries feet + judge tier, while the eye-gaze fault
    it was WRONGLY annotated for is a SEPARATE proxy_only row in the same phase."""
    also = []
    for pos in ("DB_Corner", "DB_Nickel", "DB_Safety_Free", "DB_Safety_Strong"):
        also += [(c.row_id, c.fault_trigger) for c in DB(pos).checkpoints
                 if "also:" in (c.fault_trigger or "").lower()]
    check("no DB checkpoint still bundles faults ('Also:' gone everywhere)", not also, f"{also[:2]}")

    cov1 = {c.row_id: c for c in DB("DB_Nickel", technique="First Step", formation="Cover 1").checkpoints}
    lunge, eye = cov1.get(1772), cov1.get(1791)
    check("1772 primary (lunge) resolves with feet + judge tier",
          lunge is not None and "Left Foot" in lunge.landmarks and lunge.tier == "judge",
          f"{lunge and (lunge.landmarks, lunge.tier)}")
    check("1791 eye-floating is a SEPARATE proxy_only row, same phase, gaze landmarks",
          eye is not None and eye.tier == "proxy_only" and eye.phase == lunge.phase
          and "Left Eye" in eye.landmarks and "Left Foot" not in eye.landmarks,
          f"{eye and (eye.tier, eye.phase, eye.landmarks)}")


def test_db_tier_filtering_bites_on_real_tags():
    """With the pilot rows now TAGGED, the resolver's tier/severity filters do real work on DB
    (not just the fail-open no-op on untagged data). DB_Safety_Strong First Step / Cover 1 holds
    three tagged split children: 1725 (Developing/Critical), 1783 (Advanced/Major), 1784
    (Developing/Major). Untagged sibling rows stay fail-open throughout."""
    q = dict(technique="First Step", formation="Cover 1")
    full = {c.row_id for c in DB("DB_Safety_Strong", **q).checkpoints}
    check("all three tagged children present unfiltered", {1725, 1783, 1784} <= full, f"{sorted(full)}")

    dev = {c.row_id for c in DB("DB_Safety_Strong", player_tier="Developing", **q).checkpoints}
    check("player_tier=Developing hides the Advanced fault (1783)", 1783 not in dev)
    check("player_tier=Developing keeps the Developing faults (1725, 1784)", {1725, 1784} <= dev,
          f"{sorted(dev)}")
    check("Developing filter reports a real hidden count (>0)",
          DB("DB_Safety_Strong", player_tier="Developing", **q).summary["tier_filter"]["tier_filtered"] > 0)

    crit = {c.row_id for c in DB("DB_Safety_Strong", min_severity="Critical", **q).checkpoints}
    check("min_severity=Critical keeps the Critical fault (1725)", 1725 in crit)
    check("min_severity=Critical drops the Major faults (1783, 1784)", not ({1783, 1784} & crit),
          f"{sorted(crit & {1783,1784})}")


def test_offense_wildcard_unaffected_by_all_coverages_change():
    """Regression guard: adding 'All Coverages' to the wildcard set must not change offense — a QB Gun
    query still includes 'All formations' rows, and no offense row is 'All Coverages'."""
    gun = QB(variation="5 Step", technique="Drop-Back", formation="Gun")
    check("QB Gun still returns Gun + All-formations only (wildcard intact)",
          gun.checkpoints and all(c.formation in ("Gun", "All formations") for c in gun.checkpoints),
          f'{sorted({c.formation for c in gun.checkpoints})}')


# ── 16. two-dimensional fault tiering (migration-v23; FAULT_TIERING_PLAN.md) ──────────
def _tier_row(id, tier, sev, order):
    """A minimal normalized-shape row for tier/severity filter tests (clean vocab landmark)."""
    return {"position": "QB", "variation": "5 Step", "technique": "Drop-Back", "formation": "Gun",
            "label": f"cp{id}", "name": f"cp{id}", "judge": True, "proxy_only": False, "skip": False,
            "annotated": True, "measurable_by_pose": "Yes", "camera_angle": "Both",
            "static_or_dynamic": "Dynamic", "thresholds_status": "Draft", "phase": None,
            "phase_order": order, "id": id, "pose_landmarks": ["Left Foot"],
            "player_tier": tier, "fault_severity": sev}


def _tier_catalogue():
    # rep-order by phase_order 1..6; mix of tiers/severities incl. NULLs (untriaged)
    return [
        _tier_row(1, "Fundamental", "Critical", 1),
        _tier_row(2, "Developing",  "Major",    2),
        _tier_row(3, "Advanced",    "Minor",    3),
        _tier_row(4, "Fundamental", "Minor",    4),
        _tier_row(5, None,          None,       5),   # untriaged on BOTH dimensions
        _tier_row(6, "Developing",  "Critical", 6),
    ]


def _R(**kw):
    return L3.resolve("QB", catalogue=_tier_catalogue(), source="checkpoints_v2", **kw)


def test_player_tier_is_cumulative_unlock():
    """player_tier is an 'unlock' threshold: a viewer sees every fault at level <= theirs.
    Fundamental sees only Fundamental; Advanced sees the full stack. NULL is fail-OPEN (always shown)."""
    fund = {c.row_id for c in _R(player_tier="Fundamental").checkpoints}
    dev = {c.row_id for c in _R(player_tier="Developing").checkpoints}
    adv = {c.row_id for c in _R(player_tier="Advanced").checkpoints}
    # Fundamental: ids 1,4 (Fundamental) + 5 (NULL, fail-open) — NOT the Developing/Advanced ids
    check("Fundamental viewer sees only Fundamental + untriaged", fund == {1, 4, 5}, f"{sorted(fund)}")
    check("Developing viewer adds Developing (cumulative)", dev == {1, 2, 4, 5, 6}, f"{sorted(dev)}")
    check("Advanced viewer sees the full stack (never hides fundamentals)", adv == {1, 2, 3, 4, 5, 6}, f"{sorted(adv)}")
    check("player_tier reports the hidden count honestly",
          _R(player_tier="Fundamental").summary["tier_filter"]["tier_filtered"] == 3)


def test_null_tier_severity_fail_open():
    """The load-bearing asymmetry vs measurable_by_pose: NULL tier/severity is FAIL-OPEN. The
    untriaged row (id 5) survives EVERY filter — valid coaching is never hidden for lack of a tag."""
    check("untriaged row survives the strictest tier filter", 5 in {c.row_id for c in _R(player_tier="Fundamental").checkpoints})
    check("untriaged row survives the strictest severity floor", 5 in {c.row_id for c in _R(min_severity="Critical").checkpoints})


def test_min_severity_floor():
    """min_severity keeps rows at least that severe (Critical most severe). NULL kept (fail-open)."""
    crit = {c.row_id for c in _R(min_severity="Critical").checkpoints}
    major = {c.row_id for c in _R(min_severity="Major").checkpoints}
    # Critical floor: ids 1,6 (Critical) + 5 (NULL) — drops Major(2)/Minor(3,4)
    check("min_severity=Critical keeps Critical + untriaged only", crit == {1, 5, 6}, f"{sorted(crit)}")
    check("min_severity=Major keeps Critical+Major + untriaged", major == {1, 2, 5, 6}, f"{sorted(major)}")
    check("severity floor reports the hidden count", _R(min_severity="Critical").summary["tier_filter"]["severity_filtered"] == 3)


def test_max_checkpoints_caps_by_severity_shows_in_rep_order():
    """The cognitive-load lever: keep the most game-critical N, but DISPLAY them in rep sequence.
    Top-3 by severity = the two Criticals (1,6) + the highest remaining (Major id 2); id 5 (NULL)
    ranks just below Major so it is NOT capped away behind a Minor. Displayed order stays phase_order."""
    r = _R(max_checkpoints=3)
    kept = [c.row_id for c in r.checkpoints]
    check("cap keeps exactly 3", len(kept) == 3, f"{kept}")
    check("cap keeps the most-critical (Criticals 1,6 + Major 2)", set(kept) == {1, 2, 6}, f"{sorted(kept)}")
    check("capped rows still displayed in rep (phase_order) order", kept == sorted(kept), f"{kept}")
    check("cap reports the hidden count", r.summary["tier_filter"]["capped"] == 3)


def test_tier_filters_compose_and_report_total():
    """tier + severity + cap compose; hidden_total sums all three omission reasons so a trimmed
    checklist can never look complete."""
    r = _R(player_tier="Developing", min_severity="Major", max_checkpoints=2)
    tf = r.summary["tier_filter"]
    check("hidden_total = tier + severity + capped", tf["hidden_total"] == tf["tier_filtered"] + tf["severity_filtered"] + tf["capped"])
    check("composed filter returns <= cap", len(r.checkpoints) <= 2)
    check("tier_filter echoes the requested params",
          tf["player_tier"] == "Developing" and tf["min_severity"] == "Major" and tf["max_checkpoints"] == 2)


def test_tier_filters_validate_input():
    for bad in (dict(player_tier="Elite"), dict(min_severity="Catastrophic")):
        try:
            _R(**bad)
            check(f"invalid {list(bad)[0]} raises", False, "no exception")
        except ValueError:
            check(f"invalid {list(bad)[0]} raises", True)


def test_tier_filter_noop_on_untagged_live_data():
    """Regression: on a still-UNTAGGED slice, a tier/severity filter must be a NO-OP (fail-open) —
    same total as no filter, nothing hidden. Uses WR, which carries zero tags (only DB and QB
    Drop-Back are tagged so far). Originally pointed at QB Drop-Back; repointed once QB Drop-Back
    became genuinely tagged by the 2026-09-15 QB pilot (the filter now correctly BITES there —
    see test_qb_dropback_tier_filtering)."""
    base = WR(technique="Routes")
    filt = WR(technique="Routes", player_tier="Fundamental", min_severity="Critical")
    check("untagged live data: tier/severity filter changes nothing", base.summary["total"] == filt.summary["total"],
          f'{base.summary["total"]} vs {filt.summary["total"]}')
    check("untagged live data: nothing hidden (fail-open no-op)", filt.summary["tier_filter"]["hidden_total"] == 0,
          f'{filt.summary["tier_filter"]}')


# ── 17. QB Drop-Back fault-tiering pilot (2026-09-15) — Option B split executed ──────
def test_qb_dropback_pilot_split_landed():
    """The QB pilot: 56 multi-symptom Drop-Back rows -> 84 (Option B, earned splits only). Verifies the
    three split archetypes landed cleanly and — the whole point of the archetype analysis — that a
    genuinely-different-measurability facet is isolated, and the under-annotated symptoms now carry the
    landmarks the parent row lacked."""
    cps = QB(technique="Drop-Back").checkpoints
    check("QB Drop-Back resolves 167 rows post-split (139 + 28)", len(cps) == 167, f"{len(cps)}")
    # Feet Glide: every knees-crossing fault now carries knee landmarks (the under-annotation fix)
    knee_bad = [c.row_id for c in cps if "Knees crossing" in c.fault_trigger and "Left Knee" not in c.landmarks]
    check("QB: every 'Knees crossing' fault now carries knee landmarks", not knee_bad, f"{knee_bad}")
    # FG-core rows keep feet landmarks and no longer bundle the knees/weight symptoms
    core = [c for c in cps if c.row_id in (240, 259, 315, 331, 477, 494, 516)]
    leak = [c.row_id for c in core if "Knees crossing" in c.fault_trigger or "Weight shifting forward" in c.fault_trigger]
    check("QB: 7 Feet-Glide core rows no longer bundle knees/weight", len(core) == 7 and not leak, f"core={len(core)} leak={leak}")
    # Ball Carriage: the deferred ball facet is isolated as skip-tier; hand carriage stays proxy (Partial)
    ball = [c for c in cps if "Ball drops off the chest" in c.fault_trigger]
    check("QB: 'ball drops off chest' faults are all skip-tier (deferred, isolated)",
          len(ball) == 7 and all(c.tier == "skip" for c in ball), f"{[(c.row_id, c.tier) for c in ball][:3]}")
    hands = [c for c in cps if c.row_id in (248, 254, 317, 332, 480, 495, 508)]
    check("QB: BC-hands parents stay proxy_only (Partial — upgrade deferred), no ball in fault",
          all(c.tier == "proxy_only" and "Ball drops off the chest" not in c.fault_trigger for c in hands),
          f"{[(c.row_id, c.tier) for c in hands if c.tier != 'proxy_only'][:3]}")
    # Head/Vision: gaze split off as its own proxy row; head-stability row carries no eye landmark
    gaze = [c for c in cps if c.fault_trigger.startswith("Eyes ") and "Left Eye" in c.landmarks
            and c.row_id in (1792, 1793, 1794, 1795, 1796, 1797, 1798)]
    check("QB: 7 HV-gaze children resolve as proxy_only with eye landmarks",
          len(gaze) == 7 and all(c.tier == "proxy_only" for c in gaze), f"{len(gaze)}")
    hv_head = [c for c in cps if c.row_id in (250, 262, 311, 338, 481, 497, 505)]
    check("QB: HV-head parents no longer carry eye landmarks or eye faults",
          all("Left Eye" not in c.landmarks and "eyes" not in c.fault_trigger.lower() for c in hv_head))


def test_qb_dropback_tier_filtering():
    """With QB Drop-Back now TAGGED, the resolver's tier/severity filters do real work (not the
    fail-open no-op). Untagged single-fault Drop-Back rows still fail-open through."""
    q = dict(technique="Drop-Back")
    full = {c.row_id for c in QB(**q).checkpoints}
    check("QB Hips row 249 (Advanced) present unfiltered", 249 in full)
    fund = {c.row_id for c in QB(player_tier="Fundamental", **q).checkpoints}
    check("player_tier=Fundamental hides the Advanced Hips row 249", 249 not in fund)
    check("Fundamental filter reports a real hidden count (>0)",
          QB(player_tier="Fundamental", **q).summary["tier_filter"]["tier_filtered"] > 0)
    # severity floor: Stride rows are Minor -> dropped at a Major floor; BC-ball (Critical) kept
    major = {c.row_id for c in QB(min_severity="Major", **q).checkpoints}
    check("min_severity=Major drops the Minor Stride row 238", 238 not in major)
    check("min_severity=Major keeps the Critical BC-hands row 248", 248 in major)


def main():
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass
    for fn in (test_no_verdicts, test_fail_loud_unknown_token, test_camera_view_gating,
               test_handedness_and_derived_tokens, test_formation_matching, test_row_level_exclusion_guard,
               test_wr_te_exclusion_is_noop, test_skip_rows_resolve_and_ordering,
               test_wr_from_checkpoints_v2, test_wr_phased_ordering, test_wr_unphased_ordering,
               test_wr_must_land_split_release, test_wr_must_land_catching_tier_is_actual_not_aspirational,
               test_te_from_checkpoints_v2, test_te_mixed_phase_per_variation_ordering,
               test_te_must_land_join_copy_fidelity, test_te_must_land_split_release_anchor,
               test_te_must_land_original_technique,
               test_ol_center_stance_partial_exclusion, test_ol_from_checkpoints_v2,
               test_ol_formation_specific_resolution, test_ol_center_guard_blocking_branch,
               test_ol_tackle_2point_branch, test_ol_exclusion_reported_all_positions,
               test_rb_from_checkpoints_v2, test_rb_wr_copy_fidelity, test_rb_hb_only_exchange,
               test_rb_fb_only_technique, test_rb_hb_formation_specific,
               test_db_from_checkpoints_v2, test_db_coverage_depth_distinct, test_db_all_coverages_is_wildcard,
               test_db_backpedal_position_independence, test_db_pilot_split_landed,
               test_db_tier_filtering_bites_on_real_tags,
               test_offense_wildcard_unaffected_by_all_coverages_change,
               test_player_tier_is_cumulative_unlock, test_null_tier_severity_fail_open,
               test_min_severity_floor, test_max_checkpoints_caps_by_severity_shows_in_rep_order,
               test_tier_filters_compose_and_report_total, test_tier_filters_validate_input,
               test_tier_filter_noop_on_untagged_live_data,
               test_qb_dropback_pilot_split_landed, test_qb_dropback_tier_filtering,
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
