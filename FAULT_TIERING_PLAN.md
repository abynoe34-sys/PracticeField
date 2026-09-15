# Fault Tiering + Multi-Fault Splitting — Planning Document

> Status: **Decisions 1 & 2 approved (2026-09-14); DB pilot split EXECUTED (2026-09-15).** On branch
> `fault-tiering-two-dimensional` (stacked on the unmerged `migration-v22-checkpoints-v2-source-of-truth`).
> Steps 1–2 (schema + resolver) done; the **DB pilot** (11 `Also:` rows → 23 one-fault rows) is done
> and verified live. **migration-v24** widened `uniq_checkpoint_v2` to include `fault_trigger` — the
> pilot's decisive finding (see §4a). **Next decision point:** proceed to the QB cluster (~119 rows) or
> pause for fuller review. Whole-catalogue tagging (step 4) and calibration (step 5) remain held.

This document exists so the reasoning survives outside the conversation. It is the source of
truth for the fault-tiering effort the way `STEP4_RESOLVER_PLAN.md` was for the resolver rewire.

---

## 0. The problem, stated correctly

The catalogue bundles multiple distinct faults into a single `fault_trigger` text field, and the
calibration fields (`check_type`, `threshold_parameters`) are **one-per-row** (confirmed against
`layer4_judge.py`: a single `check_type`, a single `params` dict, a single verdict envelope). So
today only the *primary* fault of a bundled row could ever be auto-detected; the rest are
text-only — visible to a coach reading the checklist, never flagged.

Independently, surfacing every fault of a rep at once is a **coaching-effectiveness** problem, not
just a data-modelling one: a single 5-Step Gun QB rep currently carries **~29 distinct fault
clauses across 14 rows**. Cognitive-load research says dumping that many corrections at once
actively hurts learning.

### The framing correction that reshaped the design (owner, 2026-09-14)

The original hypothesis conflated **player-tier** with **cognitive-load control**. They are
different mechanisms and must not be merged:

- **`player_tier` = pedagogical readiness.** Don't coach advanced nuance before basics are owned.
  Gates *up*. It does **nothing** for volume — a beginner at `Fundamental` could still face 15
  available Fundamental-tier faults on one rep.
- **`fault_severity` = prioritisation.** How game-critical the mistake is, independent of player
  level. A Fundamental-tier fault can be Critical (turnover) or Minor (inefficiency).
- **Cognitive-load control = severity-sort + a display cap**, applied *within* what the tier
  unlocks. This — not tier — is what actually shrinks what a player sees.

**Cumulative tier semantics, and never used to hide fundamentals from advanced players.** An
experienced QB who still occasionally lunges is still committing a Critical fault; tier must never
suppress it because it "seems beneath" their level. `player_tier` unlocks upward (advanced players
see the full stack); it never subtracts downward. Volume for advanced players is handled by
severity + cap, exactly as for beginners.

---

## 1. Decision 1 — Option A (row-per-fault split), not Option B (array-of-checks). APPROVED.

Every layer assumes **one row = one checklist item = one check = one verdict** (`layer4_judge`
emits one verdict per row; `layer3_resolver` builds one `ResolvedCheckpoint` per row; the
row-level exclusion guard, phase ordering, and camera/tier gating all treat the row as an atom).

The bundled sub-faults diverge on **every** annotation axis, not just `check_type` — proven on real
rows:
- QB id 240 names "knees crossing (karaoke)" but its `pose_landmarks` are feet/ankles/heels only —
  **no knee tokens**; that fault can't be measured from the row's own annotation.
- QB id 248 bundles a `skip`-tier ball-tracking fault with a `proxy` elbow-tuck fault under a single
  `Partial`.
- DB id 1725 ("Lunging Punch") needs torso/`Sternum` tokens the row (hips + feet) lacks; DB id 1772
  is annotated for its *secondary* (eye-floating, `Partial`) while the primary lunge fault needs
  feet the row doesn't carry.

So per-fault `player_tier`/`severity` requires per-fault **landmarks, camera, and measurability**
too. Under Option B, the "array" is therefore an array of fully-formed sub-checkpoints — Option A
nested and harder to query.

| | **Option A (split) — CHOSEN** | Option B (array of sub-checkpoints) |
|---|---|---|
| tier/severity storage | two plain columns, 1:1 with the row | nested per element |
| resolver filtering | extend `match()` — one clause each | flatten sub-checks, filter *inside* rows; a row can be *partially* shown → breaks row atomicity everywhere downstream |
| Layer 4 | unchanged (one verdict/row) | must emit a *list* of verdicts; complicates the single central gate |
| exclusion guard / phase order | unchanged | must recurse to sub-row granularity |
| new engineering | **none** | Layer 4 + columns + resolver + parser + tests |
| re-annotation | **required either way** | **required either way** |

Option B pays the same re-annotation cost *plus* a code-restructuring cost and leaves every consumer
parsing nested structures, for its one theoretical advantage (no row explosion) — which evaporates
because the divergence on landmarks/camera/tier forces per-fault records regardless. **The
two-dimension tagging requirement makes A more clearly correct, not less.**

