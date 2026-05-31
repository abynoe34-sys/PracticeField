/**
 * Fullback (FB) Position Drill Library
 *
 * The fullback is primarily a BLOCKER — not a runner.
 * Primary responsibilities:
 *   1. Lead blocking through the hole (clear the path for the RB)
 *   2. Kick-out blocking (sealing the edge for outside runs)
 *   3. Pass protection (picking up blitzing linebackers)
 *   4. Short-yardage / goal-line carries
 *   5. Check-down catches and outlet route out of the backfield
 *
 * Drill emphasis: blocking mechanics first, ball-carrier skills second.
 */

import type { Exercise } from '@/types'

// ─── Reference Video Type ─────────────────────────────────────────────────────

export interface DrillVideoFB {
  title: string
  url: string
  duration: string
  notes?: string
}

// ─── Technique Areas ──────────────────────────────────────────────────────────

export type FBTechniqueArea =
  | 'lead_block'          // running through the hole, contacting the linebacker
  | 'kick_out_block'      // sealing the edge on outside/sweep runs
  | 'pass_protection'     // picking up blitzers, protecting the QB
  | 'short_yardage'       // goal-line / 4th-and-1 carries
  | 'receiving'           // check-down routes out of the backfield
  | 'conditioning'        // strength and toughness foundation

export type FBDrillCategory = Exercise['category']

// ─── Drill Entry ──────────────────────────────────────────────────────────────

export interface FBDrillEntry {
  name: string
  category: FBDrillCategory
  technique_area: FBTechniqueArea
  sets: number | null
  reps: number | null
  duration: string | null
  why: string
  coaching_cue: string
  common_mistake: string
  fixes: string[]
  progressions: string[]
  videos: DrillVideoFB[]
}

// ─── Full FB Drill Library ────────────────────────────────────────────────────

