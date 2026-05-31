/**
 * Nickelback (NB) Position Drill Library
 *
 * The Nickelback is the 5th defensive back deployed in passing situations
 * (3+ WR sets). Unlike an outside CB, the NB covers the SLOT receiver —
 * a quicker, shiftier target who runs more intermediate routes (slants,
 * crossers, drags, stick routes).
 *
 * The NB is a hybrid CB/LB:
 *   - Must cover like a CB (man-to-man in tight quarters, zone drops)
 *   - Must tackle like a LB (slot WRs often become ball carriers after the catch)
 *   - Must blitz when called (quick off the edge or through the A/B gap)
 *   - Must support run defense when aligned near the box
 *
 * Drill emphasis: quickness and hip fluidity first, open-field tackling second.
 */

import type { Exercise } from '@/types'

export interface DrillVideoNB {
  title: string
  url: string
  duration: string
  notes?: string
}

export type NBTechniqueArea =
  | 'slot_coverage'       // man and zone coverage on slot WR
  | 'press_release'       // jamming slot WR at the line
  | 'zone_drop'           // hook-curl and flat drops in nickel packages
  | 'run_support'         // open-field tackling and run fits from slot position
  | 'blitz'               // delayed blitz and gap-blitz paths from the slot
  | 'pick_route_defense'  // recognising and navigating rub/pick/mesh routes
  | 'conditioning'        // lateral quickness and burst foundation

export type NBDrillCategory = Exercise['category']

export interface NBDrillEntry {
  name: string
  category: NBDrillCategory
  technique_area: NBTechniqueArea
  sets: number | null
  reps: number | null
  duration: string | null
  why: string
  coaching_cue: string
  common_mistake: string
  fixes: string[]
  progressions: string[]
  videos: DrillVideoNB[]
}

