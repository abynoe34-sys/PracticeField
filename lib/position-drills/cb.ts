/**
 * Cornerback (CB) Position Drill Library
 *
 * Cornerbacks are the primary cover defenders on the outside, matching up
 * 1-on-1 with the opposing team's best receivers.
 *
 * Primary Role: Preventing deep passes and maintaining tight sideline leverage.
 * Key Skills:   Fluid hip rotation, precise backpedal, explosive short-area bursts.
 *
 * Drill emphasis: press coverage and hip fluidity first, phase awareness second,
 * run-support (stalk block / crack recognition) third.
 */

import type { Exercise } from '@/types'

export interface DrillVideoCB {
  title: string
  url: string
  duration: string
  notes?: string
}

export type CBTechniqueArea =
  | 'press_coverage'    // press alignment, jam, redirect release
  | 'man_coverage'      // trail technique, hip flip, phase awareness, vertical track
  | 'zone_coverage'     // bail technique, zone funnel, cushion management
  | 'ball_skills'       // tracking, high-point catch, tip drills
  | 'run_support'       // stalk block defeat, crack block recognition
  | 'conditioning'      // W drill, lateral quickness, agility

export type CBDrillCategory = Exercise['category']

export interface CBDrillEntry {
  name: string
  category: CBDrillCategory
  technique_area: CBTechniqueArea
  sets: number | null
  reps: number | null
  duration: string | null
  why: string
  coaching_cue: string
  common_mistake: string
  fixes: string[]
  progressions: string[]
  videos: DrillVideoCB[]
}

