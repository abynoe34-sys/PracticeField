# DB `Also:` Split Worksheet — the 11 rows (validation pilot for Option A)

> Purpose: validate the **split-and-reannotate workflow** on the smallest, most-recently-verified
> position (DB, 11 `Also:` rows → 23 fault-rows) BEFORE committing to the QB cluster (119 rows) or
> the full 93-row set. See `FAULT_TIERING_PLAN.md` §6 step 2.
>
> **EXECUTED 2026-09-15.** All 11 rows split into 23 one-fault rows on live `checkpoints_v2`
> (parents keep their ids 1608/1695/1724/1725/1729/1730/1744/1747/1752/1755/1772; children are
> new ids 1780–1791). Verified live: DB 126→138 (Corner 70 / Nickel 23 / Safety_Free 24 /
> Safety_Strong 21), 0 `Also:` remaining, all 23 rows carry the annotation below. Snapshot
> regenerated from live; resolver suite 209/209, cleaning 28/28.
>
> **The pilot's decisive finding — a DB-level blocker the estimate could not have predicted:**
> a unique constraint `uniq_checkpoint_v2 (group,position,technique,variation,formation,phase,
> ideal_execution_standard)` bakes in one-checkpoint-per-phase — `fault_trigger` is NOT in the key.
> Split children share phase + the shared phase-level IES, so they collided. Resolved by
> **migration-v24** widening the key to include `fault_trigger` (verified safe: widening a unique key
> can only allow more distinct rows, never permit a true full duplicate; 0 existing violations;
> key size 1073 « the 2704-byte btree limit). This is the same one-fault-per-row assumption from
> Layer 4 and the resolver, found one level deeper — and it will apply to the QB cluster too.
>
> The below was the pre-execution proposal. Landmark/camera/tier
> proposals and every `player_tier`/`fault_severity` are first-pass, SME-confirmable. The point of the
> pilot is to surface how much of the split is mechanical vs. real re-derivation — and it already shows
> the answer: **splitting is not a reshuffle.** 5 of the 11 rows need landmark tokens ADDED, several
> need a camera flip (the primary is Front but the secondary is a Side measurement), and one (1772) is
> annotated for its *secondary* fault, so the primary needs new landmarks.

Legend per child — **KEEP** = current row's landmarks cover it; **ADD** = needs tokens not on the row;
**CAM** = proposed camera differs from the current row; `mbp` = proposed `measurable_by_pose` tier.
`PT` = strawman player_tier, `SEV` = strawman fault_severity.

Current-row landmark sets (for reference): most First-Step rows carry `[Foot, Foot, Hip, Hip]`; the
outliers are noted inline.

---

### 1608 — DB_Safety_Strong / Stance / All Coverages · **Front** · mbp Yes · `[L/R Foot, L/R Foot Index]`
- **A (primary): "Linebacker Creep"** — stance too wide/flat, hands on thighs, locks the feet.
  Stance width + flatness → `[L/R Foot, L/R Foot Index]` **KEEP** (feet width, Front). *Hands-on-thighs is a hand/wrist cue — leave as coached text, not a landmark check.* · mbp Yes · **PT Fundamental · SEV Minor** (delay, not a score).
- **B (Also): "Over-Staggering"** — feet too far apart front-to-back, traps the hips.
  Front-to-back stagger is a **Side** measurement → `[L/R Foot, L/R Hip]` **ADD hips + CAM Side** · mbp Yes · **PT Developing · SEV Minor**.

### 1695 — DB_Corner / First Step / Man · **Side** · mbp Yes · `[L/R Foot, L/R Hip]`
- **A: "Sprinting Out Early"** — turning/running deep on the snap. Movement direction/timing → **KEEP** (Side) · mbp Yes · **PT Developing · SEV Major**.
- **B (Also): "Flat Feet"** — static at 10 yds, no movement as the cushion is erased. Stillness of feet → **KEEP** (feet, Side) · mbp Yes · **PT Fundamental · SEV Major**.