export const NB_DRILLS: NBDrillEntry[] = [

  // ── SLOT COVERAGE — MAN ───────────────────────────────────────────────────

  {
    name: 'Slot Man Coverage — Trail Technique',
    category: 'technique',
    technique_area: 'slot_coverage',
    sets: 4, reps: 8, duration: null,
    why: 'Slot WRs are aligned inside and release at close range — the NB cannot afford to give deep cushion like an outside CB. Trail technique (hip-to-hip, inside shade) keeps the NB in contact through the route.',
    coaching_cue: 'Inside shade, hip to hip — you\'re in his pocket the whole route. Don\'t let him stack you.',
    common_mistake: 'Playing too much cushion on the slot — gives the WR a free release and an easy catch on short routes',
    fixes: ['coverage', 'slot', 'man coverage', 'separation', 'cushion', 'short routes', 'slant', 'drag', 'trail'],
    progressions: ['Walk-through alignment and shade', 'Trail technique vs air routes', 'Full-speed trail vs live slot WR'],
    videos: [
      { title: 'Nickelback Slot Man Coverage Trail Technique', url: 'https://www.youtube.com/results?search_query=nickelback+slot+man+coverage+trail+technique+football', duration: '~8 min' },
    ],
  },
  {
    name: 'Hip Flip in Space — Slot Turn Drill',
    category: 'footwork',
    technique_area: 'slot_coverage',
    sets: 4, reps: 8, duration: null,
    why: 'Slot WRs make their break in tight quarters and at full speed. The NB must flip the hips sharply in a small space without losing ground — the same hip flip as an outside CB but in a compressed zone.',
    coaching_cue: 'Low elbow, lead foot 180° — flip and go. Don\'t waste a step gathering yourself.',
    common_mistake: 'Taking an extra gather step before the turn — gives the slot WR a full step of separation on every breaking route',
    fixes: ['hip flip', 'turn', 'hips', 'break', 'footwork', 'separation', 'slow turn', 'coverage', 'slot'],
    progressions: ['Mirror hip-flip form drill (stationary)', 'Hip flip to sprint (10 yards)', 'Hip flip in man coverage on slot WR'],
    videos: [
      { title: 'Hip Flip Slot Coverage Drill Nickelback', url: 'https://www.youtube.com/results?search_query=hip+flip+slot+coverage+drill+defensive+back+nickel', duration: '~7 min' },
    ],
  },
  {
    name: 'Mirror Drill — Slot Quickness',
    category: 'footwork',
    technique_area: 'slot_coverage',
    sets: 4, reps: null, duration: '30 seconds each',
    why: 'Slot receivers are among the quickest players on the field. The NB\'s lateral quickness must match or exceed the slot WR\'s cutting speed. Mirror drills build the reactive agility needed to stay in phase.',
    coaching_cue: 'Read the hips, not the feet — the feet will fool you, the hips tell you the truth',
    common_mistake: 'Reading the WR\'s head or shoulder fake instead of the hip — gets juked on every sharp cut',
    fixes: ['quickness', 'lateral', 'agility', 'juked', 'mirror', 'slot', 'cut', 'reactive', 'coverage', 'footwork'],
    progressions: ['Lateral slide mirror (low speed)', 'Game-speed mirror with hip read', 'Mirror drill vs live slot WR with full route'],
    videos: [
      { title: 'Mirror Drill Slot Coverage Nickelback', url: 'https://www.youtube.com/results?search_query=mirror+drill+slot+receiver+coverage+nickelback+football', duration: '~6 min' },
    ],
  },

  // ── PRESS RELEASE AT THE LINE ─────────────────────────────────────────────

  {
    name: 'Press Jam on Slot WR (Inside Alignment)',
    category: 'technique',
    technique_area: 'press_release',
    sets: 3, reps: 8, duration: null,
    why: 'When the NB presses the slot, they must jam from an inside shade — not straight up like an outside CB. The goal is to redirect the slot WR\'s stem inside-out to eliminate the quick slant window.',
    coaching_cue: 'Press from inside shade — punch the outside shoulder to force them to widen before their release',
    common_mistake: 'Aligning head-up and jamming straight — opens the slant window immediately and allows a free inside release',
    fixes: ['press', 'jam', 'release', 'slot', 'slant', 'inside', 'quick game', 'stem', 'redirect'],
    progressions: ['Walk-through alignment + jam form', 'Press jam on stationary WR', 'Live press vs slot WR with full release'],
    videos: [
      { title: 'Press Coverage Slot WR Nickelback Technique', url: 'https://www.youtube.com/results?search_query=press+coverage+slot+receiver+nickelback+inside+shade', duration: '~7 min' },
    ],
  },

  // ── ZONE DROPS ────────────────────────────────────────────────────────────

  {
    name: 'Hook-Curl Zone Drop (Nickel Package)',
    category: 'footwork',
    technique_area: 'zone_drop',
    sets: 4, reps: 8, duration: null,
    why: 'In Cover 2 and Cover 3 nickel packages the NB often owns the hook-curl window — protecting the intermediate middle against crossing routes and dig routes. Proper depth (8–12 yards) and hands-up positioning are critical.',
    coaching_cue: 'Drop at 45 degrees to your landmark, eyes on the QB — break to the ball on the throw, not on the route',
    common_mistake: 'Dropping straight back instead of at an angle — narrows the coverage window and allows the crosser to run behind',
    fixes: ['zone', 'hook curl', 'zone drop', 'crossing route', 'dig', 'intermediate', 'depth', 'coverage'],
    progressions: ['Walk-through zone landmark drill', 'Drop + react to QB throw signal', 'Full-speed zone vs live crossing WR'],
    videos: [
      { title: 'Hook Curl Zone Drop Nickelback Football', url: 'https://www.youtube.com/results?search_query=hook+curl+zone+drop+nickelback+coverage+football', duration: '~8 min' },
    ],
  },
  {
    name: 'Flat Zone Ownership Drill',
    category: 'technique',
    technique_area: 'zone_drop',
    sets: 3, reps: 8, duration: null,
    why: 'On Cover 2 the NB often owns the flat zone — responsible for the out route, the flat route, and the check-down to the RB. The NB must squeeze the flat without vacating the hook-curl window.',
    coaching_cue: 'Squeeze the flat — collision any route coming into your zone, then rally to the flat on the throw',
    common_mistake: 'Dropping too deep and leaving the flat wide open — the offense will attack the flat all game',
    fixes: ['flat', 'flat zone', 'out route', 'check down', 'short pass', 'zone', 'coverage', 'Cover 2'],
    progressions: ['Walk-through flat landmark', 'React-to-throw flat drill', 'Full zone vs multiple route combinations'],
    videos: [
      { title: 'Flat Zone Coverage Drill Nickelback DB', url: 'https://www.youtube.com/results?search_query=flat+zone+coverage+drill+nickelback+defensive+back', duration: '~7 min' },
    ],
  },

  // ── PICK ROUTE DEFENSE ────────────────────────────────────────────────────

  {
    name: 'Pick / Rub Route Recognition Drill',
    category: 'technique',
    technique_area: 'pick_route_defense',
    sets: 3, reps: 8, duration: null,
    why: 'Slot WRs run more pick, mesh, and rub routes than any position on the field — specifically designed to free them up at the expense of the NB. Recognising the pick early and communicating "rub!" to teammates is the only reliable defense.',
    coaching_cue: 'See two receivers crossing your zone — call "rub!" and switch immediately. Never chase a WR into a pick.',
    common_mistake: 'Following the assigned WR into the rub instead of switching — results in illegal contact or a wide-open receiver',
    fixes: ['pick', 'rub', 'mesh', 'crossing', 'switch', 'pick route', 'slot', 'coverage', 'communication'],
    progressions: ['Walk-through rub recognition (identify and call)', 'Half-speed switch drill with partner', 'Full-speed pick route vs two WRs'],
    videos: [
      { title: 'Pick Route Recognition Drill Slot Coverage', url: 'https://www.youtube.com/results?search_query=pick+route+recognition+drill+slot+coverage+nickelback', duration: '~8 min' },
    ],
  },

  // ── RUN SUPPORT & OPEN-FIELD TACKLING ─────────────────────────────────────

  {
    name: 'Open-Field Tackle — Slot Run Support',
    category: 'technique',
    technique_area: 'run_support',
    sets: 4, reps: 8, duration: null,
    why: 'When a slot WR catches a short pass or carries on a jet sweep, the NB is often the unblocked defender in space. Open-field tackling is a defining skill that separates good NBs from great ones.',
    coaching_cue: 'Shorten your stride as you approach, press the inside hip — force them into the sideline or make the tackle',
    common_mistake: 'Running full-speed at the ball carrier and lunging — gets juked or broken for a big gain',
    fixes: ['tackle', 'open field', 'run support', 'miss tackle', 'broken tackle', 'jet sweep', 'slot run', 'space'],
    progressions: ['Approach and fit drill (stationary)', 'Open-field tackle on slow ball carrier', 'Full-speed open-field tackle'],
    videos: [
      { title: 'Open Field Tackle Drill Defensive Back Nickelback', url: 'https://www.youtube.com/results?search_query=open+field+tackle+drill+defensive+back+nickelback', duration: '~7 min' },
    ],
  },
  {
    name: 'Run Fit — Slot Position Box Responsibility',
    category: 'technique',
    technique_area: 'run_support',
    sets: 3, reps: 8, duration: null,
    why: 'In nickel packages the NB replaces a linebacker. On run plays the NB must fill the correct gap — typically the D-gap on the strong side or the B-gap in a box blitz. Wrong-gap fills lead to cutback lanes and big runs.',
    coaching_cue: 'Read the guard — if he pulls, follow the pull. If he sets for pass pro on a run, attack your gap downhill.',
    common_mistake: 'Hesitating at the edge instead of filling aggressively — linebackers and DBs who hesitate on run fits get blocked at the LOS',
    fixes: ['run fit', 'gap', 'run support', 'run defense', 'blitz', 'fill', 'cutback', 'linebacker', 'nickel run'],
    progressions: ['Walk-through gap assignment identification', 'Run fit vs blockers at half-speed', 'Full-speed run fit vs live offense'],
    videos: [
      { title: 'Nickelback Run Fit Box Responsibility Drill', url: 'https://www.youtube.com/results?search_query=nickelback+run+fit+box+responsibility+drill+football', duration: '~7 min' },
    ],
  },

  // ── BLITZ PATHS ───────────────────────────────────────────────────────────

  {
    name: 'Slot Blitz — Edge / B-Gap Path Drill',
    category: 'technique',
    technique_area: 'blitz',
    sets: 3, reps: 8, duration: null,
    why: 'The NB blitz is one of the most effective in football — the slot WR can\'t block the NB, so he arrives unblocked if the timing is right. The path must be tight off the guard\'s hip and the NB must convert speed-to-power at the QB.',
    coaching_cue: 'Disguise until the snap, then attack the gap full-speed — flat path, do not loop wide',
    common_mistake: 'Tipping the blitz early by cheating toward the line before the snap — gives the QB and OL time to adjust and pick up the blitz',
    fixes: ['blitz', 'slot blitz', 'pass rush', 'pressure', 'gap', 'sack', 'disguise', 'nickel blitz'],
    progressions: ['Walk-through blitz path (identify gap, simulate arrival)', 'Blitz vs stationary QB', 'Full-speed blitz vs live QB with protection'],
    videos: [
      { title: 'Nickelback Slot Blitz Path Drill Football', url: 'https://www.youtube.com/results?search_query=nickelback+slot+blitz+path+drill+football', duration: '~7 min' },
    ],
  },

  // ── CONDITIONING ─────────────────────────────────────────────────────────

  {
    name: 'W Drill — NB Lateral Quickness',
    category: 'agility',
    technique_area: 'conditioning',
    sets: 4, reps: 1, duration: null,
    why: 'The W Drill is the gold standard for DB and NB lateral change-of-direction speed. It trains the backpedal, break, and burst sequence used on every coverage rep the NB takes.',
    coaching_cue: 'Pedal with purpose — on the break, low elbow, open the hips and accelerate immediately',
    common_mistake: 'Upright backpedal with the weight on the heels — makes every break slow and reactive instead of explosive',
    fixes: ['lateral', 'agility', 'quickness', 'backpedal', 'break', 'coverage', 'change of direction', 'speed'],
    progressions: ['W drill at 70% — technique focus', 'W drill at full speed', 'W drill vs live WR route'],
    videos: [
      { title: 'W Drill Defensive Back Nickelback Agility', url: 'https://www.youtube.com/watch?v=OkN5JKFuXqU', duration: '~6 min' },
    ],
  },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function findNBDrillsForPainPoint(painPoint: string): NBDrillEntry[] {
  const lower = painPoint.toLowerCase()
  return NB_DRILLS.filter(d =>
    d.fixes.some(fix => lower.includes(fix) || fix.includes(lower.split(' ')[0]))
  ).slice(0, 4)
}

export function nbDrillToExercise(drill: NBDrillEntry): Exercise {
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
