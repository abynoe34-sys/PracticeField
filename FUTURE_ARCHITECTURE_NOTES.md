# Future Architecture Notes

> **Documentation only — forward-vision, nothing to act on now.** Captures ideas discussed with the
> project owner that are deliberately *not* on the current critical path (check_type assignment →
> calibration). No `checkpoints_v2` writes, no schema changes, no urgency. Each idea is kept
> separate because they have different prerequisites and different blockers. Last updated 2026-09-24.

---

## 1. End-to-end technique chaining (one continuous rep, not four checklists)

**The idea.** Analyze a full rep — **Stance → Drop-Back → Pocket Movement → Throwing** — as *one
continuous motion*, rather than four independent per-technique checklists stitched together after
the fact.

**Prerequisites (all three, in order):**
1. **Continuous footage of a whole rep** — a single clip spanning stance through release, *not*
   per-technique clips. This is a real divergence from what is currently being planned for
   calibration footage (which is per-technique). Flagged so the footage plan can account for it if
   this is ever pursued — but it is a *later* need, not a change to the current calibration plan.
2. **Automatic phase segmentation within that footage** — detecting where one technique ends and the
   next begins inside the continuous stream. (Layer 2 already detects phases within a technique; this
   is the cross-technique extension.)
3. **Every individual technique already calibrated and producing real verdicts on its own first.**
   This is the hard gate. Chaining is not a substitute for per-technique calibration — it sits *on
   top of* it. **This idea does not compete with the current check_type / calibration work; it is
   gated entirely behind it.**

**The valuable new layer, once possible: cross-technique causal analysis.** e.g. *does a weak stance
explain a late first step in the drop-back?* — reasoning across technique boundaries, not just
grading each in isolation. This is the same *shape* of insight as the OL Blocking
base-width/hip-depth/knee-bend dependency (§3), one level up: a fault in an earlier link causing a
fault in a later one. The coaching value is the causal chain, not the individual verdicts.

---

## 2. One-on-one / multi-person analysis (a relationship between two players)

**The idea.** Analyze a matchup as a *real relationship between two tracked players* — OL vs. DL
leverage, DB vs. WR route-mirroring — not as two independent single-person checks run side by side.

**This limitation is already flagged in the live catalogue today.** Several annotated rows note that
single-subject pose tracking cannot see a second person. Concrete example already sitting in
`checkpoints_v2` — the OL Blocking "defender framed between the knees" annotation, in substance:
*there is no real defender in this simulated rep, and even with one, single-subject pose tracking
doesn't register a second person's position.* So this is not a hypothetical gap — the catalogue
authors have already run into it and documented it in place.

**Prerequisites:**
1. **Two-person tracking with correct player-identity separation** — keeping "this is the OL, that is
   the DL" stable across frames.
2. **Occlusion handling at contact** — the moment two bodies overlap in frame. This is simultaneously
   the *hardest* tracking case and the *most important moment to measure* (leverage/contact is the
   point of the rep). The hard problem lives right where the value is.
3. **Different footage** — paired reps, likely a different camera setup, than solo-drill footage.

**The encouraging part (worth stating plainly): the comparison itself is not new math.** Once two
clean, correctly-separated pose streams exist, `synchronisation` and `correlation` — **already in the
Layer 4 check_type registry** — generalize naturally from "two signals within one person" to "two
signals across two people" (e.g. correlating a WR's break with a DB's reaction; synchronising a
DL's hands with an OL's punch). **The hard problem is upstream (clean multi-person tracking), not
downstream (the comparison).** No new check-type family is needed for the relationship layer — only
for getting two clean signals to compare.

---

## 3. Pointer: `correction_strategy` causal-dependency note

*(Minimal pointer — the working copy of this note lives in `CHECK_TYPE_SPLIT_WORKSHEET.md` §6.
Repeated here only so the forward-vision file is self-contained.)*

When `correction_strategy` authoring eventually starts, the OL Blocking pass-set fundamentals
(**base width / hip depth / knee bend**) are mechanically **coupled**, not independent: a flat-back
failure can be *caused by* insufficient hip depth or narrow knees. A good coach would say **which to
fix first** rather than flagging all three. Layer 4 has no dependency logic, and the check_type work
deliberately keeps these as three independent checks — the causal ordering is a
`correction_strategy`-layer concern, to be authored then. This is the same causal-chain shape as
ideas §1 and §2 above, at the within-technique scale. Just a pointer so it isn't lost — nothing to
act on now.