---

## 2. Schema (implemented — migration-v23)

`checkpoints_v2` already uses named Postgres enum types (`measurable_by_pose`, `camera_angle`,
`static_dynamic`, `thresholds_status`). Match that convention. Two new **nullable** columns on
`checkpoints_v2` directly — correct *because* of Option A: post-split each row is one fault, so
these are 1:1 with the row, exactly like `check_type`/`threshold_parameters` already are. (A
separate table would only make sense under Option B.)

```sql
CREATE TYPE player_tier    AS ENUM ('Fundamental','Developing','Advanced');   -- ordinal: declaration order IS the unlock order
CREATE TYPE fault_severity AS ENUM ('Critical','Major','Minor');
ALTER TABLE checkpoints_v2 ADD COLUMN player_tier    player_tier;      -- NULL = not yet triaged
ALTER TABLE checkpoints_v2 ADD COLUMN fault_severity fault_severity;   -- NULL = not yet rated
```

### NULL handling — deliberately opposite to `measurable_by_pose`, and why that is consistent

- `measurable_by_pose` NULL → **fail-closed** (row excluded). The row literally can't be safely
  processed; excluding is the only safe move.
- `player_tier` / `fault_severity` NULL → **fail-open** (row still surfaces). The content is fully
  valid and usable — just untagged on one extra dimension. Hiding real, correct coaching content
  because nobody has reached the tagging pass yet would be the actual danger.

Different risk profiles → correctly opposite defaults. This asymmetry is built in deliberately, not
copied reflexively from the existing guard.

### §4a — migration-v24: the DB-level one-fault-per-phase constraint (pilot finding)

The DB pilot hit a unique constraint the earlier investigation hadn't seen:
`uniq_checkpoint_v2 UNIQUE (group_name, position, technique, variation, formation, phase,
ideal_execution_standard)` — **`fault_trigger` is not in the key**. So the catalogue's identity model
was *one checkpoint per (phase + ideal)*: the one-fault-per-row assumption from Layer 4 and the
resolver, baked one level deeper as a **database invariant**. Split children share a phase and the
shared phase-level IES, so they collided on this key. This is the single most valuable thing the DB
pilot bought — found cheap, before the QB cluster.

Resolved by **migration-v24**, widening the key to `(…, ideal_execution_standard, fault_trigger)`:
one phase can have one correct ideal and several independent ways to fail it (proven by row 1772).
Verified safe on live data before applying: widening a unique key is strictly more permissive (can
only allow rows the old key rejected — same tuple, different fault; a *true* full duplicate still
collides); 0 existing rows violated the widened key; max key size 1073 bytes « the ~2704-byte btree
limit. It applies identically to the QB cluster.

**IES handling (favorable for phased rows, a caveat for QB):** because these DB rows are
phase-structured with a phase-level IES, split children **share the parent's phase + IES** — no
per-fault IES had to be invented (which would have meant authoring near-duplicate content just to
satisfy a constraint, the mistake Option 2 in the constraint decision would have forced). QB
Drop-Back rows are largely *unphased*, so their IES handling on split may not have this luxury —
expect it to be harder there.

---

## 3. Resolver design (implemented)

`resolve()` gains three optional parameters; the tier/severity axis is **orthogonal** to
formation/wildcard/readiness, so none of that machinery is reworked:

- **`player_tier`** (viewer level) → keep a row iff `row.player_tier <= player_tier` **or**
  `row.player_tier IS NULL` (fail-open). Beginner (`Fundamental`) sees only Fundamental faults;
  Advanced sees the full stack. Cumulative, monotonic.
- **`min_severity`** → optional floor (e.g. `Critical`+`Major` only).
- **`max_checkpoints`** → the cognitive-load lever: after tier-filter and severity-*sort*, cap to
  top-N.

**Honest reporting (same discipline as the row-level exclusion guard).** Tier/severity/cap omission
is a *different* reason from "unannotated" and is reported *separately* in `summary`
(`tier_filtered`, `severity_filtered`, `capped`), so a checklist trimmed for a beginner **never
looks like the complete picture**. `skip`-tier and camera not-assessable logic still run on whatever
survives the filter.

**Interactions confirmed clean:** `_formation_ok`/`WILDCARD_FORMATIONS` untouched; the exclusion
guard runs first (a fault that is unannotated is excluded before tier/severity apply); ordering
(`phase_order` → `row_id`) unchanged; the `contains_verdicts: False` invariant preserved.

---

## 4. Scope — two separate large efforts (owner emphasis, 2026-09-14)

This is **not one undertaking**. Have the full picture before committing.

### Effort 1 — the split: 93 rows → ~264 fault-rows (net +171)