export const FB_DRILLS: FBDrillEntry[] = [

  // ── LEAD BLOCKING ─────────────────────────────────────────────────────────

  {
    name: 'Lead Block Through the Hole (Chute Drill)',
    category: 'technique',
    technique_area: 'lead_block',
    sets: 4, reps: 8, duration: null,
    why: 'The FB\'s first job on most running plays is to lead through the gap and make contact with the linebacker before the RB arrives. A soft lead block wastes the entire play.',
    coaching_cue: 'Drive out of your stance low, find your target, and run THROUGH the block — never stop your feet',
    common_mistake: 'Slowing down before contact — defenders shed slow lead blockers; full-speed contact through the target is what creates the cutback lane',
    fixes: ['lead block', 'blocking', 'linebacker', 'missed block', 'soft block', 'weak block', 'run blocking', 'through the hole'],
    progressions: ['Chute drive (no contact)', 'Lead block on stationary pad', 'Full-speed live lead block vs linebacker'],
    videos: [
      { title: 'Fullback Lead Block Drill', url: 'https://www.youtube.com/results?search_query=fullback+lead+block+drill+football', duration: '~8 min' },
    ],
  },
  {
    name: 'Fit & Drive Block — Linebacker Engagement',
    category: 'technique',
    technique_area: 'lead_block',
    sets: 4, reps: 8, duration: null,
    why: 'When the FB arrives at the point of contact, hand placement and pad leverage determine whether they move the linebacker or get shed. Hands inside the frame + low pad level = a winning block.',
    coaching_cue: 'Thumbs up, hands inside the frame — then drive your hips and keep your feet moving',
    common_mistake: 'Reaching with the arms and leaning instead of driving with the hips — the defender sheds with one arm when the blocker stops their feet',
    fixes: ['block', 'blocking', 'shed', 'hands', 'leverage', 'pad level', 'linebacker', 'drive block', 'run blocking'],
    progressions: ['Fit position hold (isometric check)', 'Slow-motion fit and 5-step drive', 'Full-speed fit and drive vs live defender'],
    videos: [
      { title: 'Fit and Drive Block Technique Football', url: 'https://www.youtube.com/results?search_query=fit+drive+block+technique+linebacker+football', duration: '~7 min' },
    ],
  },

  // ── KICK-OUT BLOCK ────────────────────────────────────────────────────────

  {
    name: 'Kick-Out Block on the Edge (Seal Drill)',
    category: 'technique',
    technique_area: 'kick_out_block',
    sets: 4, reps: 8, duration: null,
    why: 'On outside runs and sweeps the FB kick-out blocks the end man on the line of scrimmage. A clean kick-out seals the edge and creates the corner for the RB to turn upfield.',
    coaching_cue: 'Attack the inside number — kick their outside hip and seal them inside',
    common_mistake: 'Trying to run past the defender and blocking from behind — must attack the inside number and drive them outside',
    fixes: ['kick out', 'kick-out', 'edge', 'seal', 'outside run', 'sweep', 'corner', 'perimeter'],
    progressions: ['Walk-through angle alignment', 'Half-speed kick-out on bag', 'Full-speed kick-out vs live end'],
    videos: [
      { title: 'Fullback Kick Out Block Drill', url: 'https://www.youtube.com/results?search_query=fullback+kick+out+block+edge+seal+drill', duration: '~7 min' },
    ],
  },

  // ── PASS PROTECTION ───────────────────────────────────────────────────────

  {
    name: 'Pass Protection — Blitz Pickup Drill',
    category: 'technique',
    technique_area: 'pass_protection',
    sets: 4, reps: 8, duration: null,
    why: 'The FB is the last line of protection between a blitzing linebacker and the QB. A missed blitz pickup often results in a sack or fumble. The FB must identify the threat early and be ready to absorb the contact.',
    coaching_cue: 'Wide base, weight back, hands up — catch their rush with your hands, THEN redirect them away from the QB',
    common_mistake: 'Lowering the head and lunging at the blitzer instead of standing tall and redirecting — results in the blitzer running over or around the FB',
    fixes: ['pass protection', 'blitz', 'blitz pickup', 'sack', 'missed block', 'linebacker', 'protection'],
    progressions: ['Stationary punch-and-redirect drill', 'Blitz pickup vs walk-in rusher', 'Full-speed blitz pickup vs linebacker'],
    videos: [
      { title: 'Fullback Blitz Pickup Pass Protection Drill', url: 'https://www.youtube.com/results?search_query=fullback+blitz+pickup+pass+protection+drill', duration: '~8 min' },
    ],
  },
  {
    name: 'Kick Slide & Anchor (Pass Pro Footwork)',
    category: 'footwork',
    technique_area: 'pass_protection',
    sets: 3, reps: 10, duration: null,
    why: 'Pass protection requires the FB to mirror the rusher\'s path and reset their base before contact. The kick-slide sequence — used by all pass protectors — prevents over-pursuing and losing leverage.',
    coaching_cue: 'Kick the outside foot first, slide the inside foot to reset your base — never cross your feet',
    common_mistake: 'Crossing the feet or taking overly large steps — makes the blocker easy to spin or swim past',
    fixes: ['footwork', 'pass protection', 'kick slide', 'leverage', 'anchor', 'feet', 'crossing feet'],
    progressions: ['Mirror kick-slide on line (no contact)', 'Kick-slide vs stationary bag', 'Full-speed vs pass rusher'],
    videos: [
      { title: 'Kick Slide Pass Protection Footwork', url: 'https://www.youtube.com/results?search_query=kick+slide+pass+protection+footwork+football', duration: '~6 min' },
    ],
  },

  // ── SHORT YARDAGE / GOAL LINE ─────────────────────────────────────────────

  {
    name: 'Short Yardage Power Run — Drive Through Contact',
    category: 'technique',
    technique_area: 'short_yardage',
    sets: 4, reps: 8, duration: null,
    why: 'When the FB gets the ball in short-yardage situations, the play is won or lost at the point of contact — not before it. Low pad level, high knee drive, and finishing through the tackle makes the difference between a 1st down and a stop.',
    coaching_cue: 'Head up, pads low, pump your knees through contact — fall forward',
    common_mistake: 'Bracing for contact and slowing down before the line — defenders stop the play when the ballcarrier stops driving',
    fixes: ['short yardage', 'goal line', 'carry', 'ball carrier', 'run', 'drive', 'contact', '4th and 1', 'first down'],
    progressions: ['Drive-through-pad drill', 'Short-yardage isolation run', 'Goal-line full-speed carry vs defense'],
    videos: [
      { title: 'Fullback Short Yardage Goal Line Carry Drill', url: 'https://www.youtube.com/results?search_query=fullback+short+yardage+goal+line+carry+drill', duration: '~7 min' },
    ],
  },
  {
    name: 'Ball Security Under Contact (4-Point Carry)',
    category: 'technique',
    technique_area: 'short_yardage',
    sets: 3, reps: null, duration: '5 minutes',
    why: 'Short-yardage carries put the FB in heavy traffic with multiple defenders attacking the ball. Fumbles in these situations are drive-killers. The four-point carry must be automatic.',
    coaching_cue: 'Fingertips over the tip, forearm under, bicep squeeze, tuck to chest — secure all four points before you lower your pad',
    common_mistake: 'Carrying the ball with one arm extended — one clean strip attempt takes it away',
    fixes: ['ball security', 'fumble', 'strip', 'carry', 'ball', 'protect ball', 'contact'],
    progressions: ['Static 4-point grip check', 'Walk-through gauntlet', 'Full-speed gauntlet vs defenders'],
    videos: [
      { title: 'Ball Security Gauntlet Drill Fullback', url: 'https://www.youtube.com/results?search_query=ball+security+gauntlet+drill+fullback+running+back', duration: '~6 min' },
    ],
  },

  // ── RECEIVING ─────────────────────────────────────────────────────────────

  {
    name: 'Check-Down Route out of Backfield (FB)',
    category: 'technique',
    technique_area: 'receiving',
    sets: 3, reps: 10, duration: null,
    why: 'FBs are often the QB\'s safety valve on passing downs. A clean release, proper check-down depth (5–8 yards flat or angle), and secure hands turn a checkdown into a positive gain.',
    coaching_cue: 'Release flat into the flat, get your eyes back to the QB immediately — be a target',
    common_mistake: 'Running too deep or cutting inside — the FB check-down must be quick and available, not a contested route',
    fixes: ['receiving', 'check down', 'route', 'catch', 'pass', 'target', 'backfield', 'outlet'],
    progressions: ['Route walk-through with coach', 'Check-down route vs air', 'Check-down route vs live linebacker coverage'],
    videos: [
      { title: 'Fullback Check Down Route Receiving Drill', url: 'https://www.youtube.com/results?search_query=fullback+check+down+route+receiving+backfield', duration: '~6 min' },
    ],
  },

  // ── CONDITIONING & FOUNDATION ─────────────────────────────────────────────

  {
    name: 'Sled Push — FB Power Foundation',
    category: 'strength',
    technique_area: 'conditioning',
    sets: 5, reps: null, duration: '10 yards each',
    why: 'Every lead block and pass-protection rep is a pushing contest. Sled pushes build the functional strength and drive mechanics used in every live blocking rep the FB takes.',
    coaching_cue: 'Stay low — if you can see over the sled, your hips are too high',
    common_mistake: 'Standing upright and pushing with the arms only — must drive from the legs with a forward lean to generate real blocking power',
    fixes: ['strength', 'blocking', 'power', 'weak block', 'push', 'drive', 'conditioning'],
    progressions: ['Light sled — form focus', 'Moderate sled — speed focus', 'Heavy sled — max strength'],
    videos: [
      { title: 'Sled Push Power Training Blocker Football', url: 'https://www.youtube.com/results?search_query=sled+push+power+blocker+fullback+football', duration: '~7 min' },
    ],
  },
  {
    name: 'Trap & Pull Block Read Drill',
    category: 'technique',
    technique_area: 'lead_block',
    sets: 3, reps: 8, duration: null,
    why: 'On trap and counter plays the FB must read the pulling guard and hit the correct gap at full speed. Hesitation or wrong-gap errors expose the RB with no blocker in front.',
    coaching_cue: 'Read the guard\'s pull path, press the gap hard, and get there before the defender closes',
    common_mistake: 'Waiting to see where the hole opens instead of attacking decisively — indecision kills the play timing',
    fixes: ['read', 'trap', 'pull', 'gap', 'counter', 'blocking scheme', 'timing', 'hesitation'],
    progressions: ['Walk-through scheme identification', 'Half-speed trap read drill', 'Full-speed vs live defense'],
    videos: [
      { title: 'Trap Pull Block Read Drill Fullback', url: 'https://www.youtube.com/results?search_query=trap+pull+block+read+drill+fullback+football', duration: '~7 min' },
    ],
  },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function findFBDrillsForPainPoint(painPoint: string): FBDrillEntry[] {
  const lower = painPoint.toLowerCase()
  return FB_DRILLS.filter(d =>
    d.fixes.some(fix => lower.includes(fix) || fix.includes(lower.split(' ')[0]))
  ).slice(0, 4)
}

export function fbDrillToExercise(drill: FBDrillEntry): Exercise {
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
