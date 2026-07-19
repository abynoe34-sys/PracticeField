// lib/position.ts
//
// Bridges the two distinct "position" concepts this codebase carries (see the
// Solo-player analysis access + Position capture build's Step 0 finding):
//
//   • PROFILE position — players.position / player_accounts.position — the broad
//     football-roster taxonomy (FootballPosition: 'QB','OL','C','OG','OT',…),
//     free-text, used for training-plan drill selection.
//
//   • ANALYSIS stance-position — sessions.position / session_videos.position —
//     CHECK-constrained to exactly 'guard_tackle' | 'center', the ONLY position
//     vocabulary the OL-stance feedback prompt (service/feedback.py
//     POSITION_CUES) understands.
//
// The per-session analysis position defaults from the profile position via the
// mapping below, and is overridable at session start. Anything that doesn't map
// cleanly to a stance group (a non-OL position, generic 'OL', 'Athlete', or an
// unset profile) yields null — the selector then starts empty and the user
// picks, and null flows through the pipeline as honest "unknown" (feedback
// hedges rather than inventing a position).

import type { FootballPosition } from '@/types'

// The broad roster taxonomy for the PROFILE position field, shared by every
// place that captures it (coach add-player form, solo signup, solo profile
// edit) so the option list can't drift between them.
export const FOOTBALL_POSITIONS: FootballPosition[] = [
  // Offense
  'QB','RB','FB','WR','TE',
  // Offensive Line
  'OL','C','OG','OT',
  // Defensive Line
  'DE','DT','NT',
  // Linebackers
  'MLB','ILB','OLB',
  // Secondary
  'CB','NB','SS','FS',
  // Specialists
  'K','P','LS','H','PR','KR',
  // Other
  'Athlete',
]

export type StancePosition = 'guard_tackle' | 'center'

export const STANCE_POSITIONS: { value: StancePosition; label: string }[] = [
  { value: 'guard_tackle', label: 'Guard / Tackle' },
  { value: 'center',       label: 'Center' },
]

export function stancePositionLabel(p: string | null | undefined): string | null {
  if (!p) return null
  return STANCE_POSITIONS.find(s => s.value === p)?.label ?? null
}

// Deterministic profile → stance-group default. Center is its own group; the
// guard and tackle roster spots (and generic interior-line 'OG'/'OT') collapse
// into 'guard_tackle', matching feedback.py's two POSITION_CUES buckets.
// Generic 'OL' and 'Athlete' intentionally return null — they don't identify a
// single stance group, so the user should choose rather than get a wrong guess.
export function mapToStancePosition(
  profile: FootballPosition | string | null | undefined
): StancePosition | null {
  switch (profile) {
    case 'C':
      return 'center'
    case 'OG':
    case 'OT':
      return 'guard_tackle'
    default:
      return null
  }
}