**Explicit `Also:` rows (51 rows, 52 secondary faults):**
- WR (17): 709, 720, 723, 729, 777, 825, 830, 838, 845, 858, 864, 875, 931, 945, 961, 967, 973
- TE (17): 1061, 1072, 1075, 1081, 1283, 1331, 1336, 1344, 1351, 1364, 1370, 1381, 1437, 1451, 1467, 1473, 1479
- DB (11): 1608, 1695, 1724, 1725, 1729, 1730, 1744, 1747, 1752, 1755, 1772  *(1725 has two `Also:` → 3 faults)*
- RB (6): 1087, 1098, 1101, 1107, 1165, 1218

**QB enumerated rows (no `Also:`; sentence-enumerated — 42 rows, ~161 fault clauses, all Drop-Back):**
219, 220, 240, 243, 247, 248, 254, 257, 258, 259, 267, 268, 271, 273, 315, 317, 322, 324, 330, 331,
332, 335, 340, 342, 346, 347, 477, 478, 480, 486, 493, 494, 495, 496, 506, 508, 516, 518, 520, 522,
526, 527  *(14 are "dense" — ≥4 faults, up to 7)*

The rest of the catalogue (~1,061 rows, incl. all OL) is genuinely single-fault and untouched by
the split.

**This is an annotation pass, not a data migration.** Per split child, the mechanical part (text
split, `measurable_signal` — which already enumerates sub-signals) is a head start, but
`pose_landmarks` (sometimes need *adding* — the knee/sternum/feet gaps), `measurable_by_pose`
(bundled faults mix tiers), and `camera_angle` (Front↔Side splits) must be re-derived per fault.
The QB Drop-Back cluster (~119 new rows) is the heavy lift and the most landmark-divergent.
Post-split catalogue ≈ **1,785 rows**; snapshot + DB tests regenerate (live-not-circular).

### Effort 2 — the tagging: ~1,785 rows, the WHOLE catalogue

`player_tier`/`severity` tagging is **not limited to the split rows** — it is *every* checkpoint,
including OL's already-clean single-fault content and everything never bundled. A second,
comparably large undertaking layered on the first. Severity is faster (consequence language is
explicit in the text); player-tier needs more SME judgment.

**Splitting is necessary but not sufficient for the cognitive-load goal.** It makes the raw count
*worse* for that 29-clause rep (→ ~29 rows) until Decision 2's severity-sort + cap is applied. The
filters deliver the fix; the split only enables it.

---

## 5. Strawman tier/severity values (for review — grounded in real fault content)

**`player_tier` — 3 tiers, cumulative "unlock":**

| Tier | Meaning | Grounded example |
|---|---|---|
| **Fundamental** | Owned before anything else; universal to the position | "brace your core before the snap" (OL 211); two-hand ball security; "don't stand too tall" (OL 126) |
| **Developing** | Real technique; assumes basics are owned | kick-slide depth vs. a speed rusher; route-break footwork |
| **Advanced** | Nuance/timing that only matters once technique is clean | QB "the ONE designed crossover — knees not crossing karaoke-style" (240); head-turn "at the visual snap, not during the breakdown" (TE 1414) |

**`fault_severity` — 3 tiers, independent of player level:**

| Severity | Meaning | Grounded example (verbatim consequence language) |
|---|---|---|
| **Critical** | Turnover / score / sack-causing; blows the assignment | "critical turnover fumbles" (OL 14); "biting on play-action… easy touchdown" (DB 1722); "muffed fumble" (RB 1172); "strip it from behind" (TE 1057) |
| **Major** | Loses the rep — beaten, separation/leverage surrendered | "erase the cushion completely" (DB); "tells the defender exactly when the break is coming" (WR 961) |
| **Minor** | Inefficiency / tell / recoverable | "raises your pad level" (DB 1728); "extra beat of warning" (TE 1414); "heavy heel contact or wasted movement" (QB 240 sub-fault) |

Content supports 3 cleanly; not obviously 5. Severity is the more objective/faster axis to tag.
Both nullable until triaged.

---

## 6. Approved sequencing (owner, 2026-09-14)

1. **Approved & DONE:** steps 1–2 — ratify enums/columns (migration-v23), implement the resolver
   parameters + honest reporting, verify against *current* data (all-NULL → fail-open no-op) before
   any splitting.
2. **DONE (2026-09-15):** the DB pilot — worksheet (`FAULT_TIERING_DB_WORKSHEET.md`) + the actual
   split of DB's 11 `Also:` rows → 23 one-fault rows on live `checkpoints_v2`, verified live,
   snapshot regenerated, tests updated (resolver 209/209, cleaning 28/28). **Surfaced migration-v24**
   (see below) — the pilot's whole point, caught cheap before the QB cluster.
   **→ DECISION POINT: proceed to QB cluster, or pause for fuller review.**
3. **Held (approved in principle):** the rest of the split (QB cluster ~119 rows + the remaining 42
   `Also:` rows across WR/TE/RB); regenerate snapshot + tests each time.
4. **Held:** tag `player_tier`/`severity` across the catalogue (severity first).
5. **Held:** author `check_type`/`threshold_parameters`/calibration on the now-atomic rows.

Nothing beyond steps 1–2 + the DB worksheet is implemented until reviewed.
