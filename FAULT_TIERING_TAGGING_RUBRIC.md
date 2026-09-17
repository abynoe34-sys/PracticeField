# Whole-Catalogue Tagging — Pattern Library & Draft Rubric (for ratification)

> Status: **DRAFT for ratification — no writes to `checkpoints_v2`, no execution.** Produced 2026-09-16.
> This is the "second large effort" scoping deliverable: the rubric + pattern library the whole-catalogue
> `player_tier`/`fault_severity` tagging would run against. **Nothing is tagged until the rubric below is
> ratified (or rewritten) by the owner on the sample at the end.** Two owner-flagged concerns are addressed
> up front as first-class checks (§3, §4), not footnotes.

---

## 1. Scope (real numbers, verified live 2026-09-16)

- **1665 rows · 158 already tagged (DB/QB/WR/TE/RB pilots) · 1507 untagged.**
- 1507 untagged rows → **786 distinct `fault_trigger` strings** → **~150–250 genuine fault patterns** once
  archetype clustering + cross-position copies are netted out. The judgment unit is the **fault pattern**, not the row.

| Group | Untagged rows | Distinct fault strings | Collapse |
|---|---:|---:|---|
| OL | 396 | 75 | **5:1** — heaviest repetition (same block faults × 14 variations × 2 stances × 5 positions) |
| TE | 291 | 249 | ~1:1 text, but see §3 — mostly a WR copy for receiving skills |
| QB | 286 | 232 | ~1:1 text; archetype clustering (QB pilot: 56 rows → 8 archetypes ≈ 7:1) |
| WR | 274 | 256 | ~1:1 text; archetype clustering |
| RB | 145 | 67 | ~2:1; ~31 rows are WR copies (Catching/Ball-Carry/Blocking-Cut) |
| DB | 115 | 65 | ~2:1 |

---

## 2. Orthogonal axes — the load-bearing correction

The earlier scoping report folded a measurability constraint into a tier anchor ("situational/field-reference → Advanced").
**That was wrong and is retracted.** These are independent questions and must be decided separately:

| Axis | Question it answers | Set by |
|---|---|---|
| `measurable_by_pose` | *Can the camera see it today?* | already set on every row; a **technical** limit |
| `fault_severity` | *How bad is the performance consequence?* | consequence of the mistake — fairly position-agnostic |
| `player_tier` | *What experience level before you coach it?* | learning progression — **position/technique-context-bound** |
| **`safety` (NEW — owner call, §5c)** | *Can this hurt the player or someone else?* | a **categorically different kind of stakes** — NOT a point on the performance scale |

A fault can be `skip` (un-measurable) **and** `Fundamental` (coach it on day one). The axes never imply each other.
**Probe B (§4) proves the measurability↔tier independence against live data.** Any first-pass proposal states each axis independently, with reasoning.

---

## 3. Probe A — the WR→TE tier-transfer claim, checked not assumed

The earlier report said "deciding WR decides TE." That was a pose-annotation fidelity result (landmarks/camera/mbp),
**not** a coaching-judgment result. Checked against live data, transfer is only even *structurally* a candidate for the
pure receiving skills — and even there the **tier** call still needs a sample ratified, because TE's role differs (blocks
more, catches less, different learning progression):

| Technique | WR faults | TE faults | Structurally a WR copy? |
|---|---:|---:|---|
| Catching | 17 | 17 | **Yes** (identical, 7 variations each) |
| Routes | 94 | 94 | **Yes** (identical, 15 variations each) |
| Ball Carry | 3 | 3 | **Yes** |
| Release | 89 | 91 | Mostly (2 TE-extra rows) |
| **Blocking** | 15 | 11 | **NO** — WR 2 variations vs TE 5; TE blocks as a role |
| **First Step** | 14 | 18 | **NO** — TE-original content |
| **Stance** | 11 | 15 | **NO** — TE has 2-pt/3-pt stances WR lacks |
| First 5 Yards | 16 | — | WR-only |

