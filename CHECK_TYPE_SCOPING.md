# check_type Assignment — Scoping Worksheet

> Status: **SCOPING ONLY — nothing assigned to `checkpoints_v2` yet.** Real numbers + a
> sample + a rubric, produced before any bulk write, mirroring the fault-tiering discipline.
> Standing rule for every phase below: **no writes to `checkpoints_v2` until a slice is
> ratified.** Last updated 2026-09-23 (branch `fault-tiering-two-dimensional`).

## 0. What this is

Layer 4 (`service/dynamic/layer4_judge.py`) evaluates each checkpoint through exactly **one of
9 check types** (`REGISTRY`), and — only on a `Calibrated` row — judges it. Before any
threshold can be calibrated, each row needs its `check_type` assigned: you cannot tune a
threshold until you know *which of the 9 measurement patterns* applies. `check_type` assignment
is therefore the one calibration-groundwork piece that is fully startable now with **zero
footage dependency**.

**Scope: the 1,027 judge-tier rows** — `measurable_by_pose IN ('Yes','Needs Motion')`. These
are the rows where a real pose measurement genuinely exists to classify. (`Partial` = proxy-only,
`No`/NULL = out of scope for judging.)

`check_type` assignment doubles as the **input-contract spec for the (unbuilt) per-row
extractor**: the check type dictates exactly which `inputs` keys the extractor must supply
(see §5). It is not just a tag — hold it to that rigor.

## 1. Step-0 cross-tab (live, 2026-09-23) — clustering is PARTIAL

Coarse partition of the 1,027:

| measurable_by_pose | static_dynamic | n |
|---|---|---|
| Yes | Dynamic | 627 |
| Needs Motion | Dynamic | 250 |
| Yes | Static | 150 |

**`measurable_by_pose="Yes"` is NOT a static proxy** — 627 `Yes` rows are Dynamic.
`static_dynamic` is the load-bearing axis for check-type family, not `measurable_by_pose`.

Per-technique judge-tier counts + axis homogeneity:

| technique | judge rows | Yes | Needs Motion | Static | Dynamic |
|---|---|---|---|---|---|
| Blocking | 185 | 180 | 5 | 19 | 166 |
| Routes | 175 | 163 | 12 | 0 | 175 |
| First Step | 143 | 140 | 3 | 2 | 141 |
| Release | 131 | 131 | 0 | 1 | 130 |
| Stance | 128 | 126 | 2 | 126 | 2 |
| Drop-Back | 125 | 0 | 125 | 0 | 125 |
| Pocket Movement | 53 | 0 | 53 | 0 | 53 |
| Throwing | 33 | 0 | 33 | 0 | 33 |
| Cuts | 20 | 16 | 4 | 0 | 20 |
| Exchange | 15 | 6 | 9 | 2 | 13 |
| First 5 Yards | 13 | 9 | 4 | 0 | 13 |
| Catching | 6 | 6 | 0 | 0 | 6 |

**Verdict — clustered enough for archetype-batch assignment, NOT row-by-row idiosyncratic,
but with a real judgment middle + a multi-facet tail:**
- **Clean clusters (bulk-assignable by pattern):** Stance (128, ~all Static) → `range`;
  Drop-Back / Pocket / Throwing (211, all Needs-Motion/Dynamic) → the temporal family.
- **The judgment middle (~630, Yes/Dynamic — Blocking / Routes / First Step / Release):**
  needs archetype-level reading, because a "Dynamic" row is very often still **`range`
  measured at a detected event frame** (a knee angle at the plant), not a temporal type.
  **"Dynamic ≠ not-range"** is the key subtlety.

Sits between the DB pilot (all-split) and the QB pilot (mostly-tag), same as fault-tiering.

## 2. Headline finding — `measurable_signal` is empty on 74% of judge-tier rows

**Only 263 / 1,027 rows carry a `measurable_signal`** (the field stating *what* is computed).
The other **764 are empty** — their only description is the prose `ideal_execution_standard`
("Torque the upper chest toward the ball," "Pads stay low and rise gradually").