### 1724 — DB_Safety_Free / First Step / Cover 3 · **Side** · mbp Yes · `[L/R Foot, L/R Hip]`
- **A: "Over-Sprinting Early"** — same shape as 1695-A → **KEEP** (Side) · mbp Yes · **PT Developing · SEV Major**.
- **B (Also): "False Stepping Forward"** — a step forward at the snap surrenders the high cushion. First-step direction → **KEEP** (feet, Side) · mbp Yes · **PT Fundamental · SEV Major**.

### 1725 — DB_Safety_Strong / First Step / Cover 1 · **Front** · mbp Yes · `[L/R Hip, L/R Foot]` — **THREE faults**
- **A: "Biting on Play-Action"** — flowing downhill into a run gap; the TE slips behind. Downhill body movement → `[L/R Hip, L/R Foot]` **KEEP** but the downhill read is really **Side** → **CAM Side** · mbp Yes · **PT Developing · SEV Critical** (pop-pass TD).
- **B (Also 1): "Giving Up the Inside Lane"** — hips turning outward too early. Hip rotation → `[L/R Hip]` **KEEP** (Front/Both) · mbp Yes · **PT Advanced · SEV Major** (leverage nuance).
- **C (Also 2): "Lunging Punch"** — upper torso thrown forward, weight past the toes, off-balance. Torso lean / COM → needs `Sternum` (+ `L/R Shoulder`) with feet → **ADD Sternum/Shoulders + CAM Side** · mbp Yes · **PT Developing · SEV Major**.

### 1729 — DB_Nickel / First Step / Cover 2 · **Front** · mbp Yes · `[L/R Foot, L/R Shoulder]`
- **A: "Bailing Deep on the Snap"** — dropping straight backward, opening the flat. Backward depth → `[L/R Foot]` (+ hips) **CAM Side** (depth is a Side read) · mbp Yes · **PT Developing · SEV Major**.
- **B (Also): "Turning the Back to the Sideline"** — hips/shoulders open fully outward, killing peripheral vision. Shoulder/hip rotation → `[L/R Shoulder]` **KEEP** (hips would strengthen; Front/Both) · mbp Yes · **PT Advanced · SEV Major**.

### 1730 — DB_Nickel / First Step / Cover 3 · **Side** · mbp Yes · `[L/R Foot, L/R Hip]`
- **A: "Chasing Crossers Out of the Zone"** — turning to chase, opening a void. Direction change → **KEEP** (Side) · mbp Yes · **PT Developing · SEV Major**.
- **B (Also): "Squatting Early"** — freezing on an underneath route, a vertical flies over. Stillness/no depth → **KEEP** (feet, Side) · mbp Yes · **PT Developing · SEV Major**.

### 1744 — DB_Safety_Free / First Step / Man · **Front** · mbp Yes · `[L/R Foot, L/R Hip]`
- **A: "Losing the Shade"** — improper approach angle lets the WR cross your face. Approach angle → **KEEP** (Front/Both) · mbp Yes · **PT Advanced · SEV Major** (leverage).
- **B (Also): "Flat Feet"** — static as the cushion is erased. Feet stillness → **KEEP** (feet; Side/Both) · mbp Yes · **PT Fundamental · SEV Major**.

### 1747 — DB_Safety_Strong / First Step / Man · **Front** · mbp Yes · `[L/R Foot, L/R Hip]`
- **A: "Guessing the Release"** — lunging before the WR declares. Premature lateral movement → **KEEP** (Front) · mbp Yes · **PT Developing · SEV Major**.
- **B (Also): "Rising on the Snap"** — standing tall, pad level up. Vertical pad-level rise → hips present but `Sternum`/`Shoulder` sharpen it → **ADD Sternum (optional) + CAM Side** · mbp Yes · **PT Fundamental · SEV Minor**.