export const CB_DRILLS: CBDrillEntry[] = [

  // ── CONDITIONING & AGILITY ────────────────────────────────────────────────

  {
    name: 'W Drill — CB Backpedal & Break',
    category: 'agility',
    technique_area: 'conditioning',
    sets: 4, reps: 1, duration: null,
    why: 'The W Drill is the gold standard for CB lateral quickness — it trains the explosive backpedal, foot plant, and sharp angle break used on every coverage rep a cornerback takes.',
    coaching_cue: 'Chin over toes in the pedal — on the break, plant the outside foot and drive the low elbow to open the hips immediately',
    common_mistake: 'Upright backpedal with weight on the heels — every break becomes a slow gather before the turn instead of an immediate explosive flip',
    fixes: ['agility', 'backpedal', 'break', 'coverage', 'lateral', 'quickness', 'change of direction', 'W drill', 'speed', 'footwork'],
    progressions: ['W drill at 70% — technique focus', 'W drill at full speed', 'W drill vs live WR route'],
    videos: [
      { title: 'W Drill Cornerback Backpedal Break Agility', url: 'https://www.youtube.com/watch?v=OkN5JKFuXqU', duration: '~6 min' },
    ],
  },

  // ── MAN COVERAGE ──────────────────────────────────────────────────────────

  {
    name: 'Mirror Drill — 1-on-1 Hip Read',
    category: 'footwork',
    technique_area: 'man_coverage',
    sets: 4, reps: null, duration: '30 seconds each',
    why: 'The CB must mirror the WR\'s lateral movements reading the hips, not the head or shoulders. Feet will fool you; hips never lie. This drill builds the eye discipline and reactive footwork cornerbacks need to stay in phase.',
    coaching_cue: 'Eyes on the hip bones — stay low, balanced, and react. Don\'t reach, don\'t lean.',
    common_mistake: 'Reading head or shoulder fakes and biting — gets juked out of position on every stutter-step or double-move',
    fixes: ['mirror', 'hip read', 'juked', 'man coverage', 'separation', 'lateral', 'footwork', 'coverage', 'eye discipline', 'double move'],
    progressions: ['Stationary mirror at slow speed (hips only)', 'Game-speed mirror with hip read', 'Mirror drill vs live WR running routes'],
    videos: [
      { title: 'Mirror Drill Cornerback 1-on-1 Hip Read Coverage', url: 'https://www.youtube.com/results?search_query=mirror+drill+cornerback+hip+read+man+coverage+football', duration: '~6 min' },
    ],
  },
  {
    name: 'Turn and Run / Hip Flip — Vertical Track',
    category: 'technique',
    technique_area: 'man_coverage',
    sets: 4, reps: 8, duration: null,
    why: 'When the WR wins a vertical release, the CB must open the hips from a backpedal into a full-speed sprint in one motion — any extra gather step creates uncatchable separation on deep routes.',
    coaching_cue: 'Low elbow plane, lead foot 180 degrees — flip and accelerate in the same step. Don\'t gather yourself first.',
    common_mistake: 'Adding an extra gather step before the turn — gives the WR a full stride of separation on every deep route that cannot be recovered',
    fixes: ['hip flip', 'turn', 'vertical', 'deep route', 'backpedal', 'open hips', 'sprint', 'coverage', 'separation', 'track', 'turn and run'],
    progressions: ['Walk-through hip flip form drill', 'Hip flip to sprint (10 yards)', 'Hip flip vs WR releasing vertically'],
    videos: [
      { title: 'Turn and Run Hip Flip Cornerback Vertical Coverage', url: 'https://www.youtube.com/results?search_query=turn+and+run+hip+flip+cornerback+vertical+route+coverage', duration: '~7 min' },
    ],
  },
  {
    name: 'Phase Drill — In-Phase vs Out-of-Phase',
    category: 'technique',
    technique_area: 'man_coverage',
    sets: 3, reps: 8, duration: null,
    why: 'A CB in-phase (hip-to-hip) plays the ball. A CB out-of-phase (trailing by a step) plays the receiver\'s hands — smacking the far wrist before the catch. Knowing which situation you are in determines your entire technique.',
    coaching_cue: 'In-phase: look through the WR\'s head to the ball. Out-of-phase: find the far shoulder, watch the hands, smack the wrist.',
    common_mistake: 'Playing the ball while out of phase — the ball arrives before the CB can make a clean play and results in a DPI call',
    fixes: ['phase', 'in-phase', 'out-of-phase', 'DPI', 'interference', 'trail', 'coverage', 'ball skills', 'hands', 'wrist', 'separation'],
    progressions: ['Walk-through phase identification vs stationary WR', 'Half-speed phase drill vs route', 'Full-speed phase drill vs live WR'],
    videos: [
      { title: 'Phase Drill Cornerback In Phase Out of Phase Coverage', url: 'https://www.youtube.com/results?search_query=phase+drill+cornerback+in+phase+out+of+phase+coverage+football', duration: '~8 min' },
    ],
  },

  // ── PRESS COVERAGE ────────────────────────────────────────────────────────

  {
    name: 'Press Alignment & Jam Drill',
    category: 'technique',
    technique_area: 'press_coverage',
    sets: 3, reps: 8, duration: null,
    why: 'Correct shade and a well-timed punch at the breastplate disrupts the WR\'s release timing and forces a wider stem — narrowing the passing window for the QB on quick game.',
    coaching_cue: 'Punch the breastplate — not the arms, not the shoulders. Two hands inside the frame, then ride the release.',
    common_mistake: 'Reaching for the arms instead of punching inside the frame — the WR can easily rip through or swim over arm tackles',
    fixes: ['press', 'jam', 'release', 'press coverage', 'bump and run', 'punch', 'alignment', 'shade', 'WR release', 'contact', 'inside frame'],
    progressions: ['Walk-through alignment and punch form', 'Press jam vs stationary WR', 'Live press vs WR with full release'],
    videos: [
      { title: 'Press Coverage Jam Drill Cornerback Football', url: 'https://www.youtube.com/results?search_query=press+coverage+jam+drill+cornerback+bump+run+football', duration: '~7 min' },
    ],
  },

  // ── ZONE COVERAGE ─────────────────────────────────────────────────────────

  {
    name: 'Cushion Management Drill',
    category: 'technique',
    technique_area: 'zone_coverage',
    sets: 3, reps: 8, duration: null,
    why: 'Too much cushion puts the CB in constant bail coverage — reactive and never challenging. Too little and the WR runs past before the flip is complete. Cushion management is the CB\'s clock — read the stem, choose the flip moment.',
    coaching_cue: 'Pedal until the WR\'s stem tells you a break is coming — then flip to drive, don\'t bail deep',
    common_mistake: 'Opening the hips and bailing too early — gives the WR an easy short-to-intermediate route with no challenge from the CB',
    fixes: ['cushion', 'cushion management', 'bail', 'pedal', 'man coverage', 'coverage', 'too deep', 'soft', 'short routes', 'stem'],
    progressions: ['CB-vs-air cushion drill with route call cues', 'Cushion drill vs WR run-off + comeback', 'Full-speed cushion management vs multiple routes'],
    videos: [
      { title: 'Cushion Management Drill Cornerback Coverage Football', url: 'https://www.youtube.com/results?search_query=cushion+management+drill+cornerback+zone+coverage+football', duration: '~7 min' },
    ],
  },
  {
    name: 'Bail Technique Drill',
    category: 'footwork',
    technique_area: 'zone_coverage',
    sets: 3, reps: 8, duration: null,
    why: 'When bailing from a press look to cover a zone, the CB must align 1 yard outside the WR, key through the WR to the QB, and maintain inside leverage. Bailing without tracking the QB gives the offense a free inside release on every snap.',
    coaching_cue: 'One yard outside, eyes to the QB through the WR\'s outside hip — bail and stay inside. Never give the seam.',
    common_mistake: 'Staring at the WR\'s release instead of keying to the QB — gets caught flat-footed on back-shoulder and late-breaking inside routes',
    fixes: ['bail', 'bail technique', 'zone', 'inside release', 'press look', 'coverage', 'QB read', 'seam', 'inside'],
    progressions: ['Walk-through bail alignment and key drill', 'Bail + react to QB throw signal', 'Full-speed bail vs live WR with QB'],
    videos: [
      { title: 'Bail Technique Drill Cornerback Zone Coverage Football', url: 'https://www.youtube.com/results?search_query=bail+technique+drill+cornerback+zone+coverage+football', duration: '~6 min' },
    ],
  },

  // ── RUN SUPPORT ───────────────────────────────────────────────────────────

  {
    name: 'Stalk Block Defeat & Crack Recognition',
    category: 'technique',
    technique_area: 'run_support',
    sets: 3, reps: 8, duration: null,
    why: 'On run plays to the CB\'s side, the WR will stalk block or crack block on a safety. Missing the stalk technique drives the CB off the edge; missing a crack call leaves the safety blindsided.',
    coaching_cue: 'Stalk: fit inside shoulder, lockout the WR, shed toward the ball. Crack: call "crack!" and redirect your assignment to the edge.',
    common_mistake: 'Getting caught flat-footed on the stalk and allowing the WR to set the block — gets driven off the edge with the tackle going for a big gain',
    fixes: ['stalk block', 'crack', 'crack block', 'run support', 'tackle', 'WR block', 'run defense', 'outside run', 'edge', 'shed'],
    progressions: ['Walk-through crack recognition and call', 'Stalk block fit drill vs stationary WR', 'Full-speed stalk / crack read vs live WR'],
    videos: [
      { title: 'Stalk Block Defeat Crack Recognition Cornerback Football', url: 'https://www.youtube.com/results?search_query=stalk+block+defeat+crack+recognition+cornerback+football', duration: '~7 min' },
    ],
  },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function findCBDrillsForPainPoint(painPoint: string): CBDrillEntry[] {
  const lower = painPoint.toLowerCase()
  return CB_DRILLS.filter(d =>
    d.fixes.some(fix => lower.includes(fix) || fix.includes(lower.split(' ')[0]))
  ).slice(0, 4)
}

export function cbDrillToExercise(drill: CBDrillEntry): Exercise {
  return {
    name: drill.name,
    sets: drill.sets,
    reps: drill.reps,
    duration: drill.duration,
    category: drill.category,
    why: drill.why,
    coaching_cue: drill.coaching_cue ?? null,
    demo_url: drill.videos[0]?.url ?? null,
  }
}