Consequence: for those 764, `check_type` must be **inferred from qualitative coaching prose**,
which means assigning it is **entangled with authoring `measurable_signal`** — to call a row
`range` you are implicitly deciding "measure knee angle at the plant frame, in [110,130]°."
This is heavier than fault-tiering's tagging. The **263 signal-bearing rows** (the QB/OL
fault-tiering enrichment) are where `check_type` is assignable at high confidence today.

## 3. Estimated per-check-type distribution (from the sample; exact counts = the classification pass itself)

Honest bands, not false precision — the exact numbers *are* the work being scoped:

| check_type | rough share | where it lives |
|---|---|---|
| **range** | **dominant (~half+)** | all Stance; knee/elbow angle, lean, pad height, base width, hand position, alignment angle — incl. range-at-an-event on dynamic rows |
| **trend** | common | "rise gradually," "constant speed," continuous "churn," lateral velocity |
| **strict_ordering** / **synchronisation** | common | first-step latency vs snap, step sequence, timing |
| **stillness** | modest | "head stable," "minimal vertical," lower body doesn't break |
| **cross_phase** | small | a value maintained / drifting across two phases |
| **convergence** | small | several joints aligned together |
| **ordering_window** | small | which of two near events is first |
| **correlation** | rare | two-series coupling (arm-pump vs leg-drive rhythm) |
| **none / multi-facet** | real tail (see §6) | compound or non-quantitative standards |

## 4. THE PARAMETER-SCOPING PRINCIPLE (load-bearing — do not violate)

> **`check_type` is cheap and generalizes by archetype. `threshold_parameters` are
> position / variation / formation-specific and must NEVER be copied across positions.**

A pattern that looks uniform at the check-type level can hide real position-specific
differences underneath — the same shape of lesson as fault-tiering's "same fault name,
different mechanism" cases (OL 68 "Sticking the Cleats" pass-pro footwork vs RB 1182 knee-twist
injury). Surfaced explicitly here **before** it could cause a bad bulk assignment.

**Worked evidence — the OL "Stagger" check (verified live 2026-09-23, all 5 OL positions):**
the check type is `range` (a stagger *distance* in [min,max] at the set frame) for **every** OL
Stance row — so the *type* generalizes. But the *bounds* are completely position-specific, and
the data is correctly scoped (no content bug found):

| position | stagger standard (verbatim) | `range` params (illustrative, uncalibrated) | row IDs |
|---|---|---|---|
| OL_Center | "0-inch stagger — a perfectly parallel base" | min=0, max≈0 (any offset = fault) | 12, 19, 59, 60 |
| OL_Left Guard | left foot back 3–4 in / 4–6 in (toe→right instep) | ~3–6 in | 76, 82, 122, 123 |
| OL_Right Guard | right foot back 3–4 in / 4–6 in (toe→left instep) | ~3–6 in | 562, 568, 608, 609 |
| OL_Left Tackle | left foot back 10–16 in (toe behind right heel) | ~10–16 in | 148, 154, 160, 167, 207, 208, 213, 214 |
| OL_Right Tackle | right foot back 10–16 in (toe behind left heel) | ~10–16 in | 635, 640, 646, 652, 693, 694, 699, 700 |

Note the fault triggers encode **opposite** failure modes by position: Center — *any* stagger is
the fault (exchange-fumble risk); Tackle — *too little* stagger is the fault (edge speed-rush).
Copying one `range` bound across OL would have been silently wrong. Had "0-inch stagger" been the
single rule, it would have mis-graded every Guard and Tackle. This is exactly why calibration is
per-row, not "tune 9 things": the 9 is the count of computational *patterns*, not of parameter sets.

## 5. The 9 check types — input contract each imposes on the extractor

`CheckSpec = (compute, judge, required_params)`. `compute(inputs, params) -> (measured,
missing_inputs)`. The `inputs` keys are the contract the per-row extractor must supply, already
in the correct frame/scale (WORLD within one tracked object; IMAGE between two; never Z; scale
in shoulder-widths / torso-lengths). `judge` runs only on `Calibrated`.

