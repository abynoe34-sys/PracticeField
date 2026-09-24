# check_type Split Worksheet — Ready-vs-Blocked, per facet

> Status: **PROPOSALS FOR REVIEW — nothing written to `checkpoints_v2`.** Every one of the
> 263 signal-bearing judge-tier rows was read individually (not pattern-matched). This worksheet
> decomposes the multi-measurement rows facet-by-facet and calls each facet **ready** (split into
> its own row + assign `check_type` now) or **blocked** (held, like the 14 OL content-gap rows and
> S2 — genuinely absent until its prerequisite exists). Mirrors the fault-tiering pilot discipline.
> Branch `fault-tiering-two-dimensional`. Last updated 2026-09-24.

## 0. The decision this encodes (owner ruling, 2026-09-24)

Not "split vs. pick." Under Layer 4's architecture — **one `check_type`, one verdict, per row,
forever** — "pick the dominant facet" does not defer the un-picked facets; it **discards them
permanently** (there is no later step where a single-verdict row grows a second verdict). That is
strictly worse than a row-count increase for a facet that is fully calculable today.

The correct axis is **ready vs. blocked, applied per facet**:

- **Ready** — the facet has real landmarks and no missing infrastructure. → **Split** it into its
  own row and assign its `check_type` now. Not premature: if two things genuinely need separate
  measurement, they were never one checkpoint (the fault-splitting principle, re-applied).
- **Blocked** — the facet needs infrastructure that does not exist. → **Hold** it. Not folded into
  a surviving row, not noted in the signal text — genuinely absent, exactly like the 14 OL
  content-gap rows and the S2 knee-flexion content. Nothing to write until the prerequisite lands.

This cannot be an automated pass (the earlier keyword classifier undercounted multi-facet 11% vs a
23% hand rate, and here it threw ~5 false positives — §7). Every row was read.

## 1. The three prerequisites that gate "blocked"

Only three distinct missing pieces produce every blocked facet in the whole slice:

| # | Prerequisite (missing) | What it blocks | Kind |
|---|---|---|---|
| **P1** | **Snap-frame reference** — pose alone cannot mark the snap; needs ball tracking or a manually-marked snap frame | any facet timed *against the snap*: first-step latency/onset, transition-timing-from-snap, hip-rotation baselined "at the snap frame", snap-to-throw tempo, "zero drop vs pre-snap" | infrastructure |
| **P2** | **Ball tracking** — no object detector for the ball | the *exact ball-release point*, and ball-security/protection facets | infrastructure |
| **P3** | **Run concept / aiming point** — deferred by owner (a play-call unknown, not infrastructure) | the "did the track match the intended aiming point" *judgment* in Exchange | report-only (measure & report, defer the verdict) |

P1/P2 are true holds. **P3 is different** — the measurement (the track/open-angle) is *ready and
reported*; only the good/bad *judgment* is deferred, via the existing conditional-note pattern.
Do not conflate "report the value, defer the verdict" (P3) with "hold, nothing to write" (P1/P2).

## 2. Scope of the split (the honest size)

Reading all 263 individually, the multi-measurement + single-but-blocked pool is **larger than the
earlier ~50–60 estimate — ~95 rows are touched.** Breakdown by disposition:

| disposition | rows | what happens |
|---|---|---|
| **Clean single-facet, ready** (the ~168 not listed below) | ~168 | assign `check_type` directly, no split — the batch that follows this worksheet |
| **Multi, all facets ready** → split into N ready rows | ~66 | Glide, Step-sequence, Finish/platform, OL-churn, the Throwing/Pocket gestalts |
| **Multi, one+ facet blocked** → split ready, hold blocked | ~16 | OL-blocking, snap-anchored transitions, release-ball rows |
| **Single-facet but wholly blocked** → hold the row | ~5 | rotation-baselined-at-snap |
| **Mild multi (primary + timing-secondary)** → judgment, §6 | ~25 (overlaps above) | Shoulder+open-timing, Exchange hip/shoulder, stance stagger+toe |

