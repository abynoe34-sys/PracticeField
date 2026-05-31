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
  | 'zone_coverage'     // bail technique, zone funnel, cushion management, Cover 2
  | 'backpedal'         // backpedal mechanics, pedal and turn, speed change, weave
  | 'ball_skills'       // strip drill, high-point catch, straight ball
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

  // ── BACKPEDAL MECHANICS ───────────────────────────────────────────────────

  {
    name: 'Pedal and Turn',
    category: 'footwork',
    technique_area: 'backpedal',
    sets: 4, reps: 6, duration: null,
    why: 'The CB backpedals 8-10 yards, then on cue opens the near hip, rips the arm and shoulder through low, and sprints through the hash. The arm-rip through low forces a complete hip flip rather than an abbreviated bail — the foundation of the turn-and-run technique.',
    coaching_cue: 'Open the near hip first, then rip the arm and shoulder through LOW — the shoulder following the arm forces the full flip',
    common_mistake: 'Flipping the upper body without fully opening the hips first — produces a partial turn that bleeds speed on the sprint-out',
    fixes: ['pedal and turn', 'backpedal', 'turn', 'open hips', 'hip flip', 'sprint', 'coverage', 'transition', 'rip'],
    progressions: ['Walk-through arm-rip and hip open at landmark', 'Half-speed pedal + turn to 50% sprint', 'Full-speed both directions on signal'],
    videos: [
      { title: 'Pedal and Turn Drill Cornerback Backpedal Technique', url: 'https://www.youtube.com/results?search_query=pedal+and+turn+drill+cornerback+backpedal+hip+open+football', duration: '~6 min' },
    ],
  },
  {
    name: 'Speed Change Backpedal',
    category: 'footwork',
    technique_area: 'backpedal',
    sets: 3, reps: null, duration: '20 yards each',
    why: 'The CB must accelerate and decelerate within the backpedal as the WR changes stem speed. A CB who pedals at one constant speed telegraphs their break point and gets exploited by double-moves.',
    coaching_cue: 'Match the WR\'s speed — if they slow their stem, you slow your pedal. If they burst, your pedal quickens.',
    common_mistake: 'Pedaling at a fixed speed regardless of the receiver\'s stem tempo — creates a predictable break point the offense can exploit with a double-move',
    fixes: ['backpedal', 'speed change', 'pedal', 'double move', 'tempo', 'stem', 'coverage', 'footwork', 'acceleration'],
    progressions: ['Coach extends/pulls ball to signal speed (slow/fast pedal)', 'Mirror WR\'s stem changes in 1-on-1', 'Full-speed vs route with intentional speed variation'],
    videos: [
      { title: 'Speed Change Backpedal Drill Cornerback Football', url: 'https://www.youtube.com/results?search_query=speed+change+backpedal+drill+cornerback+football+acceleration', duration: '~6 min' },
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

  {
    name: 'Stem / Leverage Pedal',
    category: 'technique',
    technique_area: 'man_coverage',
    sets: 3, reps: 8, duration: null,
    why: 'The WR stems inside, pushes vertical, stems opposite, then breaks a route. The CB must maintain inside leverage through every stem without biting — a CB who loses leverage on a false stem gives up the preferred release lane before the route even starts.',
    coaching_cue: 'Leverage doesn\'t change — your inside shade stays regardless of where they stem. Discipline on the stem.',
    common_mistake: 'Shifting shade to match the WR\'s stem instead of maintaining leverage — gets manipulated into the wrong alignment before the break',
    fixes: ['stem', 'leverage', 'inside leverage', 'pedal', 'route', 'fake', 'man coverage', 'coverage', 'alignment', 'shade'],
    progressions: ['Coach calls stem direction — CB holds leverage (stationary)', 'Live WR stems with CB pedaling', 'Full-speed vs WR route after multiple stem changes'],
    videos: [
      { title: 'Stem Leverage Pedal Drill Cornerback Inside Shade', url: 'https://www.youtube.com/results?search_query=stem+leverage+pedal+drill+cornerback+inside+shade+football', duration: '~7 min' },
    ],
  },
  {
    name: 'Trail Technique — Outside Man Coverage',
    category: 'technique',
    technique_area: 'man_coverage',
    sets: 3, reps: 8, duration: null,
    why: 'The trail technique puts the CB 1 yard behind (arm\'s length) with inside leverage as the WR runs vertically. Honor inside fakes, be patient on outside fakes, and close the gap hard after 12-15 yards. The CB who closes too early gives up the fade; the CB who never closes gives up the comeback.',
    coaching_cue: 'Arm\'s length, inside shade — honor the inside fake, be patient on the outside. You\'ll close at 12.',
    common_mistake: 'Closing too early before 12-15 yards — gets thrown over the top on a vertical or converted fade when the CB tries to jump the comeback',
    fixes: ['trail', 'trail technique', 'inside leverage', 'separation', 'coverage', 'vertical', 'man coverage', 'outside', 'fade', 'comeback'],
    progressions: ['Walk-through spacing and leverage (arm\'s length check)', 'Trail at half-speed, close at 12 on signal', 'Full-speed trail vs WR running vertical/comeback/fade'],
    videos: [
      { title: 'Trail Technique Cornerback Outside Man Coverage Football', url: 'https://www.youtube.com/results?search_query=trail+technique+cornerback+outside+man+coverage+football', duration: '~7 min' },
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

  {
    name: 'Cover 2 Corner Break',
    category: 'technique',
    technique_area: 'zone_coverage',
    sets: 3, reps: 8, duration: null,
    why: 'In Cover 2 the CB jams at the LOS to funnel the WR inside, drops to 12 yards at the numbers, then breaks back over the top on the throw. This is the CB\'s specific zone assignment in a two-deep shell — owning the outside vertical without giving up the flat.',
    coaching_cue: 'Collision, funnel inside, drop to depth at the numbers — break over the top of the cone on the throw. You own the outside vertical.',
    common_mistake: 'Dropping straight back instead of to the numbers landmark — takes the CB out of position to break on both the fade and the comeback',
    fixes: ['Cover 2', 'zone', 'cover 2 corner', 'drop', 'depth', 'collision', 'funnel', 'coverage', 'numbers', 'two-deep', 'fade', 'comeback'],
    progressions: ['Walk-through jam + drop to landmark (no WR)', 'Half-speed Cover 2 corner drop on signal', 'Full-speed vs WR route with QB signal'],
    videos: [
      { title: 'Cover 2 Corner Break Drill Cornerback Zone Football', url: 'https://www.youtube.com/results?search_query=cover+2+corner+break+drill+cornerback+zone+coverage+football', duration: '~7 min' },
    ],
  },

  // ── BALL SKILLS ───────────────────────────────────────────────────────────

  {
    name: 'Strip Drill — Forced Fumble Technique',
    category: 'technique',
    technique_area: 'ball_skills',
    sets: 3, reps: 10, duration: null,
    why: 'After the catch, the CB converts from coverage to ball-stripping before initiating the tackle. Ripping down and raking the ball out is a trainable technique — a forced fumble is one of the highest-value defensive plays in football, and CBs create the most of them.',
    coaching_cue: 'Eyes to the receiver\'s hands on the catch — rip DOWN and rake before you wrap. Ball first, tackle second.',
    common_mistake: 'Going straight into the tackle without attempting to strip — leaving a fumble opportunity on the table every single rep',
    fixes: ['strip', 'strip drill', 'forced fumble', 'fumble', 'ball skills', 'punch', 'rake', 'tackle', 'ball security', 'after catch'],
    progressions: ['Walk-through rip and rake on stationary partner', 'Strip drill on slow-moving ball carrier', 'Full-speed strip drill on live reception'],
    videos: [
      { title: 'Strip Drill Cornerback Forced Fumble Technique Football', url: 'https://www.youtube.com/results?search_query=strip+drill+cornerback+forced+fumble+technique+football', duration: '~6 min' },
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
