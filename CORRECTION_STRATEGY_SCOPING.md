# correction_strategy — Scoping + Empty Format + Sample Worksheet

> **SCOPING / PROPOSAL ONLY — no `checkpoints_v2` writes, no drafted correction content.**
> `correction_strategy` is the North-Star third beat ("how to correct it") and is currently blank on
> **all 1670 rows** (by design). This scopes the authoring task, proposes an empty input format for the
> owner to fill, and includes a ~15-row **sample worksheet** (all owner-fill cells blank) as a format
> check before the full worksheet is built. Numbers from the live-synced snapshot (1670 rows).
> Branch `fault-tiering-two-dimensional`. Last updated 2026-09-27.

## 1. Real numbers

| | count |
|---|---|
| Total catalogue | 1670 |
| **Has-fault** (`fault_trigger` populated) — the scope | **1205** |
| No-fault rows | 465 (451 tier-tagged positive-technique + 14 content-gap) |
| `correction_strategy` populated today | **0** (nothing to overwrite) |
| `coaching_cue` populated today | 22 (legacy QB-drop cues) |

**Open question — no-fault rows (flagged, not decided): `correction_strategy` maps cleanly onto the
1205 has-fault rows only** ("how to correct *the fault*"). The 451 positive-technique rows have no
fault to correct; whether they warrant a *separate* "how to develop this skill" content type is a
product decision for the owner, not something to fold in silently. Recommend scoping this effort to
has-fault rows and treating skill-development guidance as its own later question.

## 2. Collapse — real but modest (~1.6×), concentrated in WR↔TE

- 1205 has-fault rows → **870 distinct verbatim** fault strings → **764 distinct normalized patterns**
  (collapsing position-noun substitution like "receiver"→"tight end").
- So the authoring task ≈ **~764 fixes**, not 1205 — a ~37% reduction, not an order of magnitude.
- **The collapse is almost entirely WR↔TE:** WR 275 patterns, TE 268, **250 shared** — TE contributes
  only **18 original**. WR+TE's 572 rows collapse to ~293 authoring units. Every other group is largely
  idiosyncratic: **QB 267/269 unique, DB 85/85 unique** (zero transfer), OL 72/75 unique.

| group | has-fault rows | normalized patterns | unique-to-group | shared |
|---|---|---|---|---|
| QB | 344 | 269 | 267 | 2 |
| WR | 291 | 275 | 25 | 250 |
| TE | 281 | 268 | 18 | 250 |
| OL | 123 | 75 | 72 | 3 |
| DB | 90 | 85 | 85 | 0 |
| RB | 76 | — | 47 | 29 |

Patterns spanning ≥2 position groups: **250** (221 span 2, 24 span 3, **5 span 4**).

## 3. Cross-position transfer — read (flagged, not assumed)

- **High-confidence within a skill family (WR↔TE):** same skill, same body mechanics, only the role
  label differs — a receiving-break fix is the same fix wide or in-line. The 250 shared should
  **auto-transfer** WR↔TE (owner writes once).
- **NOT auto-transferred across structurally-different roles:** the 24 three-group and 5 four-group
  patterns are generic mechanical faults (ball-security "Flagging", "Double-Clutch", "Lunging") whose
  *fault* is identical but whose *correction context* may differ by role/equipment. Correction can
  depend on context more than severity did — so these are **owner-confirm**, not blind-transfer.

## 4. Proposed input format (empty — for review)

Keyed by **normalized pattern, not by row**, so each fix is written once and fanned out to every row
it covers. Owner fills only the last four columns; the rest is read-only context I pre-fill.

| col | who | purpose |
|---|---|---|
| `pattern_id` | me | stable handle |
| `⚑` | me | **transfer flag** — 🔗 = WR+TE shared (write once, both positions); ✳ = shared across ≥3 groups (confirm transfer); blank = single-group |
| `representative_fault` | me | the fault text (read-only) |
| `applies_to · rows` | me | position groups + row ids it fans out to |
| **`correction_strategy`** | **owner** | the fix / how to correct it |
| **`coaching_cue`** *(opt)* | **owner** | short in-the-moment cue (North-Star "mouth") |
| **`root_cause_first`** *(opt)* | **owner** | *checkpoint(s)* to check/fix first — may reference **no-fault** rows (see §6) |
| **`override?`** | **owner** | mark if the fix differs by position → I split that pattern's rows |

**Refinement applied (owner request): the WR+TE shared-transfer case is made visually unmissable** —
a 🔗 marker in the `⚑` column **and** a bold "**WR + TE — one fix, both**" tag in `applies_to`, so the
owner can't overlook that a single cell writes to two positions.

