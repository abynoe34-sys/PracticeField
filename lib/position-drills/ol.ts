/**
 * Offensive Line (OL) Drill Library
 *
 * Sources:
 *  - Paul Alexander (NFL OL Coach): BLAST system, Blocking Mechanics videos
 *  - Jim McNally (NFL OL Coach): Mid-Zone Concepts, Zone Running Game
 *  - Marty Costello (OL Coach, Winnipeg Blue Bombers): Zone Running Adjustments
 *  - Oklahoma OL Drills series
 *  - Numbered clinic series: BLAST Keys to Playing with Leverage (01101),
 *    CUFF Progressions (01102), Level 1 Contact/Fits (01103), Uncoil/Iron Core/
 *    Come to Balance/Coil Stance series (01201-01205)
 *  - McClanathan (Drake Univ): IZ game planning, pass pro, counter scheme
 *  - McPeek (Frederick Douglass HS): run block progression
 *  - Clowes (Utica College): pass pro from the ground up, Half Man/Half Slide
 *  - Vassil (Becker College): OL fundamentals, philosophy, techniques
 *  - Leonard (Clear Lake HS): OL drill work, twist pick-up technique
 */

export type OLTechniqueArea =
  | 'stance_coil'
  | 'get_off'
  | 'hand_placement'
  | 'run_blocking'
  | 'pass_protection'
  | 'zone_blocking'
  | 'pull_technique'

export interface OLDrillEntry {
  name: string
  technique_area: OLTechniqueArea
  coaching_cue: string
  why: string
  common_mistake: string
  fixes: string[]
  sets?: string
  reps?: string
  duration?: string
  progressions: string[]
  videos: { title: string; url: string; duration: string }[]
}

export interface OLTeachingStep {
  order: number
  topic: string
  technique_area: OLTechniqueArea
  keyPoints: string[]
  techniques?: { name: string; bestFor: string; cues: string[] }[]
}

// ─── Area Labels ──────────────────────────────────────────────────────────────

export const OL_AREA_LABELS: Record<OLTechniqueArea, string> = {
  stance_coil:      'Stance & Coil',
  get_off:          'Get-Off & First Step',
  hand_placement:   'Hand Placement',
  run_blocking:     'Run Blocking',
  pass_protection:  'Pass Protection',
  zone_blocking:    'Zone Blocking',
  pull_technique:   'Pull & Trap',
}

// ─── Drill Library ─────────────────────────────────────────────────────────────