**This inflates row count materially** (see §5's granularity question) — that is the honest
consequence of compound coaching checkpoints meeting a one-verdict-per-row engine, and it is a
decision to see explicitly, not smuggle.

## 3. Archetypes — facet decomposition, ready/blocked, member ids

Each archetype's member rows were read individually and conform unless a deviation is named.
`check_type` per ready facet in **bold**.

### A. Glide (21 rows) — all facets READY
Ids: 240, 259, 315, 331, 477, 494, 516, 1806–1819 (the 14 fault-tiering split-children).
Signal: "feet glide low… low vertical oscillation… knee separation maintained (not karaoke)…
base width held… designed crossovers."

| facet | check_type | ready? | landmarks |
|---|---|---|---|
| low vertical oscillation of ankles/hips | **trend** (or stillness-inverse) | READY | ankles, hips |
| knee separation (knees not crossing) | **range** | READY | L/R knee |
| base width held | **range** | READY | ankles |
| designed crossover count/position | **ordering_window** / count | READY | feet (Layer-2 `classify_crossover`) |

→ 4 ready rows per parent. **No blocked facet.** (Granularity: 4×21 = 84 rows — see §5.)

### B. Step-sequence (7 rows) — all facets READY
Ids: 247, 257, 322, 330, 478, 493, 506. Signal: "step count, crossover count + position, and
rhythm all measurable."

| facet | check_type | ready? |
|---|---|---|
| step count | **range**/count at events | READY |
| crossover count + position | **ordering_window** | READY |
| inter-step rhythm | **trend** (interval consistency) | READY — *inter-step*, not snap-anchored, so **not** P1-blocked |

→ 3 ready rows per parent. No blocked facet.

### C. Finish / throwing-platform (14 rows) — all facets READY
Ids (hand-corrected): 233, 237, 255, 310, 323, 336, 379, 383, 489, 491, 514 (Drop-Back) +
392, 406, 413 (Pocket) + the loaded-base gestalts 438, 448, 459, 474 (Throwing).
Signal: "balanced feet, aligned hips + shoulders, weight transfer."

| facet | check_type | ready? |
|---|---|---|
| base width | **range** | READY |
| hip alignment / load | **range** | READY |
| shoulder alignment | **range** | READY |
| weight transfer / centering | **range** (hip-over-base) or **trend** | READY (force itself is a proxy — measure the COM-over-base position, not force) |

→ up to 4 ready rows per parent. **Granularity flag (§5): a coach's "are you in position to throw"
is arguably one gestalt** — but it is N *different* quantities each in its own band, which is N
`range` checks, **not** a `convergence` check (convergence tests whether N signals *agree with each
other*; here they don't — feet-width and shoulder-angle aren't the same quantity). So the honest
mapping is a genuine split, and the inflation is real.

### D. Shoulder + open-timing (8 rows) — both facets READY
Ids (hand-corrected; keyword mis-added 304): 227, 243, 324, 376, 410, 460, 486, 496, 518.
Signal: "shoulder-line angle + open-timing; avoid opening early before the throw."

| facet | check_type | ready? |
|---|---|---|
| shoulder-line angle | **range** | READY |
| open-timing (shoulders not opening early) | **strict_ordering** (shoulder-open must not lead release) | READY — anchored to **release**, which Layer 2 detects (NOT the snap, so not P1) |

→ 2 ready rows per parent. This is the clean case where a "+ timing" secondary is genuinely
ready and genuinely separate — split, don't discard.

### E. Transition + balance (per-row split — one facet P1-blocked, one ready)
Ids: 226, 241, 253, 307, 318, 334, 482, 502, 510. Signal: "transition from stance into the drop…
timing + balance/posture."

| facet | check_type | ready? |
|---|---|---|
| balance / posture through the transition | **range** (torso/base) | READY |
| transition *timing* | **strict_ordering** vs snap | **depends on anchor — read per row** |

**Per-row deviation (this is why it can't be pattern-matched):** rows that time the transition
*"after securing the snap"* (307, 318, 334, 482, 502) → timing facet is **P1-blocked** (hold).
Rows that describe transition as *movement-smoothness from the stance/catch* with no snap anchor
(226, 241, 253, 510) → timing facet is a **trend** on movement continuity, **READY**. Balance/posture
facet is READY in all 9.

### F. Rotation-baselined-at-snap (5 rows) — single facet, wholly P1-BLOCKED
Ids: 271, 340, 345, 520, 525. Signal: "angle between hip-line **at the snap frame** and its
orientation ~10-15 frames later."
One measurement (rotation magnitude), but its baseline is the snap frame → **P1-blocked**. Not a
split — **hold the row** until a snap reference exists (or the owner re-authors the baseline to
movement-onset instead of snap, which would make it READY `range` — flagged, not assumed).
*Contrast 266:* rotation measured over the *movement window*, not the snap → **READY** (see §4).

### G. Convergence-plant (6 rows) — single facet, READY, already correct
Ids: 268, 273, 342, 347, 522, 527. Signal: "plant foot heading vector vs the body's actual
subsequent movement heading — a clean plant shows them aligned." This is a textbook **convergence**
check (two signals that should agree), deliberately self-referential so it needs no play direction.
**Assign `convergence` now, no split.** (Model examples of a correctly single-facet dynamic row.)

### H. Sprint intensity (3 rows) — single facet, READY
Ids: 267, 341, 521. "Lateral displacement of Pelvis Center per frame, sustained, no deceleration."
Single **trend**, READY (relative rate; absolute speed needs scale, but the trend is judgeable).

### I. OL_Center Blocking, snap-gated (2 rows) — split ready, hold blocked
- **id 2** (Pass_Pro): base-width retention **range** READY · torso-lean (spine-flat) **range**
  READY · knee-flexion **range** READY · first-step latency **P1-blocked** · "zero drop vs pre-snap
  height" **P1-blocked** (needs the pre-snap baseline frame). → 3 ready rows, 2 held facets.
- **id 7** (Run): direction-of-travel (pelvis displacement vector) **range**/vector READY ·
  torso-lean **range** READY · first-step onset timing **P1-blocked**. → 2 ready rows, 1 held. (Also
  needs both front+side coverage — a camera-view note, already handled by the resolver, not a hold.)

### J. OL_Center churn (2 rows) — all facets READY
- **id 5**: continuous ankle churn **trend** READY · elbow-angle stability ("locked arms") **range**
  READY. ("anchor locked vs a real rusher" is unmeasurable without an opponent — a coaching caveat,
  **not a facet to hold**; drop it, don't create a row for it.)
- **id 10**: ankle churn **trend** READY · forward pelvis drive **trend** READY. → 2 ready rows.

### K. Release-ball rows (7 rows) — split ready (arm/body proxy), hold ball-point
Ids: 445, 449, 451, 466, 472 (Throwing) + 394, 399 (Pocket Escape).
- arm-path / arm-extension geometry (Throwing) → **range**/**trend** READY (the pose proxy).
- body-control / balance (Pocket Escape) → **range** READY.
- exact ball-release point / ball-security → **P2-blocked** (needs ball tracking). Hold.

### Scattered multi in "Z_other" (individually read — not clean singles)
- **266** Pocket: hip-rotation over the move **range** READY + lateral displacement **trend** READY
  (both ready; *not* snap-anchored, unlike F). Split into 2.
- **437** Throwing (airborne): torso alignment **range** READY + head stability **stillness** READY.
- **452, 462** Throwing finish: finish-direction **range** + deceleration **trend** + balance
  **range** — all READY. Split into 3.
- **454, 457** Throwing: shoulder/hip angle **range** READY + rotate-after-hips **strict_ordering**
  READY. (457 adds rotation-magnitude **range**.) 456 is the *clean single* strict_ordering
  ("hips initiate before shoulders") — no split.
- **443** Throwing takeoff: takeoff-timing (ground-departure event) **synchronisation**/ordering
  READY + directional control **range** READY.
- **440** Throwing landing: knee-flexion **range** + landing balance **range** — READY.
- **453, 463, 465** Throwing kinetic-chain: sequence timing (ground→hips) **strict_ordering** READY
  + posture **range** READY; "force" is a proxy (measure the sequence, not force — not a held facet).
- **411** Pocket: head/shoulders/hips/feet stacked → single **convergence** READY (they *should*
  agree — convergence is right here, no split).
- **404, 434** Pocket: hip angle **range** + rotation-timing **strict_ordering**(vs release) READY.
- **415** Pocket: step-size/rhythm **trend** + crossing detection **ordering_window** READY.
- **391, 395** Pocket: first-step direction **range** + balance/upper-body-stability **range**/
  **stillness** READY.
- **Exchange 278, 354, 529**: open-angle/step **range** READY + track-vs-aiming-point **P3
  report-only** (measure & report the track, defer the verdict — the conditional-note pattern).
- **Exchange 281, 283, 349, 360, 536, 539**: hip/shoulder angle **range** READY + early-opening/
  rotation-timing **strict_ordering** (vs the exchange/mesh moment) — READY if anchored to a
  pose-detectable mesh event; **flag** any that implicitly need the snap.
- **Stance 365, 542** (mild): foot-stagger distance **range** + toe angle **range** — two ready
  range facets, or one "foot geometry" row. §6 judgment (lean: keep as one `range` on stagger, the
  toe angle a second only if the owner wants it judged separately).

## 4. Row-by-row nuance that defeats pattern-matching (worked)

The load-bearing reason this had to be read individually, shown with real pairs:

- **266 vs 271** (both Pocket hip-rotation): 266 measures rotation *over the movement window* →
  READY; 271 measures rotation *"at the snap frame"* → P1-blocked. Same body part, opposite call.
- **Transition 253 vs 318**: 253 "from shotgun reception… catch + first movement connected" (no
  snap anchor) → timing READY; 318 "after **securing the snap**" → timing P1-blocked.
- **456 vs 454** (both Throwing hip/shoulder): 456 is a *single* strict_ordering (hips-before-
  shoulders) → no split; 454 bundles shoulder-angle + after-hips ordering → split into 2.
- **Rhythm: Step-sequence B vs snap-to-throw tempo**: inter-step rhythm (B) → READY; "tempo from
  **snap** through final step" (e.g. 314, 479, 500) → P1-blocked. Both say "rhythm/tempo."

## 5. The granularity question (needs an owner ruling before the write)

Applying "split every ready facet" **literally** to the archetypes yields large inflation — Glide
alone is 4 × 21 = 84 rows; Finish up to 4 × 14 = 56; the 263 signal rows could exceed ~400 after
splitting. Two sub-questions:

1. **Is a gestalt archetype one row or N?** I checked whether `convergence` collapses them: it does
   for **G (plant)** and **411 (stacking)** — genuinely "N signals should agree" → one convergence
   row. It does **not** for **Finish/platform** or **Glide-base** — those are N *different*
   quantities each in its own band, which `convergence` cannot express, so they are genuine N-way
   `range`/`trend` splits. Recommend: use `convergence` wherever the facets are the-same-quantity-
   should-agree; split the rest.
2. **Do the ~25 mild-multi "+ timing" secondaries each earn a row?** Where the secondary is a
   distinct, ready, coach-named fault (shoulder open-timing, D) — yes, split (discarding it loses
   real coaching). Where it is descriptive re-statement of the primary (stance toe-angle) — one row.
   This is the judgment §6 lists per row.

I did **not** pre-decide the inflation. The framework (ready→split, blocked→hold, convergence where
facets agree) is settled; the exact granularity per gestalt is the one thing to confirm.

## 6. Mild-multi rows needing a per-row granularity call (listed, not pre-split)
365, 542 (stance stagger+toe) · 391, 395 (first-step+balance) · 440 (landing knee+balance) ·
281, 283, 349, 360, 536, 539 (exchange angle+opening-timing) · 469 (hip rotation+timing).
Recommendation per row is in §3; none are blocked — the only question is split-into-2 vs one row.

## 7. Keyword scaffold false-positives caught by reading (evidence for row-by-row)
The archetype keyword pass mis-classified: **224** (a first-step row, not Finish), **501** (Plant),
**515** (depth) pulled into Finish by "throwing base~"; **543** (a *static* stance shoulder row)
and **304** (single-facet) pulled into the snap buckets by the words "snap"/"transition". All
excluded above by hand. A pattern-match would have split or held the wrong rows.

## 8. What I need before any write
1. **The granularity ruling** (§5): `convergence`-collapse where facets agree + genuine N-split
   elsewhere — confirm; and whether the mild-multi secondaries (§6) split or stay.
2. Then I assign `check_type` to the ~168 clean singles + the ready split-children in one pass,
   bring the exact new-row list back for a final look, and only then write to `checkpoints_v2`.

Held (unchanged): P1 snap-timing facets, P2 ball-point facets — genuinely absent, like the 14 OL
content-gap rows and S2. P3 Exchange track = measured & reported, verdict deferred.