| check_type | measures | extractor `inputs` keys | threshold params |
|---|---|---|---|
| range | scalar in [min,max] at one frame | `value` (+ optional `unit`) | `min`, `max` |
| trend | direction + smoothness of a series | `series` | `expected_direction`, `smoothness_floor` |
| synchronisation | two events fire within N frames | `frame_a`, `frame_b` | `max_offset_frames` |
| stillness | max frame-to-frame displacement over a window | `series` (numbers or coord tuples) | `max_displacement` |
| cross_phase | drift of a value between two phases | `value_phase1`, `value_phase2` | `max_drift` |
| convergence | spread of N≥2 signals (+ outlier) | `values` (dict) | `max_spread` |
| correlation | normalized cross-corr + best lag of two series | `series_a`, `series_b` (+ opt `max_lag_frames`) | `min_correlation`, `expected_lag_range` |
| ordering_window | which of two near events is first | `frame_a`, `frame_b` | `expected_first` |
| strict_ordering | B leads A by ≥ min_gap (signed b−a) | `frame_a`, `frame_b` | `min_gap_frames` |

## 6. Ambiguity buckets to expect and NOT force

1. **Multi-facet rows — the fault-bundling analog.** Some IES bundle two measurements:
   Throwing "maintain torso alignment **while** head stable" = `range` + `stillness`; Catching
   "torque the chest **without breaking** the lower body" = `range`(rotation) + `stillness`(lower
   body). **Layer 4 is one `check_type` per row** (one verdict/row). So each such row must either
   pick a dominant facet **or be split** — exactly the QB/DB split decision, with the same per-row
   ratification. Biggest downstream risk; expect a nonzero split count.
2. **The "none of the 9" bucket.** Likely *smaller* than first feared within judge-tier (a
   `Yes`/`Needs-Motion` tag already asserts a pose scalar exists, which usually implies a
   `range`), but real for compound/qualitative standards that don't reduce to one quantity.
   Treat as a held finding (S2-style), not a forced fit.

## 7. Proposed rubric — worked examples from the real sample

| row (IES / signal) | proposed check_type | reasoning | conf. |
|---|---|---|---|
| Stance/OL "0-inch stagger; horizontal distance between rear & front foot ground-contact" | range | scalar distance in [min,max] at set frame | High |
| Release/WR "drive leg holds 110–130°" | range | textbook angle-in-bounds | High |
| First Step/WR "pads stay low and rise **gradually**" | trend | pad height increasing + smooth | High |
| Blocking/OL "first-step latency: frame offset between snap and first ankle displacement" | strict_ordering | B(step) must follow A(snap) by ≥ gap | High |
| Pocket/QB "lateral displacement of Pelvis Center per frame, continuously" | trend | velocity trend over series | Med-High |
| Blocking/OL "continuous ankle churn, feet never stop" | trend (vs stillness-inverse) | sustained movement — flag | Med |
| Cuts/RB "drop hip level low on the step **before** the cut" | range (hip height @ pre-cut frame) *or* ordering_window | scalar-at-event vs before/after | Med — flag |
| Throwing/QB "torso alignment **while airborne**, head stable" | range + stillness | **multi-facet → split/pick** | Flag |
| Catching "torque chest without breaking lower body" | range + stillness | **multi-facet → split/pick** | Flag |

## 8. Sequencing

- **Start with the 263 signal-bearing rows** — `check_type` is assignable at high confidence
  there (the computation is already stated), and it validates the rubric before touching the
  764 that need the signal inferred/authored. Recommended first ratification pilot.
- **`Needs Motion` rows (250) are doubly-blocked** once assigned: their extractor needs *both*
  calibration footage *and* the still-unwired dynamic pipeline (Layer 1–4 is not in the deployed
  service). Assign their `check_type` (it's definable), but they're least immediately actionable;
  the ~527 `Yes` rows are the nearer-term calibration surface.
- **Footage** is the standing external bottleneck (owner-side): blocks none of the above, but
  nothing calibrates to real numbers until it exists.

## 9. Sample-set ratification method

Stratify the ratification sample by `(position × technique)` **and** `(measurable_by_pose,
static_dynamic)` — not just "representative" — so the big families (QB Drop-Back, Blocking,
Routes) don't dominate and the dynamic rows get real coverage. Report per-check-type counts +
the multi-facet/none flags for a slice before any bulk assignment.