Ingest contract: pattern → write `correction_strategy` (+`coaching_cue`) to every row in `applies_to`;
`override?` rows get per-position values.

**`root_cause_first` — ruling (may point to ANY checkpoint, fault or no-fault):**
- **References another *fault* pattern** → the instruction is "fix that fault first, using its own
  `correction_strategy`." (A chain to another entry's fix.)
- **References a *no-fault* checkpoint** (e.g. OL base-width id 2, knee id 1832) → there is **no separate
  fix to look up**. For a positive-technique row the diagnostic and the fix are the same thing — the
  checkpoint's own `ideal_execution_standard` **is** the correction ("achieve this standard"). The
  reference means "get this checkpoint's standard right first," nothing more to author.

## 5. Sample worksheet (~15 rows — FORMAT CHECK, all owner cells intentionally blank)

Real faults pulled live. `correction_strategy` / `coaching_cue` / `root_cause_first` / `override?` are
**blank on purpose** — this is a format check, not a content draft.

| pattern_id | ⚑ | representative_fault | applies_to · rows | correction_strategy | coaching_cue | root_cause_first | override? |
|---|---|---|---|---|---|---|---|
| P01 | | "The Double-Clutch" — making a football move before the ball is secured | QB · 218 | | | | |
| P02 | | Overstriding / extra movement disrupting the quick base | QB · 223 | | | | |
| P03 | | Indecisive first step or drifting off the throwing platform | QB · 224 | | | | |
| P04 | | Torso/head destabilizes in the air; shoulders drift off target (airborne throw) | QB · 437 | | | | |
| P05 | ✳ | "Flagging" the Ball — carrying it loosely away from the body in space | **QB/RB/TE/WR — confirm transfer** · 219, 1083, + | | | | |
| P06 | 🔗 | Standing straight up / bending at the waist out of the stance | **WR + TE — one fix, both** · 730, 1033 | | | | |
| P07 | 🔗 | Shoulders spiking upright on the first step instead of rising gradually | **WR + TE — one fix, both** · 731, 1032 | | | | |
| P08 | 🔗 | Long ground-contact / foot striking ahead of the body (braking) | **WR + TE — one fix, both** · 732, 1034 | | | | |
| P09 | | **"Ducking Head on Snap" — dropping the chin / breaking spine angle (flat-back)** | OL_Center · 1831 | | | | |
| P10 | | "Pop and Stop" — feet freeze at the finish, rusher sheds the block | OL_Center · 5 | | | | |
| P11 | | "Lunging Forward" out of the stance (beaten by swim/club) | OL_Center · 29 | | | | |
| P12 | | "Bailing Deep on the Snap" — deep backpedal opens the flat | DB_Corner · 1659 | | | | |
| P13 | | "Linebacker Creep" — stance too wide/flat, feet locked up | DB_Safety_Strong · 1608 | | | | |
| P14 | | "Heel Settling" — weight flat on the heels, no explosive launch | DB_Safety_Strong · 1618 | | | | |
| P15 | ✳ | "The Double-Clutch" — a move before the ball is secured (ball-carrier) | **RB/TE/WR — confirm transfer** · 1082, + | | | | |

## 6. Worked example — P09, mapped with the owner's ALREADY-STATED words (illustration only)

The sample cells above are blank by design. Here is how P09 *would* fill, using the correction content
the **owner already provided** this session (verbatim intent, not redrafted) — shown to prove the format
carries their real insight, **not** to fill the sample:

- **P09 `correction_strategy`** ← *(owner's words)* "Address the root cause first — a flat/high back is
  usually **caused by** insufficient hip depth or narrow knees, so correct those before cueing the back
  directly."
- **P09 `root_cause_first`** ← **base width (id 2)** + **knee bend / hip sink (id 1832)**.

**This is settled, not an open question (see §4 ruling):** both root causes (id 2 base-width, id 1832
knee) are **no-fault positive-technique rows**, so per the ingest ruling there is **no separate fix to
author** for them — their own `ideal_execution_standard` already *is* the correction (diagnostic and fix
are the same thing for a positive-technique row). The owner authors P09's `correction_strategy` once; the
`root_cause_first` pointer just says "get base-width and knee-bend right first," resolving to those rows'
existing standards. This gives the OL base-width/hip-depth/knee-bend dependency (flagged in
`CHECK_TYPE_SPLIT_WORKSHEET.md` §6) a concrete home in the format.

## 7. On approval
Build the full pattern-keyed worksheet (~764 rows, or ~293 if WR↔TE auto-transfer is accepted) with the
read-only columns pre-filled and every owner cell blank. Nothing is written to `checkpoints_v2` until the
owner-filled worksheet comes back and is reviewed row-by-row (same standard as the check_type write).