### 1752 — DB_Nickel / Stance / All Coverages · **Side** · mbp Yes · `[L/R Hip, L/R Knee, Nose, Sternum]`
- **A: "Stance Too Deep or Tall"** — high chest reduces lateral acceleration. Pad-level/chest height → **KEEP** (rich set, Side) · mbp Yes · **PT Fundamental · SEV Minor**.
- **B (Also): "Bending at the Waist"** — upper body forward over the knees, weight on toes. Torso lean (spine) → **KEEP** (`Sternum`+`Hip`+`Knee`, Side) · mbp Yes · **PT Fundamental · SEV Minor**.
- *(The one row where BOTH children are fully covered by the existing landmarks — the "easy" case.)*

### 1755 — DB_Nickel / First Step / Man · **Front** · mbp Yes · `[L/R Foot, L/R Ankle]`
- **A: "Losing Pad Level"** — rising up out of the stance. Vertical rise = pad level → needs `L/R Hip` (feet/ankles alone can't see torso height) → **ADD hips + CAM Side** · mbp Yes · **PT Fundamental · SEV Minor**.
- **B (Also): "Bailing Deep Immediately"** — turning/running deep at the snap. Backward depth → `[L/R Foot]` **KEEP + CAM Side** · mbp Yes · **PT Developing · SEV Major**.

### 1772 — DB_Nickel / First Step / Cover 1 · **Front** · **mbp Partial** · `[L/R Hip, Nose, L/R Eye]`
- **A: "Guessing the Release"** — lunging before the WR declares. Lateral premature movement → needs `L/R Foot` (the row has no feet!) → **ADD feet** · mbp **Yes** (movement is fully pose-visible, unlike the eye fault) · **PT Developing · SEV Major**.
- **B (Also): "Eye Floating"** — looking at the WR's head/eyes, biting on head fakes. Gaze proxy (head orientation) → `[Nose, L/R Eye]` **KEEP** (Front) · mbp **Partial** (gaze not fully measurable) · **PT Advanced · SEV Minor**.
- *(The starkest case: the row's current landmarks + `Partial` tier are tuned to the **secondary** eye fault. The primary lunge fault would be a separate `Yes`-tier movement check on feet the row doesn't carry — proof that "one row, one tier/camera/landmark set" genuinely can't hold both.)*

---

## What the pilot establishes (numbers for the go/no-go on scaling to QB)

- **11 rows → 23 fault-rows** (net +12; 1725 yields 3).
- **Landmark ADD required:** 5 of 11 rows (1608-B, 1725-C, 1747-B, 1755-A, 1772-A) — ~45%. Not a reshuffle.
- **Camera flip required:** ~7 children move Front→Side (depth/lean/pad-level are Side reads authored onto a Front row).
- **Tier (mbp) split within a row:** 1772 (primary `Yes` vs secondary `Partial`) — confirms the collapse the plan predicted.
- **Fully-covered "easy" splits:** only 1752 (both children) + several First-Step primaries.
- **Severity spread (strawman):** 1 Critical (1725-A), ~13 Major, ~9 Minor — the consequence language separates cleanly.
- **player_tier spread (strawman):** Fundamental (flat-feet / pad-level / static-base basics), Developing (movement/timing), Advanced (leverage/shade/eye-discipline) — a natural 3-tier fit, no 5th tier wanted.

**Implication for scope:** the DB set is the *lightest* (mostly `[Foot,Hip]` rows, 2 faults each) and still needs landmark additions on ~half. The QB Drop-Back cluster (up to 7 faults/row, known knee/sternum gaps) will be materially heavier per row. Budget the split as an SME-guided annotation pass, not a script.

**Recommended pilot execution order when approved:** do 1752 first (fully covered — validates the pure-split path with zero re-annotation), then a landmark-ADD row (1755), then the 3-fault row (1725), then 1772 (tier/camera split) — i.e. climb the difficulty ladder so the workflow is proven on each hard case before the QB cluster.