**Finding:** transfer is a candidate ONLY for Catching / Routes / Ball Carry / most of Release. **Blocking, First Step,
Stance are TE-original and must be judged independently** (they carry TE's blocking role). Even on the copied techniques,
`fault_severity` almost certainly transfers (a dropped catch is a dropped catch), but `player_tier` gets a **verification
sample** before it's treated as a shortcut: does an identical route/catch fault sit at the same tier for a TE, whose
progression weights blocking earlier? Ratification sample §7 includes 3 WR/TE matched pairs specifically to settle this.

---

## 4. Probe B — situational faults: measurability ≠ tier (RB 1218 flag)

Searched every untagged fault referencing field/boundary/sideline/leverage/defender-position. **Result: almost all are
`measurable_by_pose = Yes`** — the field context is in the *prose*, but the measured thing is a body mechanic:

- DB "Turning the Hips Early / Losing Pad Level / Opening the Gate / Losing the Sideline Cushion" → **Yes** (hip orientation, pad height)
- OL "Over-Setting (Opening the Gate) / Catching the Rusher / Waist Bending" → **Yes** (kick depth, shoulder turn, hip hinge)
- Genuinely un-measurable ones are rare: QB 400 "poor escape direction — needs defenders in frame — deferred" → `No`.

**So "situational language" implies neither `skip` nor `Advanced`.** Many are the most basic fundamentals a rookie learns
(pad level, base width, hip turn) → **Fundamental**. The earlier anchor would have wrongly pushed a whole class to Advanced.

**Concrete casualty — flag on already-written data:** the WR/TE/RB pilot tagged RB **1218**'s out-of-bounds child
`skip` / **Advanced** / Minor. The `skip` is right (needs the field boundary). But **Advanced was applied for the wrong
reason** — a rookie must stay inbounds on a wheel; that's not an advanced-only concept. Under the corrected axes it should
likely be **Developing or Fundamental / Minor**, `skip`. **Recommend revisiting that one tag** when bulk tagging touches RB
(no silent change — flagged for the owner). It's the only pilot row where the conflation actually reached the DB.

---

## 5. Draft rubric — anchors (to ratify or rewrite)

Two independent dimensions. Every proposed tag cites which anchor it maps to; the owner ratifies the anchors, not 1500 rows.

### 5a. `fault_severity` — consequence (mostly position-agnostic, transfers reasonably)
| Severity | Anchor | Pilot precedent |
|---|---|---|
| **Critical** | Turnover / fumble / safety-injury risk — the rep is lost or someone gets hurt. **For defenders (refined twice; final 2026-09-17): the row's own text describes the DEFENDER as BEATEN / UNABLE TO CONTEST** — something that has already happened to the defender ("blow past", "beat you cleanly", "fly over your head", "clean release + help can't recover", back turned + "runs easily"). **This is NARROWER than "explosive outcome":** a row that describes only an ENABLING CONDITION — space opened that a route *could* exploit ("wide open for a post", "opens a lane for a dig", "completely open to a wheel", "deep hole wide open") — is **Major, NOT Critical**, because naming the route doesn't make the grass uncontested (defense can recover, help can arrive, QB can miss) — the same football reality as "massive void"/"blind spot"/"exposed" (all Major). Also NOT Critical: "vulnerable to" (risk) and short/intermediate wide-open completions (flat/curl/checkdown). | WR/TE/RB fumble = Fundamental/**Critical**; DB "beat you cleanly down the sideline" / "fly directly over your head" = **Critical**; DB "deep seam wide open for a vertical post" = **Major** (space opened, not defender beaten) |
| **Major** | Core mechanic failure — the technique's primary job fails (whiffed block, blown break, lost leverage) | most footwork/leverage faults across all pilots |
| **Minor** | Refinement — costs efficiency/margin but the rep still largely works | QB chop-into-load, hip over-sink = **Minor** |

### 5b. `player_tier` — learning progression (position-context-bound, transfers weakly — expect more LOW-confidence)
| Tier | Anchor | Pilot precedent |
|---|---|---|
| **Fundamental** | Stance, base, ball security, eyes, safe head placement, basic field awareness (staying inbounds) — taught before anything else | WR/TE/RB catching-confirmation, head-tracking = **Fundamental** |
| **Developing** | Technique refinement once fundamentals hold — plant mechanics, route-break shape, pass-set depth | QB Feet-Glide split children, most Release/Routes = **Developing** |
| **Advanced** | Disguise/deception refinement, defender-reading/recognition — reading the *game* or hiding intent, not just executing | QB torso-lean tells; DB coverage recognition |

**Cumulative-unlock reminder:** tier NEVER hides fundamentals from an advanced player. A high tier just means the fault
isn't *introduced* until that level — it stays visible thereafter. (Same semantics as the pilots.)

### 5c. `safety` — a SEPARATE designation, not a point on the severity scale (OWNER DIRECTIVE, 2026-09-16)

Injury-risk faults (Leading with the Head into a defender's knees, Diving at the Ankles) are **categorically different
stakes** — concussion / spinal injury, not winning or losing a rep. Folding them into Critical/Major/Minor would calibrate
the performance scale to game consequences while smuggling in a physical-safety member. So:

- Safety faults carry a **distinct `safety` flag**, independent of `fault_severity`. (`fault_severity` may still be set for
  intra-list ordering, but the flag is what marks it.)
- **Safety faults BYPASS the ordinary filtering entirely** — they are exempt from the `player_tier` unlock, the
  `min_severity` floor, AND the `max_checkpoints` display cap. A beginner sees them on day one, every rep, regardless of any
  cognitive-load control. This is stronger than the "tier never hides a fault" rule already settled: safety isn't subject to
  the load-management logic *at all*.
- **This is a schema + resolver change, not just a tag.** It needs a `safety`/`is_safety` marker on `checkpoints_v2` (a
  migration) and a new unconditional-surface branch in `layer3_resolver.resolve()` that runs before the tier/severity/cap
  filters. **That build is a separate decision from tagging** (own migration + resolver diff + tests) — flagged in §9. Until
  it lands, safety faults are *identified* in the worksheets but the enforcement isn't wired.

#### The criterion, BROADENED — mechanism-independent (OWNER RULING, 2026-09-17)

The first two safety examples (Leading with the Head, Diving at the Ankles) were both **contact-injury** acts, which
tempted a narrower reading — "safety = a dangerous act against another player." **That is the wrong axis.** The safety
mechanism exists because *a player gets physically hurt*, and the cost of missing that is the same whether the injury comes
from a collision or from the athlete's own movement. A torn ACL from a plant-and-twist is as real a harm as a neck injury
from a head-first hit; non-contact knee/ankle injuries from bad cutting mechanics are among the most common season-enders in
football. **The injury MECHANISM (contact vs. non-contact, torque vs. impact) is irrelevant.**

**Locked criterion:** `is_safety` applies to **any fault whose OWN TEXT names a genuine physical injury risk to a player** —
contact *or* non-contact movement mechanics (torque, twist, joint strain, roll) — the mechanism doesn't matter, **only
whether real physical harm is explicitly described in the row's text.**

- **The text-based discipline is load-bearing (mirror of "never invent a fault").** The row must *state* the injury risk.
  Do **not** infer an injury the text doesn't name from anatomical vocabulary alone. "Spine rounding → can't absorb a
  bull-rush, pocket collapses" is a **performance** consequence (Major), not safety — even though it says "spine." "Exposes
  your chest to the edge rusher" is exposure/leverage (Major), not injury. The word "spine"/"joint"/"helmet" appearing
  descriptively is not a safety trigger; an explicitly-stated *harm to the player* is.
- **Worked NON-CONTACT example — RB 1182 (`is_safety`, 2026-09-17):** "Sticking the Cleat — planting the foot flat and
  twisting the knee rather than rolling onto the inside instep, **which can cause joint injuries** or slips." Names a genuine
  self-injury (knee torque) in its own text → `is_safety=true`, `fault_severity=NULL` (off the scale), `player_tier` kept at
  the judged skill level (Developing — plant-cut mechanics; surfacing is unconditional regardless of tier). This is the
  companion to the contact examples 1206/1207 and shows the axis is harm, not collision.
- **Backward-check protocol when broadening (done 2026-09-17, before WR):** scanned every already-tagged OL/DB/RB row for
  injury-risk vocabulary AND contact-danger phrasing; the ONLY row whose text names a real player-injury risk was 1182. All
  other hits ("tearing open a lane", "joint elasticity", "exposes the chest/ball", "hits the helmet") were the descriptive
  false positives the text-discipline rule above screens out. Re-run this scan on WR/TE (route-cutting content is where
  non-contact knee/ankle injury language is densest) as those slices are tagged.
- **Named boundary case — RB 1123 (STAYS Major, not safety; the 1768-equivalent for this criterion, owner-verified
  2026-09-17):** "Popping the Top — straightening the spine and standing tall on the first step, which **raises the target
  area for defenders** and kills forward momentum." Real football knowledge says a tall runner takes a bigger, more
  dangerous hit — genuinely injury-adjacent. **But the row's stated consequence is performance ("kills forward momentum"),
  and it never asserts a physical harm the way 1182/1206/1207 do.** It stays excluded *because* of the session's governing
  discipline: don't add what the source doesn't say, even when it's true (same stretch rejected for BC-ball's synthesized IES
  and the OL no-fault severities). **The test is what the row asserts, not what's true in football.**

---

### 5d. Tells / deception — re-examined as a CATEGORY (owner-flagged; the earlier "Minor" was wrong)

The draft put two faults at `Minor` (OL hand-pressure-lean "tips pass-vs-run"; Telegraphing the Cut), and justified the
latter with "mirrors pilot deception anchors" — which is precedent citing itself, not an independent check. Re-examined
against the live catalogue, and the conclusion flips:

- **Tells are not a small edge category — they are the CORE of route-running and release.** A catalogue scan shows most of
  WR/TE Routes and nearly all of Release is "don't tip the break" (banana-stemming, early head-turn, hips opening early,
  arm-pump dropping, torso rising — dozens of rows). It's the dominant fault theme, not a footnote.
- **A tell's consequence is a live-rep loss:** a defender who reads the break jumps the route → incompletion or
  interception; a tipped run/pass lets the whole defense adjust; a telegraphed cut-block is simply avoided → blown block.
  That is **Major**, the same band as pass-set drift and hip-roll failure — not Minor. The reasoning fields on the two
  draft rows *already said this* ("tips the play call," "readable cut") and were then mis-scored Minor anyway.
- **Category ruling (proposed): tells/deception → `fault_severity = Major` by default.** Minor is reserved for a tell so
  subtle it costs only margin against elite coverage; that's the exception, flagged LOW per-row, not the default.
- **Tier still varies independently:** a tell that's a *symptom of broken mechanics* (rounding the break, blind plant) is
  **Developing** (core route mechanics); a *pure disguise* refinement with clean mechanics (holding the head fake to the
  last frame, sustaining arm-pump amplitude) is **Advanced**. Severity Major across both; tier is the axis that moves.
- No tag in this category is justified by "matches the pilot" — each cites the live-rep consequence directly.

## 6. Confidence protocol (the anti-mechanical-trap rule)

Every proposed tag carries **HIGH** or **LOW**:
- **HIGH** — the fault maps cleanly onto a ratified anchor (ball-security → Critical; stance base → Fundamental; core block mechanic → Major). Reviewed **in bulk at pattern level**.
- **LOW** — a genuine judgment call with no clean anchor (Developing↔Advanced boundary; is a safety fault Critical or Major?; recognition/assignment faults). **Surfaced individually for the owner**, never averaged into a batch.

**Hard line (not a preference):** no tag is applied by silent string-match. Reasoning tied to a named anchor is shown for
every pattern; a regex match on "ball" does not produce `Critical`. `player_tier` proposals skew LOW by design (§3, §5b).

---

## 7. Worked pattern library — OL first slice (the ratification sample)

OL is recommended first: 396 rows → 75 faults (highest collapse), entirely untouched, mostly HIGH-confidence mechanics.
Below is the OL archetype library with **proposed** tags + reasoning + confidence. **This IS the ratification sample** —
approve/rewrite these anchors and the bulk OL pass follows them; the same rubric then extends per group×technique.

### OL Stance (fundamentals — you coach the stance first)
| Fault family | sev | tier | conf | reasoning |
|---|---|---|---|---|
| Base width / stagger (Narrow Base, Shallow/Deep Stagger, Unconscious Stagger) | Major | Fundamental | HIGH | stance is taught first; a bad base compromises every rep |
| Hip height (High Hips, Squatting Too High, Heel Sitting) | Major | Fundamental | HIGH | core stance mechanic |
| Spine/head (Spine Rounding, Head Dropping) | Major | Fundamental | HIGH | posture fundamental; also vision |
| Hand pressure / lean (Heavy Hand Pressure, Fingertip Leaning, Burying the Hand, Over-Weighting) | **Major** | Fundamental | LOW | **revised up from Minor per §5d** — tipping run/pass pre-snap lets the whole defense adjust = a live-rep consequence, not a refinement; LOW only on the Fundamental-vs-Developing tier line |
| Pre-angling / turning hips (Pre-Angling Hips, Turning Inward) | Major | Developing | LOW | a *tell* (§5d) → Developing (mechanical) vs Advanced (pure disguise) — owner call on the tier |

### OL Blocking
| Fault family | sev | tier | conf | reasoning |
|---|---|---|---|---|
| Base/leverage (Waist/Bending at Waist, Narrow Base, Lunging, Standing Up, Pad level) | Major | Fundamental | HIGH | primary blocking mechanic; fails the block |
| Hip roll / finish (Failing to Bring Hips Through) | Major | Developing | HIGH | refinement once base holds |
| **Safety — head/ankles (Leading with the Head, Diving at the Ankles)** | **`safety` flag** (§5c) | Fundamental | HIGH | per owner directive: distinct safety designation, NOT a severity-scale point; bypasses tier/floor/cap; surfaced day one every rep |
| Pass-set specifics (Over-Setting/Opening the Gate, Drifting/Dropping Too Deep, Catching the Rusher) | Major | Developing | HIGH | pass-pro refinement beyond base |
| Recognition/assignment (Chasing the Ghost/Looper/Decoy, No Man's Land) | Major | Advanced | LOW | reading the front — hard to tier; recognition, not execution |
| Deception (Telegraphing the Cut) | **Major** | Developing | HIGH | **revised up from Minor per §5d** — a telegraphed cut-block is avoided → blown block, a live-rep loss; consequence-based, not precedent-based |
| Feet on contact (Crossing the Feet, Sticking the Cleats, Pop-and-Stop) | Major | Developing | HIGH | contact-footwork refinement |

**Remaining genuine judgment (LOW):** the stance hand-pressure/hip-angling tier lines and how recognition faults tier.
The safety row is now resolved by the §5c directive (HIGH); the two deception rows are resolved to Major by §5d. HIGH rows get bulk approval.

## 7b. WR→TE tier-transfer — the real matched pairs (decision #3)

Three untagged WR/TE pairs pulled full-text. The fault sentence is **byte-identical except `receiver`↔`tight end`**, confirming the structural copy; the open question is whether the *tier* is identical for a TE:

| Pair (WR id / TE id) | Fault (identical text) | Proposed tier | Same for TE? |
|---|---|---|---|
| Routes/Tree-Dig · 946 / 1452 | "RUNNING FLAT / BANANING — letting the route drift downfield instead of a flat 90° line" | Developing | **proposed SAME** — a dig break is the same skill regardless of position |
| Routes/Tree-Dig · 943 / 1449 | "BANANA STEMMING — curving the path inward before the break" | Developing (+ §5d it's also a tell → Major severity) | **proposed SAME** |
| Release/Diamond · 775 / 1281 | "Hips staying square while only the feet take the diagonal — the fake is not sold" | Advanced (pure disguise, §5d) | **proposed SAME** |

**Reasoning:** these are pure receiving-skill faults; the skill's difficulty is intrinsic to the route/release, not to
the position running it, so tier transfers. **BUT** this holds ONLY for the copied receiving techniques (Catching / Routes /
Ball Carry / most Release). TE's **Blocking / First Step / Stance are TE-original (§3) and get judged independently** — no
transfer there. **Owner ruling requested:** accept SAME-tier transfer on the receiving-skill twins (bulk), or require every
TE row judged fresh? (My read: transfer is defensible for these three and their siblings; the risk is low and named.)

---

## 8. Proposed execution (after ratification — NOT now)

1. **Ratify §5 anchors + settle the §7 LOW calls** (incl. the safety-band question) on this OL sample. One focused session.
2. **Batch by (group × technique).** Order: **OL** (validate the rubric on the highest-collapse, HIGH-confidence slice)
   → DB → RB → then the WR route/release trees → TE (applying the §3 transfer sample result) → QB.
3. Each batch = a worksheet (proposed tags + reasoning + HIGH/LOW), same two-step review→go-ahead discipline as the split
   pilots. LOW rows pulled out for explicit owner decision.
4. **Revisit RB 1218's Advanced tag** (§4) when the RB batch runs.
5. Same verification discipline at write time: read-back per changed row, snapshot regen from live, both suites, fresh live
   re-pull (anti-circularity).

---

## 9. Decisions — status after the 2026-09-16 owner review

**Resolved by owner directive (folded into the rubric above):**
- **Safety faults** (§5c) → distinct `safety` designation off the performance scale, bypassing tier/floor/cap entirely. Applied to the §7 safety row.
- **Tells/deception** (§5d) → re-examined as a category, severity **Major** by default (not Minor); tier varies Developing↔Advanced. The two §7 rows corrected; circular "matches pilot" justification removed.
- **RB 1218** (§4) → owner lean **Fundamental** (basic field awareness, not a refinement); `skip` stays. Settle for real when the RB slice runs.
- **LOW-row labour** (§6) → unchanged process: Claude proposes with reasoning + confidence flag, owner ratifies/overrides.

**Still open — need an explicit ruling before OL bulk:**
1. **Ratify or rewrite the §5a/§5b anchors** now that §5c/§5d are in (the §7 OL table is the concrete sample).
2. **WR→TE transfer (§7b):** accept SAME-tier transfer on the receiving-skill twins, or require every TE row judged fresh?
3. **NEW — the `safety` mechanism is a build, not a tag (§5c):** approve (or defer) the migration adding a `safety` marker to `checkpoints_v2` + the `resolve()` unconditional-surface branch + tests. This is separate from tagging and gates whether the safety flag is *enforced* vs merely *recorded*. Recommend sequencing it before/with the OL bulk pass, since OL is where the first safety faults land.

## 10. EXECUTED so far (2026-09-16, after owner ratification)

- **Safety mechanism built + verified.** migration-v25 (`is_safety` boolean); `resolve()` surfaces safety
  faults unconditionally (bypasses tier/severity/cap, off the budget); `test_safety_faults_bypass_all_filters`.
  Live-confirmed on real OL data: OL_Center Blocking `max_checkpoints=1` still surfaces both safety rows
  (1247 Diving, 1248 Leading-with-the-Head); all three filters composed still surface them.
- **OL fault-row pass (Option A) executed.** The **123** OL rows that state a fault are tagged; the **273**
  positive-technique no-fault rows are left `player_tier` NULL by design (permanent correct state, not a
  backfill gap). Distribution: Blocking — 10 safety / 17 Fundamental·Major / 44 Developing·Major / 7
  Advanced·Major; Stance — 4 Fundamental·Critical (Fingertip-Leaning + Unconscious-Stagger, fumble
  consequence) / 39 Fundamental·Major / 2 Developing·Major (Pre-Angling-Hips tell). 0 no-fault rows tagged,
  0 fault rows missed. Snapshot regenerated (tagged 281). resolver **238/238**, cleaning **28/28**.
  - LOW-confidence calls made (open to override): the 7 Advanced recognition/assignment rows (Chasing
    Ghost/Looper/Decoy, No Man's Land); the 4 Stance-Critical fumble faults (a judgment beyond the ratified
    §7 sample — flagged); Pre-Angling-Hips → Developing.

## 11. Positive-phrased safety — found AND flagged (owner directive), now EXECUTED

`is_safety` is NOT fault-only. The 273 no-fault OL rows held genuine safety-critical technique stated
positively: the **5 Cut-block rows (1249 / 1254 / 1259 / 1264 / 1269)** — "Keep the head up and eyes locked
on the target through the entirety of the strike" — the positive form of the leading-with-the-head injury
risk. Flagged `is_safety=true` (Fundamental) in the no-fault pass; live-verified they bypass all filters.
(Other regex hits were vision/posture, not injury-risk.)

## 12. OL no-fault tier-only pass EXECUTED (2026-09-16) — OL now fully tagged

The 259 no-fault OL rows with an IES tagged **tier-only** (player_tier, NULL severity — Option A):
- **Fundamental 149** — Stance (all) + base blocks (Run/drive, 1-on-1 Man/Big-on-Big pass set, base 2pt/3pt).
- **Developing 105** — scheme/coordination layered on base: Run-Combo, Pass_Pro-Combo/Half-Slide,
  Pass_Pro-Zone/Slide, Run-Skip-Pull, Run-Trap, and Cut technique.
- **Safety 5** — the §11 Cut head-up rows (Fundamental + is_safety).
- **14 content-gap rows** (no fault AND no IES) stay untagged — nothing to judge, held like S2.

**OL now 382/396 tagged** (the 14 held). Verified live: fault rows unchanged (113 with severity + 10 safety),
0 no-fault rows carry severity, safety 15 total. Snapshot regenerated (tagged 540). resolver 238/238, cleaning 28/28.
**OL is the first fully-tagged position — the reference point for the remaining slices.**

## 13. Non-OL no-fault tier-only pass EXECUTED (2026-09-16) — no-fault baseline complete catalogue-wide

The 187 non-OL no-fault rows tagged tier-only (Option A). All had an IES (no content-gaps outside OL).
- **DB (48):** Fundamental 11 (stance + backpedal), Developing 37 (press/coverage reactions, leverage-level release rules). Flagged LOW: the Release_*-Level rules are the ones most arguably Advanced — kept Developing (a corner learns leverage reactions relatively early, not an Advanced-only concept); owner may bump.
- **QB (26):** Fundamental 2 (ball security), Developing 21 (bootleg, toss), Advanced 3 (Speed-Option/Shovel — reading the edge defender).
- **RB (78):** Fundamental 37 (stance, ball security, starts, base blocks, handoff), Developing 41 (cuts, routes, toss/option, cut block).
- **TE (31):** Fundamental 27 (stance, first-step, base blocks), Developing 4 (chip-release, cut block).
- **WR (4):** Fundamental 3 (ball security), Developing 1 (cut block).
- **Safety (positive-phrased scan, OL precedent):** RB 1208 / TE 1239 / WR 1244 (Cut head-up) → is_safety=Fundamental; live-verified bypass all filters. (TE 1001 "head up, neck relaxed, scan the edge" excluded — vision cue, not injury-risk.)

Verified live: 0 non-OL no-fault rows left untagged, 0 carry severity (Option A). **Every no-fault row
catalogue-wide is now tagged except OL's 14 content-gap rows.** Catalogue 727/1665. resolver 238/238, cleaning 28/28.

## 14. DB has-fault pass EXECUTED (2026-09-17) — DB now fully tagged (2nd complete position)

The 67 DB has-fault rows tagged severity + tier. No injury-risk faults (coverage) → 0 is_safety.
- **Tier:** Fundamental 24 (stance + base pedal/pad-level/eyes discipline), Developing 32 (coverage-footwork reactions, jam technique, leverage maintenance), Advanced 11 (recognition/anticipation — guessing the route, sitting on the stem, squatting early, play-action, reading when to bail).
- **Severity — REVISED TWICE 2026-09-17.** First from keyword-only → "explosive outcome" (14 Critical). Then owner review sharpened the line to **"defender BEATEN / cannot contest" vs "enabling condition (space opened)"** (§5a): "wide open for [route]" is the same reality as "void" (Major), so **6 moved back** (1682/1697/1703/1727/1762/1763). **Final: Critical 8** (Fund 1 / Dev 4 / Adv 3), **Major 56**, **Minor 3**. The 8 Critical: 1665, 1676, 1685, 1710, 1720, 1768 (defender beaten) + 1704 (PI/separation-TD), 1722 (play-action TD). 1768 was the closest call (has both "deep hole" space-language and "back turned + runs easily" beaten-language) — kept Critical on the beaten element. Held at Major = enabling-condition/space language + risk ("vulnerable"/"void"/"blind spot") + short completions + in-phase "stack you".
- Verified live: DB 0 untagged, 0 no-fault rows carry severity (Option A). Catalogue 794/1665. resolver 238/238, cleaning 28/28.

## 15. RB has-fault pass EXECUTED (2026-09-17) — RB fully tagged (3rd complete position); §5a applied first-pass

The 67 RB has-fault rows, locked §5a from the start (no second pass, unlike DB).
- **Fund/Critical 8:** fumble/strip/muffed-pitch (1082/1083/1084 ball security, 1184/1197 ball-slip-on-cut, 1132 elbow-flare-strip burst, 1168 clamp-early mesh, 1172 muffed pitch). RB is offense → §5a defender-beaten branch N/A; only the turnover branch fires. **Drops = Major** (incompletion, not turnover).
- **Safety 3 (1182 added by the 2026-09-17 ruling below):** 1206 (diving at ankles) + 1207 (leading with head into knees) — contact cut-block injury pattern; **1182 (sticking the cleat / knee-twist) — the non-contact companion.** All `is_safety`, NULL severity, tier kept at judged level.
- **Fund/Major 30 / Dev/Major 26** (1182 removed from Dev/Major on the flip). Tier: Fundamental = ball security, base blocks, first-step burst, stance, watch-it-in catching eyes, handoff eyes; Developing = named cut techniques, routes, hand-shape catching, option/toss exchange, tells. **No Advanced** — RB has-fault is execution-heavy; its reads (find the void, track the block, option pitch) are Developing-level.
- **RB 1182 RESOLVED → `is_safety` (owner ruling, 2026-09-17).** Initially tagged Developing/Major and flagged, out of caution not to widen the safety axis past the contact precedent. Owner ruled the contact-vs-non-contact line is the wrong axis — the safety mechanism is about *player harm*, mechanism-independent (see the broadened §5c criterion). Flipped: `is_safety=true`, `fault_severity=NULL`, `player_tier=Developing`. Backward-check scan across all tagged OL/DB/RB rows cleared with only 1182 (see §5c backward-check protocol). RB safety now 4 total (1182/1206/1207 + 1208 no-fault head-up).
- Verified live: RB 0 untagged, 0 no-fault rows carry severity (Option A), 0 safety rows carry severity. Catalogue 861/1665. resolver 238/238, cleaning 28/28.

## 16. WR has-fault pass EXECUTED (2026-09-17) — WR fully tagged (4th complete position); judged FRESH (source for TE transfer)

The 270 WR has-fault rows, judged fresh (WR is the source; TE inherits on the receiving-skill twins). §5a offense branch (turnover/fumble = Critical only; drops = Major; no defender-beaten branch) + broadened §5c safety scan applied.
- **Fund/Critical 5:** ball-security fumble/strip (704 double-clutch, 705 flagging [twin of RB 1083], 706 exposing-the-breast) + 974 (Seam "exposing the ball → drops and **forced fumbles**" over the middle) + 1 pilot child. Offense → only the turnover branch fires.
- **Safety 7 (new; +1244 no-fault head-up = 8 WR safety total):** 770 (blocking head-down, "unsafe way to take a collision"), 1242/1243 (cut-block Diving-at-Ankles / Leading-with-Head — **verbatim twins of committed RB 1206/1207**, and §5c-listed archetypes), + **route-cut knee-injury rows** 927/939/955 ("**dangerous stress on the knees**") and **904** (boundary case — see below). Head-contact safety = Fundamental; route-cut knee safety = Developing (matches 1182 cut-mechanics tier). NULL severity.
- **Fund/Major 55:** eye-discipline catching (watch-it-in / eyes-stay-down, all catch locations), release drive + first-step/first-5-yards acceleration mechanics, pre-snap stance.
- **Dev/Major ~207:** all 89 Release moves (Diamond/Kickstep/Slide/Split — named press-release skills; the "read" elements are core to executing the release, not a recognition overlay), all Routes cut/tree execution (telegraph, rounding, blind turn, toe-plant slide, drift, INT-*risk* "waiting on the ball" = enabling condition not realized turnover → Major), hand-shape/orientation catching nuance, WR blocking-in-space, cut telegraph.
- **No Advanced (new WR rows).** Consistent with WR no-fault (F3/Dev1) and RB has-fault: WR execution is Fundamental/Developing; genuine Advanced (sight-adjustment / option-route coverage reads) is not present in the current WR catalogue — the "reads" mentioned are incidental context on mechanical break faults, and gaze/defender-position is flagged non-pose-measurable. (1 pre-existing pilot Advanced/Minor row stands.)
- **Named boundary case — WR 904 (Cuts-Stop, tagged safety, owner to confirm):** "STIFF LEG … deceleration absorbed through the knees … **hard on the joints**." Softer injury language than 927/939/955's "dangerous stress on the knees," and its lead consequence is performance ("slower to stop") — but it is the **identical biomechanical fault** (stiff-legged deceleration through the knees) as those three confirmed knee-safety rows, so splitting the mechanism on wording alone would be inconsistent, and "hard on the joints" sits on the harm side of the 1123 line (which asserted only *exposure*). Tagged safety; strict-text-only alternative = Developing/Major. **Also note WR 1242** rides on being a §5c-listed archetype + its committed RB twin (its own text asserts *performance*, "defender steps over the block", not injury) — if strict-text-only were preferred, 1242 **and RB 1206** would move to Major together.
- Verified live: WR 0 untagged, 0 no-fault rows carry severity (Option A), 0 safety rows carry severity. WR safety 8. Catalogue **1131/1665**, safety total 28. Snapshot regenerated (tagged 1131); resolver 238/238, cleaning 28/28.

## 9b. Still open

- The **~520 has-fault untagged rows** in TE/QB → per-slice fault tagging. **TE next** — WR→TE `fault_severity` transfers on the verified receiving-skill twins (Catching / Routes / most Release); TE-original Blocking / First Step / Stance judged fresh.
- S2 knee-flexion content (3 rows) — held pending an authored correct-landing standard.
- DB Release_*-Level rules — settled Developing. The Critical criterion was refined twice 2026-09-17 (§5a) to "defender beaten vs enabling-condition"; carries into TE/QB.
- ~~RB 1182 — is_safety candidate~~ **RESOLVED 2026-09-17** → `is_safety` (owner ruling; §5c criterion broadened to be injury-mechanism-independent; backward-check cleared with only 1182).
- **WR 904 + 1242 boundary calls (§16)** — flagged for owner confirmation; both currently tagged safety.

No further writes pending direction on the next has-fault slice (TE).
