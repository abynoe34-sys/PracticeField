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


# ── 8. WR still resolves from the legacy JSON (no regression) ─────────────────────
def test_wr_legacy_json():
    wr = L3.resolve("WR")
    check("WR source is legacy_json", wr.summary["source"] == "legacy_json")
    check("WR resolves its full catalogue (281)", wr.summary["total"] == 281, f'{wr.summary["total"]}')


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


def main():
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass
    for fn in (test_no_verdicts, test_fail_loud_unknown_token, test_camera_view_gating,
               test_handedness_and_derived_tokens, test_formation_matching, test_not_migrated_guard,
               test_skip_rows_resolve_and_ordering, test_wr_legacy_json,
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