export const OL_DRILLS: OLDrillEntry[] = [
  // ── Stance & Coil ───────────────────────────────────────────────────────────
  {
    name: '3-Point Coil Stance',
    technique_area: 'stance_coil',
    coaching_cue: 'Coil like a spring — knees inside ankles, chest up, fingertips only',
    why: 'The coil stance pre-loads hip and knee flexion so the lineman can uncoil violently on the snap, generating maximum power from the ground up.',
    common_mistake: 'Sitting back on heels or locking the knees, which kills explosion and makes the first step flat-footed.',
    fixes: ['stance', 'get off', 'slow first step', 'upright pad level'],
    sets: '4',
    reps: '8',
    progressions: [
      'Get into 3-point stance, hold coil, focus on weight distribution over balls of feet',
      'Add snap count — uncoil on first sound, freeze after first step',
      'Full reps: coil → uncoil → drive through bag or partner',
    ],
    videos: [
      { title: '3-Point Coil Stance (01204)', url: 'https://www.youtube.com/watch?v=placeholder_01204', duration: 'Clinic' },
    ],
  },
  {
    name: '2-Point Coil Stance',
    technique_area: 'stance_coil',
    coaching_cue: 'Athletic position — knees bent, hips loaded, arms ready to punch',
    why: 'Two-point stance for interior linemen in spread or pass-heavy looks. Teaches the same hip-loaded readiness as the three-point without telegraphing run/pass.',
    common_mistake: 'Standing upright and losing hip load — results in a slow, high initial contact.',
    fixes: ['stance', 'pad level', 'pass protection initial contact'],
    sets: '3',
    reps: '10',
    progressions: [
      'Start in 2-point, hold for 3 seconds checking knee bend and weight forward',
      'React to snap cadence, fire first step on movement',
      'Combine with sled punch reps from 2-point',
    ],
    videos: [
      { title: '2-Point Coil Stance (01205)', url: 'https://www.youtube.com/watch?v=placeholder_01205', duration: 'Clinic' },
    ],
  },
  {
    name: 'Come to Balance / Iron Core Posture',
    technique_area: 'stance_coil',
    coaching_cue: 'Reset to posture after every block — feet hot, iron core',
    why: 'Maintains athletic pad level and balance throughout a block, preventing being stood up late in a block. Jim McNally emphasizes "iron core" posture as the foundation of every zone rep.',
    common_mistake: 'Losing pad level and rising after initial contact, allowing the defender to disengage.',
    fixes: ['pad level', 'stance', 'sustain block', 'balance'],
    sets: '3',
    reps: '8',
    progressions: [
      'Iron Core isometric hold: 3-point stance, hold balanced posture 5 sec',
      'Rolling Meatball drill: maintain posture while rolling weight from foot to foot',
      'Partner push: partner applies pressure while lineman holds iron core position',
    ],
    videos: [
      { title: 'Iron Core (01202)', url: 'https://www.youtube.com/watch?v=placeholder_01202', duration: 'Clinic' },
      { title: 'Come to Balance Posture (01203)', url: 'https://www.youtube.com/watch?v=placeholder_01203', duration: 'Clinic' },
    ],
  },

  // ── Get-Off & First Step ───────────────────────────────────────────────────
  {
    name: 'BLAST Get-Off (Keys to Playing with Leverage)',
    technique_area: 'get_off',
    coaching_cue: 'Explode low — pad under pad, first step attack, not step back',
    why: 'The BLAST system (Paul Alexander) teaches that leverage is won on the first step. A low, flat first step with pads below the defender\'s pads is the single biggest predictor of winning the block.',
    common_mistake: 'False stepping backward or rising on the first step, giving the defender a leverage advantage immediately.',
    fixes: ['get off', 'first step', 'leverage', 'pad level'],
    sets: '5',
    reps: '5',
    progressions: [
      'Stance only: fire out on cadence, land first step without a bag',
      'Get-off to bag: explode and land strike on stationary bag',
      'BLAST under chute: forces low pad level on first two steps',
      'Live get-off: react to ball movement, not cadence',
    ],
    videos: [
      { title: 'BLAST Keys to Playing with Leverage (01101)', url: 'https://www.youtube.com/watch?v=placeholder_01101', duration: 'Clinic' },
      { title: 'Blocking Mechanics by Paul Alexander (NFL OL Coach)', url: 'https://www.youtube.com/watch?v=placeholder_paul_alex', duration: 'Full' },
    ],
  },
  {
    name: 'CUFF Progressions (Contact, Uncoil, Finish, Follow-through)',
    technique_area: 'get_off',
    coaching_cue: 'Contact triggers uncoil — don\'t stop at fit, finish through the block',
    why: 'Paul Alexander\'s CUFF system breaks blocking into four teachable phases. Most young linemen only practice "fit" and never practice "finish" — CUFF forces reps through all four phases.',
    common_mistake: 'Stopping at fit position without driving through the block, or losing pad level on the uncoil.',
    fixes: ['first step', 'contact timing', 'drive', 'finish block'],
    sets: '4',
    reps: '6',
    progressions: [
      'Contact only: fire out and fit hands on partner/sled — freeze',
      'Uncoil: from fit, violently extend hips while maintaining hand placement',
      'Finish: drive the defender 3 yards, stay square through the whistle',
      'Full CUFF: cadence → Contact → Uncoil → Finish → Follow-through reset',
    ],
    videos: [
      { title: 'CUFF Progressions (01102)', url: 'https://www.youtube.com/watch?v=placeholder_01102', duration: 'Clinic' },
      { title: 'Blocking Mechanics 2 by Paul Alexander', url: 'https://www.youtube.com/watch?v=placeholder_paul_alex2', duration: 'Full' },
    ],
  },
  {
    name: 'Uncoil Drill Series',
    technique_area: 'get_off',
    coaching_cue: 'Hips are the engine — uncoil from ground up, not arms-first',
    why: 'Teaching the uncoil phase in isolation ensures linemen use their legs and hips — not just arms — to generate power through the block. Fixes the common "arm-blocker" flaw.',
    common_mistake: 'Shooting arms without hip extension, producing a weak push that is easily shed.',
    fixes: ['drive', 'hand placement', 'hip explosion', 'sustain block'],
    sets: '3',
    reps: '8',
    progressions: [
      'On-knee punch: from both knees, shoot hands and extend hips',
      'One-knee punch: from dominant knee down, add lower-body rotation',
      'Full uncoil: from 3-point stance, step-shoot-extend-drive',
    ],
    videos: [
      { title: 'Uncoil Videos Series (013)', url: 'https://www.youtube.com/watch?v=placeholder_013', duration: 'Clinic' },
    ],
  },

  // ── Hand Placement ─────────────────────────────────────────────────────────
  {
    name: 'Sled "Hands" Progression',
    technique_area: 'hand_placement',
    coaching_cue: 'Thumbs up, inside the frame — grab cloth, not air',
    why: 'Correct hand placement (inside, thumbs-up, on the breastplate) is the most-officiated technique in football. The sled progression builds muscle memory for proper striking and placement through isolated, progressive reps.',
    common_mistake: 'Hands wide, thumbs down, or on the shoulders — all result in holding calls or lost leverage.',
    fixes: ['hand placement', 'holding penalties', 'punch', 'leverage'],
    sets: '4',
    reps: '10',
    progressions: [
      'On knee, inside hand punches only (alternate)',
      'On knee, both hands simultaneously — freeze at extension',
      'Two-point stance: shoot hands, extend, bring hips through',
      'Three-point explosion: punch → uncoil → drive → disengage and reset',
    ],
    videos: [
      { title: 'Oklahoma OL Drills', url: 'https://www.youtube.com/watch?v=placeholder_oklahoma', duration: 'Full' },
    ],
  },
  {
    name: 'Level 1 Contact (Fits)',
    technique_area: 'hand_placement',
    coaching_cue: 'Get to fit position before the ball — not after contact',
    why: 'Level 1 Contact teaches linemen to establish proper hand placement in the "fit" position before driving. Builds the body memory of where hands belong on every block type.',
    common_mistake: 'Reaching or grabbing rather than punching inside — results in "arm-tackling" attempts at block.',
    fixes: ['hand placement', 'contact', 'punch', 'initial block'],
    sets: '4',
    reps: '8',
    progressions: [
      'Fit position walk-through: partner starts at fit, hold 3 sec, check hand position',
      'Three-whistle drill: stance → fit (1st whistle) → extend (2nd) → disengage (3rd)',
      'Fit against moving bag held by coach',
    ],
    videos: [
      { title: 'Level 1 Contact Fits (01103)', url: 'https://www.youtube.com/watch?v=placeholder_01103', duration: 'Clinic' },
      { title: 'Level 1 Contact - BLAST Clinic Overview (01104)', url: 'https://www.youtube.com/watch?v=placeholder_01104', duration: 'Clinic' },
    ],
  },

  // ── Run Blocking ───────────────────────────────────────────────────────────
  {
    name: 'Finish Drill (Drive & Sustain)',
    technique_area: 'run_blocking',
    coaching_cue: 'Feet don\'t stop until the whistle — sprint through the block',
    why: 'Most run plays are won or lost in the 2-yard window after initial contact. The Finish drill trains linemen to maintain leverage and keep driving through the defender rather than stopping at contact.',
    common_mistake: 'Stopping feet after first contact or standing up at the point of attack.',
    fixes: ['sustain block', 'drive', 'finish block', 'pad level'],
    sets: '4',
    reps: '6',
    progressions: [
      'Sled drive: from fit, push sled 5 yards without losing pad level',
      'Partner drive: live partner offers controlled resistance, drive to cone',
      'Finish with shed: drive 3 yards, disengage on command, reset',
    ],
    videos: [
      { title: 'Finish Videos Series (015)', url: 'https://www.youtube.com/watch?v=placeholder_015', duration: 'Clinic' },
      { title: 'OL Run Block Progression — McPeek', url: 'https://www.youtube.com/watch?v=placeholder_mcpeek', duration: 'Clinic' },
    ],
  },
  {
    name: 'Double Team / Combo Block',
    technique_area: 'run_blocking',
    coaching_cue: 'Hip-to-hip, move the DL — one releases to linebacker',
    why: 'The combo block is the foundational unit of inside zone. Both linemen must fire as one, move the down defender, then one "peels" to the second level. Timing and communication are as important as technique.',
    common_mistake: 'Releasing the combination too early to the linebacker before controlling the down lineman.',
    fixes: ['combo block', 'double team', 'zone blocking', 'linebacker'],
    sets: '3',
    reps: '6',
    progressions: [
      'Walk-through: two linemen fit on one bag, find hip-to-hip alignment',
      'Drive phase: move bag 3 yards together without either lineman standing up',
      'Release cue: one releases on coach signal while the other sustains',
      'Live combo vs scout DL with linebacker depth',
    ],
    videos: [
      { title: 'OL Fundamentals, Philosophy & Techniques — Vassil', url: 'https://www.youtube.com/watch?v=placeholder_vassil', duration: 'Clinic' },
    ],
  },

  // ── Pass Protection ────────────────────────────────────────────────────────
  {
    name: 'Pass Pro Kick-Slide',
    technique_area: 'pass_protection',
    coaching_cue: 'Kick outside foot, slide inside foot — never cross your feet',
    why: 'The kick-slide is the fundamental movement of vertical pass protection. It sets an outside landmark, keeps feet active, and positions the lineman to absorb the pass rusher\'s attack without overcommitting.',
    common_mistake: 'Crossing feet or retreating straight back, both of which destroy balance and allow spin/swim moves.',
    fixes: ['pass protection', 'kick slide', 'footwork', 'balance'],
    sets: '4',
    reps: '8',
    progressions: [
      'Mirror drill: kick-slide without contact, mirroring partner laterally',
      'Kick-slide vs speed rush: maintain landmark while partner goes around',
      'Add punch: kick-slide and punch inside on contact point',
      'Full set: cadence → kick-slide → punch → sustain or redirect',
    ],
    videos: [
      { title: 'Pass Pro Talk — JB Wells', url: 'https://www.youtube.com/watch?v=placeholder_jb_wells', duration: 'Clinic' },
      { title: 'Teaching Pass Pro Technique from the Ground Up — Clowes', url: 'https://www.youtube.com/watch?v=placeholder_clowes', duration: 'Clinic' },
    ],
  },
  {
    name: 'Half-Man / Half-Slide Pass Protection',
    technique_area: 'pass_protection',
    coaching_cue: 'Give half your body to the rusher — take the inside half away',
    why: 'The half-man technique (Jerrod Clowes, Utica College) teaches linemen to set inside landmarks and force the rusher to an outside track. Prevents the dangerous inside counter after an outside speed rush.',
    common_mistake: 'Giving the full body or over-setting outside, leaving the inside lane exposed for a counter.',
    fixes: ['pass protection', 'inside counter', 'punch', 'leverage'],
    sets: '3',
    reps: '6',
    progressions: [
      'Footwork only: set half-man landmark, hold for 3 seconds',
      'Half-man vs speed rush: force rusher outside, redirect',
      'Half-man vs inside counter: jam inside after setting outside leverage',
    ],
    videos: [
      { title: 'Half Man-Half Slide Pass Protection — Clowes (Utica College)', url: 'https://www.youtube.com/watch?v=placeholder_clowes', duration: 'Clinic' },
    ],
  },
  {
    name: 'Twist / Stunt Pick-Up Drill',
    technique_area: 'pass_protection',
    coaching_cue: 'Pass off the looper — your gap first, trade on the stunt',
    why: 'Twist pick-up is the most-missed protection adjustment at all levels. Linemen must recognize, communicate, and execute a trade without creating a seam to the quarterback.',
    common_mistake: 'Chasing the first rusher through the gap instead of keeping inside leverage and passing off the looper.',
    fixes: ['stunt', 'pass protection', 'communication', 'twist pickup'],
    sets: '3',
    reps: '6',
    progressions: [
      'Walk-through: two rushers run stunt at half speed, two linemen trade',
      'Cadence-based: linemen react to snap, rushers execute twist',
      'Full speed: live pass pro with twist stunts from both sides',
    ],
    videos: [
      { title: 'OL Drill Work & Twist Pick Up Technique — Leonard (Clear Lake HS)', url: 'https://www.youtube.com/watch?v=placeholder_leonard', duration: 'Clinic' },
    ],
  },

  // ── Zone Blocking ──────────────────────────────────────────────────────────
  {
    name: 'Inside Zone Step & Path',
    technique_area: 'zone_blocking',
    coaching_cue: 'Zone step first, then identify — your first step is never wrong',
    why: 'Jim McNally\'s zone principle: the first step determines the path. Inside zone step: playside foot to playside foot of the defender. Correct path prevents cutoff errors and maintains double-team angles.',
    common_mistake: 'Stepping flat or back, allowing defenders to cross face and disrupt the zone mesh.',
    fixes: ['zone blocking', 'inside zone', 'path', 'first step'],
    sets: '4',
    reps: '8',
    progressions: [
      'Footwork only: practice the zone step path to each gap without contact',
      'Fit and identify: make zone step, identify defender\'s shade, determine block',
      'Full rep vs scout: zone step, engage, drive or release to linebacker',
    ],
    videos: [
      { title: 'Mid Zone Concepts & Q&A — Jim McNally (NFL OL Coach)', url: 'https://www.youtube.com/watch?v=placeholder_mcnally', duration: 'Full' },
      { title: 'Techniques & Adjustments in the Zone Running Game — Costello', url: 'https://www.youtube.com/watch?v=placeholder_costello', duration: 'Full' },
      { title: 'IZ Game Planning & Pass Pro Development — McClanathan (Drake)', url: 'https://www.youtube.com/watch?v=placeholder_mcclanathan_iz', duration: 'Clinic' },
    ],
  },
  {
    name: 'Reach / Cut-Off Block',
    technique_area: 'zone_blocking',
    coaching_cue: 'Get your hat across the defender\'s face — cut him off',
    why: 'The reach block is the zone blocker\'s most important tool. By crossing the defender\'s face and getting the helmet to the playside shoulder, the blocker seals the cutoff lane and the RB reads daylight inside.',
    common_mistake: 'Lunging instead of taking a proper zone step, giving the defender a free run behind the play.',
    fixes: ['zone blocking', 'reach block', 'cutoff', 'head across'],
    sets: '3',
    reps: '6',
    progressions: [
      'One-on-one reach: practice crossing face on stationary partner',
      'Zone step + reach: combine proper footwork and head placement',
      'Contested reach: defender tries to stay square, blocker must cross face',
    ],
    videos: [
      { title: 'IZ Drills & Game Planning — McClanathan (Drake)', url: 'https://www.youtube.com/watch?v=placeholder_mcclanathan_iz2', duration: 'Clinic' },
    ],
  },

  // ── Pull Technique ─────────────────────────────────────────────────────────
  {
    name: 'Guard Pull & Lead (1st and 2nd Level)',
    technique_area: 'pull_technique',
    coaching_cue: 'Open hip flat — kick the wall, not around it',
    why: 'The pull establishes the backside blocker for counter, power, and G-schemes. Johnson Richardson\'s (Murray State) key teaching: kick the backside wall flat instead of looping, shortening the pull path to attack the correct level.',
    common_mistake: 'Looping the pull route (running in an arc), which is too slow to reach 1st-level backside defenders or the EMOL on counter.',
    fixes: ['pull', 'counter', 'G-scheme', 'footwork', 'gap blocking'],
    sets: '4',
    reps: '6',
    progressions: [
      'Pull path only: open hip, kick flat, reach hole — no contact',
      'Pull to bag: kick flat, log the bag at the hole — simulate EMOL',
      '1st-level pull: pull to kick out the DE or log the edge defender',
      '2nd-level pull: pull through the hole, find and seal the linebacker',
    ],
    videos: [
      { title: '1st and 2nd Level Pulls for the OL — Richardson (Murray State)', url: 'https://www.youtube.com/watch?v=placeholder_richardson', duration: 'Clinic' },
    ],
  },
  {
    name: 'Counter / Trap Pull Drill',
    technique_area: 'pull_technique',
    coaching_cue: 'Bait the pass rush, kick-step, then pull flat and trap',
    why: 'Counter and trap are the most explosive gap-scheme plays. The pulling lineman must sell a pass set for one count before pulling, creating the cutback lane for the running back.',
    common_mistake: 'Showing the pull immediately instead of selling pass protection first, tipping the play to the defense.',
    fixes: ['counter', 'trap', 'pull', 'gap scheme'],
    sets: '3',
    reps: '6',
    progressions: [
      'Kick-step only: one pass-pro kick-step before opening hip to pull',
      'Pull to cone: execute full counter pull path to target cone',
      'Trap with contact: contact and log the unexpected defensive tackle',
    ],
    videos: [
      { title: 'Counter from Multiple Personnel Groupings — McClanathan (Drake)', url: 'https://www.youtube.com/watch?v=placeholder_mcclanathan_counter', duration: 'Clinic' },
    ],
  },
]

// ─── Teaching Progression ─────────────────────────────────────────────────────

export const OL_TEACHING_PROGRESSION: OLTeachingStep[] = [
  {
    order: 1,
    topic: 'Stance & Coil — Foundation of Every Block',
    technique_area: 'stance_coil',
    keyPoints: [
      'Three-point stance: fingertips only, weight on balls of feet — not the heel',
      'Knees inside ankles, hips loaded like a coiled spring',
      'Two-point stance: knees bent, hips loaded, arms in pre-punch position',
      '"Iron core" posture — flat back, chest up, eyes forward',
      'Reset to posture after every rep — "come to balance" habit',
    ],
  },
  {
    order: 2,
    topic: 'Get-Off & First Step — Winning the LOS',
    technique_area: 'get_off',
    keyPoints: [
      'First step must be at or below pad level — no false step, no backward step',
      'BLAST system: Bend, Leverage, Attack, Step, Technique — in that order',
      'CUFF system: Contact → Uncoil → Finish → Follow-through',
      'Fire on ball movement, not cadence — fastest legal start',
      'Use chute or bag straddle to enforce low pad level through the first two steps',
    ],
  },
  {
    order: 3,
    topic: 'Hand Placement — The Most-Officiated Technique',
    technique_area: 'hand_placement',
    keyPoints: [
      'Thumbs-up grip, palms inward, contact on the breastplate/sternum',
      'Strike inside the defender\'s framework — never outside the numbers',
      'Punch on contact, then "grab cloth" — maintain grip inside the frame',
      'Hands above eyes after contact; elbows inside your own hips',
      'Holding = hands outside frame or below the waist — teach the legal strike zone',
    ],
  },
  {
    order: 4,
    topic: 'Run Blocking — Drive & Finish',
    technique_area: 'run_blocking',
    keyPoints: [
      'Win pad level: forehead on sternum — low man wins',
      'Drive feet after contact: short, choppy, fast — never stop feet at contact',
      'Stay square; don\'t over-rotate — keeps hips loaded for redirection',
      'Combo block: hip-to-hip, drive together, one peels to linebacker on cue',
      'Finish through the whistle — block counts at the whistle, not at first contact',
    ],
  },
  {
    order: 5,
    topic: 'Pass Protection — Technique & Footwork',
    technique_area: 'pass_protection',
    keyPoints: [
      'Kick-slide: outside foot kicks, inside foot slides — never cross feet',
      'Set inside landmark first: protect the inside half, force rusher outside',
      'Punch on contact: two-hand strike, recoil, punch again — never lunge',
      'Anchor on bull rush: drop hips, widen base, redirect force into ground',
      'Stunt/twist: pass off the looper — never chase the first rusher through the gap',
    ],
    techniques: [
      {
        name: 'Vertical Set (vs Speed Rush)',
        bestFor: 'Wide-split edge rushers, outside speed',
        cues: [
          'Kick outside foot at 45°, slide inside foot to reset base',
          'Maintain outside landmark — your outside foot stays outside their inside foot',
          'Punch when rusher enters your strike zone — don\'t reach',
        ],
      },
      {
        name: 'Half-Man Set (vs Inside Counter)',
        bestFor: 'Rushers with inside counter after establishing speed',
        cues: [
          'Give half your body — inside shoulder into the rush lane',
          'Force rusher to declare: he goes outside or runs into your shoulder',
          'Stay square enough to redirect inside if he counters',
        ],
      },
      {
        name: 'Anchor / Sit Technique (vs Bull Rush)',
        bestFor: 'Power/bull rush DL, stacked interior threats',
        cues: [
          'Drop hips on contact, widen base to shoulder-width or more',
          'Take the charge into your legs — hips below defender\'s hips',
          'Redirect upward force backward — push down, not away',
        ],
      },
    ],
  },
  {
    order: 6,
    topic: 'Zone Blocking — Path, ID, and Release',
    technique_area: 'zone_blocking',
    keyPoints: [
      'First step is never wrong in zone: playside foot to playside foot of defender',
      'ID on the move: determine covered/uncovered, shade, and double-team assignment while stepping',
      'Inside zone: seek combo on the down defender, one releases on linebacker flow',
      'Reach block: hat across the defender\'s face — cut him off',
      'Outside zone: stretch flat, get upfield on corner/edge defenders',
    ],
  },
  {
    order: 7,
    topic: 'Pull & Gap Scheme — Counter, Power, Trap',
    technique_area: 'pull_technique',
    keyPoints: [
      'Open hip flat — kick the wall, not around it: shortest pull path wins',
      '1st-level pull: log or kick the EMOL/DE at the point of attack',
      '2nd-level pull: clear the hole, find the linebacker, seal him inside',
      'Counter/trap: sell pass pro for one kick-step before opening the hip to pull',
      'Communicate on every pull: call out "Pulling!" so center/tackle can adjust',
    ],
  },
]

// ─── Finder & Getter ─────────────────────────────────────────────────────────

export function findOLDrillsForPainPoint(issue: string): OLDrillEntry[] {
  const lower = issue.toLowerCase()
  return OL_DRILLS.filter(d =>
    d.fixes.some(f => lower.includes(f) || f.includes(lower.split(' ')[0]))
  )
}

export function olDrillToExercise(drill: OLDrillEntry) {
  return {
    name: drill.name,
    sets: drill.sets ? parseInt(drill.sets) : null,
    reps: drill.reps ? parseInt(drill.reps) : null,
    duration: drill.duration ?? null,
    why: drill.why,
    category: 'technique' as const,
  }
}

export function getOLTeachingStep(area: OLTechniqueArea): OLTeachingStep | undefined {
  return OL_TEACHING_PROGRESSION.find(s => s.technique_area === area)
}
