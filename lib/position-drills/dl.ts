/**
 * Defensive Line (DL) Drill Library
 *
 * Sources:
 *  - DL Drill PPTX (Romison Saint-Louis): Sled Work, Ball Get-Off, Three Whistle,
 *    2-Step Drive, Hoop Drills, Bag Drills, Block Recognition, Pass Rush
 *  - Widger Lawton DL clinic: Stance, Get-Off Aiming Point, pursuit clips
 *  - Rutgers Clinic DL series (clinic film)
 *  - Peter Noonan (Hendrickson HS, TX): DL fundamentals and philosophy
 *  - Ricky Coon (Dodge City CC, KS): DL play, skills and drills
 *  - Corey Hetherman (JMU): Pass rush drills and technique
 *  - Siddiq Haynes (UTSA / Sam Houston): Pass rush quick hips, crossing the slide
 *  - Brian Volz (North Greenville University): DL drills and techniques
 *  - Oregon DL 2006 / TUMWATER GATA DL Clinic 2020
 *  - Alabama Defensive Drills: DL Gauntlet, DL Release Shrug
 */

export type DLTechniqueArea =
  | 'stance_getoff'
  | 'hand_fighting'
  | 'block_recognition'
  | 'pass_rush'
  | 'run_defense'
  | 'pursuit'

export interface DLDrillEntry {
  name: string
  technique_area: DLTechniqueArea
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

export interface DLTeachingStep {
  order: number
  topic: string
  technique_area: DLTechniqueArea
  keyPoints: string[]
  techniques?: { name: string; bestFor: string; cues: string[] }[]
}

// ─── Area Labels ──────────────────────────────────────────────────────────────

export const DL_AREA_LABELS: Record<DLTechniqueArea, string> = {
  stance_getoff:      'Stance & Get-Off',
  hand_fighting:      'Hand Fighting',
  block_recognition:  'Block Recognition',
  pass_rush:          'Pass Rush',
  run_defense:        'Run Defense',
  pursuit:            'Pursuit & Finish',
}

// ─── Drill Library ─────────────────────────────────────────────────────────────

export const DL_DRILLS: DLDrillEntry[] = [
  // ── Stance & Get-Off ────────────────────────────────────────────────────────
  {
    name: 'Ball Get-Off (Under Chute)',
    technique_area: 'stance_getoff',
    coaching_cue: 'Fire on the ball, not the count — stay low through the first two steps',
    why: 'The most important play in every down starts at the snap. A fast, flat first step beats the offensive lineman before he can establish leverage. The chute forces the DL to stay low — hands above the eyes through contact.',
    common_mistake: 'Rising on the first step or false-stepping backward, giving the OL a leverage advantage.',
    fixes: ['get off', 'stance', 'first step', 'pad level', 'leverage'],
    sets: '5',
    reps: '5',
    progressions: [
      'Stance alignment: pre-snap aiming point — aim for the near shoulder of the OL',
      'One-leg get-off: fire out on one leg first, build explosive first step',
      'Get-off under chute: enforce low pad level through first two steps',
      'Straddle bag: keep shoulder pads down through take-off',
    ],
    videos: [
      { title: 'Widger DL Stance — Get Off Aiming Point', url: 'https://www.youtube.com/watch?v=placeholder_widger_getoff', duration: 'Clinic' },
      { title: 'DL Fundamentals & Philosophy — Noonan (Hendrickson HS)', url: 'https://www.youtube.com/watch?v=placeholder_noonan', duration: 'Clinic' },
    ],
  },
  {
    name: 'Three-Point Stance Coil',
    technique_area: 'stance_getoff',
    coaching_cue: 'Hand down = man hand or ball hand — shade determines which',
    why: 'The shade of the DL determines which hand goes down in 3-point stance. Using the ball hand (hand on ball side of center) is the standard; using the man hand (hand toward gap) can favor certain slant/penetration techniques.',
    common_mistake: 'Same hand down regardless of alignment shade — eliminates the ability to use the correct departure step.',
    fixes: ['stance', 'shade', 'alignment', 'get off'],
    sets: '3',
    reps: '10',
    progressions: [
      'Place hand down: practice correct hand-down selection by alignment',
      'Walk-through departure: step in the correct direction for the shade',
      'Ball-reactive get-off: hand down in correct shade, fire on snap',
    ],
    videos: [],
  },

  // ── Hand Fighting ──────────────────────────────────────────────────────────
  {
    name: 'Sled "Hands" Progression (DL)',
    technique_area: 'hand_fighting',
    coaching_cue: 'Hands above the eyes — punch, extend, rip through',
    why: 'Offensive linemen are taught to shoot hands inside the DL\'s frame. The DL must "shock and shed" — striking the OL\'s hands away and securing an outside grip on the blocker\'s shoulder before making a play.',
    common_mistake: 'Letting the OL get inside hand placement and losing leverage — DL must attack hands first.',
    fixes: ['hand fighting', 'punch', 'leverage', 'hands', 'shed'],
    sets: '4',
    reps: '10',
    progressions: [
      'On knee — inside hand punches (alternate)',
      'On knee — both hands simultaneously, freeze at extension',
      'Two-point stance: punch → extend → drive',
      'Three-point explosion: 3-pt stance → punch → uncoil → drive → disengage',
    ],
    videos: [],
  },
  {
    name: 'Bag Drill — Club / Swim / Rip (Pass Rush Hands)',
    technique_area: 'hand_fighting',
    coaching_cue: 'Win the hand battle before you run your move',
    why: 'Every pass rush move starts with a hand battle. This drill isolates each hand technique — club, rip, swim — in both same-side and alternating patterns. Develops the arm strength and timing needed to defeat OL hand placement.',
    common_mistake: 'Running the move before engaging the OL\'s hands — allows the OL to refit and recover.',
    fixes: ['hand fighting', 'club', 'swim', 'rip', 'pass rush', 'shed'],
    sets: '3',
    reps: '8',
    progressions: [
      'Club same side: same-side hand clubs down on bag and resets',
      'Club alternate: alternate left-right clubs at pace',
      'Dip and rip same side: drop shoulder, rip arm through',
      'Dip and rip alternate: alternate rip arms at pace',
      'Swim alternate: alternate over-the-top swim moves',
    ],
    videos: [
      { title: 'DL Play, Skills & Drills — Coon (Dodge City CC)', url: 'https://www.youtube.com/watch?v=placeholder_coon', duration: 'Clinic' },
    ],
  },

  // ── Block Recognition ──────────────────────────────────────────────────────
  {
    name: 'Three-Whistle Block Recognition Drill',
    technique_area: 'block_recognition',
    coaching_cue: 'Get-off and fit, then read — don\'t wait to see it',
    why: 'Block recognition is the most important cognitive skill for DL. The three-whistle drill (fit → extend → disengage) teaches the DL to identify block types at the point of contact rather than pre-reading from the backfield.',
    common_mistake: 'Hesitating at the line waiting to read the block instead of getting off and reading on contact.',
    fixes: ['block recognition', 'reads', 'reaction', 'fit'],
    sets: '3',
    reps: '6',
    progressions: [
      '1st whistle: get-off and get into fit position — freeze',
      '2nd whistle: violently extend arms while maintaining fit',
      '3rd whistle: violently disengage — shed and pursue',
      'Randomize block types: base block, double team, reach, trap — DL must ID on contact',
    ],
    videos: [],
  },
  {
    name: 'Block Reaction Series (Base/Double Team/Reach/Trap)',
    technique_area: 'block_recognition',
    coaching_cue: 'What blocks you determines your technique — read the hip',
    why: 'Different blocking schemes require different DL responses. A base block = two-hand punch and shed; a double team = slip to a side; a reach = cross-face; a trap = wrong-arm or redirect. This drill walks through each situation.',
    common_mistake: 'Applying the same "bull through" technique to all block types — creates vulnerability to traps and doubles.',
    fixes: ['block recognition', 'double team', 'trap', 'reach', 'down block'],
    sets: '3',
    reps: '4',
    progressions: [
      'Walk-through each block type: base → double team → reach → trap',
      'Signal-based: coach signals block type at snap, DL reacts',
      'Live scout: scout OL runs actual scheme, DL must ID and respond',
    ],
    videos: [
      { title: 'DL Play the Block Presentation — Widger Lawton', url: 'https://www.youtube.com/watch?v=placeholder_widger_block', duration: 'Full' },
      { title: 'TUMWATER GATA DL Clinic 2020', url: 'https://www.youtube.com/watch?v=placeholder_tumwater', duration: 'Full' },
    ],
  },

  // ── Pass Rush ──────────────────────────────────────────────────────────────
  {
    name: 'Close-Down Drill (Speed to Power)',
    technique_area: 'pass_rush',
    coaching_cue: 'Get close before you run the move — 2 yards away, not 5',
    why: 'Siddiq Haynes (UTSA/Sam Houston): the most common pass rush error is running a move too far from the blocker. The close-down drill forces the DL to close the distance first, then execute the move with control — not from 5 yards out.',
    common_mistake: 'Initiating the pass rush move while still too far from the blocker — the OL can reset and recover.',
    fixes: ['pass rush', 'speed rush', 'close', 'distance', 'rush lane'],
    sets: '4',
    reps: '4',
    progressions: [
      'Close-down only: DL lines up 5 yds away, sprints to OL at full speed, stops at correct distance',
      'Close → rip: close the distance, then execute the rip move on contact',
      'Close → swim: close the distance, then execute the swim move',
      'Close → counter: establish speed edge, then counter inside with the spin or club',
    ],
    videos: [
      { title: 'Pass Rush Drills & Technique — Hetherman (JMU)', url: 'https://www.youtube.com/watch?v=placeholder_hetherman', duration: 'Clinic' },
      { title: 'Pass Rush Quick Hips / Crossing the Slide — Haynes (UTSA)', url: 'https://www.youtube.com/watch?v=placeholder_haynes_utsa', duration: 'Clinic' },
      { title: 'Pass Rush Philosophy & Techniques — Haynes (Sam Houston)', url: 'https://www.youtube.com/watch?v=placeholder_haynes_sh', duration: 'Clinic' },
    ],
  },
  {
    name: 'Hoop Drill — Pass Rush Bend',
    technique_area: 'pass_rush',
    coaching_cue: 'Bend the corner with your hip, not your shoulders',
    why: 'The hoop drill teaches the DL to run around the edge of a hoop while maintaining low pad level — simulating the hip-bend needed to turn the corner on a speed rush without getting pushed upfield.',
    common_mistake: 'Standing upright while bending the corner — loses power and exposes the body to a push.',
    fixes: ['pass rush', 'bend', 'speed rush', 'corner', 'pad level'],
    sets: '3',
    reps: '6',
    progressions: [
      'Bend around hoop and pick up towel: enforces getting low at the apex',
      'Bend around hoop and halfway redirect: stop midway and redirect inside',
      'Hoop under chute: adds low pad-level constraint throughout the bend',
      'Slant + hoop: slant around the hoop and pick up towel between cones',
    ],
    videos: [],
  },
  {
    name: '2-Step Drive (Under Chute)',
    technique_area: 'pass_rush',
    coaching_cue: 'Two steps, hands on air — drive through the bag',
    why: 'The 2-step drive drill isolates the first two steps of a pass rush, enforcing low pad level through the chute and teaching the DL to strike with hands on the move — not stationary.',
    common_mistake: 'Slowing down to punch — the punch must happen at full speed during the first two steps.',
    fixes: ['pass rush', 'first step', 'pad level', 'punch', 'get off'],
    sets: '3',
    reps: '6',
    progressions: [
      'Two steps only: fire through chute, freeze after step two',
      'Two steps + shoot hands on air: add arm strike motion at step two',
      'Full drive: step through chute, redirect and tackle bag',
      'Slant through chute: slant-specific get-off, then redirect to bag',
    ],
    videos: [],
  },

  // ── Run Defense ────────────────────────────────────────────────────────────
  {
    name: 'DL Gauntlet (Alabama)',
    technique_area: 'run_defense',
    coaching_cue: 'Slip the block — don\'t take it head-on — get skinny',
    why: 'Alabama\'s DL Gauntlet drill runs the DL through a series of block-shedding scenarios at game speed. Builds the ability to stay in a run lane while avoiding OL contact — keeping gap integrity without getting washed.',
    common_mistake: 'Taking blocks head-on instead of slipping, which stacks bodies and clogs running lanes for the LB.',
    fixes: ['run defense', 'block shedding', 'gap', 'shed', 'gap integrity'],
    sets: '3',
    reps: '5',
    progressions: [
      'Single-block shed: disengage from one bag/partner per rep',
      'Gauntlet: 3-4 consecutive blocks, shed each one and stay in gap',
      'Live: two-on-one gauntlet at game speed',
    ],
    videos: [
      { title: 'Alabama Defensive Drills — DL Gauntlet', url: 'https://www.youtube.com/watch?v=placeholder_alabama_gauntlet', duration: 'Clinic' },
    ],
  },
  {
    name: 'DL Release / Shrug Drill',
    technique_area: 'run_defense',
    coaching_cue: 'Shed low — dip under the block and shrug through',
    why: 'Alabama\'s Release/Shrug drill teaches the DL to get low, dip under the OL\'s hands, and shrug the block off — maintaining gap pursuit angle to the ball carrier.',
    common_mistake: 'Trying to power through the block instead of getting under it — gets driven off the gap.',
    fixes: ['run defense', 'block shedding', 'shed', 'release', 'gap'],
    sets: '3',
    reps: '8',
    progressions: [
      'On knee: practice the shrug motion against a bag',
      'From stance: get-off, dip under, and shrug through',
      'Full rep: get-off → dip → shrug → pursue to cone',
    ],
    videos: [
      { title: 'Alabama Defensive Drills — DL Release Shrug', url: 'https://www.youtube.com/watch?v=placeholder_alabama_shrug', duration: 'Clinic' },
    ],
  },

  // ── Pursuit ────────────────────────────────────────────────────────────────
  {
    name: 'Widger Wide-Wide / Slide-Slide Pursuit Series',
    technique_area: 'pursuit',
    coaching_cue: 'Sprint to the ball carrier\'s inside shoulder — cut off the cutback',
    why: 'The Widger Lawton pursuit drill series (Wide-Wide and Slide-Slide clips) builds the correct pursuit angles DL must run after shedding blocks — ensuring they arrive at the ball carrier from inside out, eliminating the cutback lane.',
    common_mistake: 'Pursuing straight to where the ball carrier is instead of where he will be — allows cutbacks.',
    fixes: ['pursuit', 'angle', 'tackle', 'cutback', 'pursuit angle'],
    sets: '4',
    reps: '6',
    progressions: [
      'Wide-Wide path: pursue laterally across the formation to the ball side',
      'Slide-Slide path: pursuit angle that maintains inside leverage',
      'Shed and pursue: block shed followed immediately by correct pursuit angle',
    ],
    videos: [
      { title: 'DL Stance — Get Offs — Launch — Pursuit (Widger Lawton series)', url: 'https://www.youtube.com/watch?v=placeholder_widger_pursuit', duration: 'Clinic' },
      { title: 'Oregon Defensive Line 2006', url: 'https://www.youtube.com/watch?v=placeholder_oregon_dl', duration: 'Film' },
    ],
  },
]

// ─── Teaching Progression ─────────────────────────────────────────────────────

export const DL_TEACHING_PROGRESSION: DLTeachingStep[] = [
  {
    order: 1,
    topic: 'Stance & Get-Off — Everything Starts Here',
    technique_area: 'stance_getoff',
    keyPoints: [
      'Shade determines hand down: ball hand or man hand — never the same without a reason',
      'Pre-snap aiming point: target the near shoulder of the blocker, not the backfield',
      'First step is flat and low — no false step, no upright rise',
      'Use chute or straddle bag to enforce low pad level through the first two steps',
      'Fire on ball movement — not cadence — that\'s the fastest legal reaction',
    ],
  },
  {
    order: 2,
    topic: 'Hand Fighting — Win the Hands, Win the Play',
    technique_area: 'hand_fighting',
    keyPoints: [
      'Hands above the eyes — always punch before the OL can establish inside grip',
      'Strike the OL\'s breastplate: shock and shed before running your move',
      'Rip: dip the shoulder, drive the elbow to the hip — use the whole body',
      'Swim: swipe the OL\'s arm down, over-the-top with the opposite arm',
      'Club: knock the OL\'s arm down with a hammer-fist, creating a void to run through',
    ],
    techniques: [
      {
        name: 'Rip Move',
        bestFor: 'Interior and edge rushers, initial pass rush',
        cues: ['Drop shoulder, elbow to hip', 'Full-body rotation — not just arm', 'Come out low and fast'],
      },
      {
        name: 'Swim Move',
        bestFor: 'Speed rushers with outside leverage',
        cues: ['Swipe OL arm down', 'Throw opposite arm over the top', 'Stay vertical through the move'],
      },
      {
        name: 'Club & Rip Counter',
        bestFor: 'OL with strong punch, second move counters',
        cues: ['Club the OL arm down', 'Immediately rip inside', 'Speed through the gap on the counter'],
      },
    ],
  },
  {
    order: 3,
    topic: 'Block Recognition — Read and React on Contact',
    technique_area: 'block_recognition',
    keyPoints: [
      'Base block: two-hand punch, anchor, shed to the ball side',
      'Double team: don\'t get stood up — slip to one side, split the double on contact',
      'Reach block: OL trying to cross your face — cross-face him back, maintain gap',
      'Trap block: wrong-arm if you recognize it early; redirect if it catches you late',
      'Down block: OL stepping inside away from you — be alert for a kick-out block',
    ],
  },
  {
    order: 4,
    topic: 'Pass Rush — Setup, Move, and Counter',
    technique_area: 'pass_rush',
    keyPoints: [
      'Every pass rush needs a plan before the snap: primary move and one counter',
      'Close the distance before running the move — 2 yards away, not 5',
      'Bend the corner with the hip — low pad level around the edge is non-negotiable',
      'Speed rush sets up the inside counter: bull rush sets up the swim or spin',
      'Finish with a flat hand to the ball — never reach and grab from the side',
    ],
  },
  {
    order: 5,
    topic: 'Run Defense — Gap Integrity and Block Shedding',
    technique_area: 'run_defense',
    keyPoints: [
      'Your gap is your responsibility — never lose it without forcing a free runner',
      'Dip under blocks rather than taking them head-on: get skinny through tight spaces',
      'Shrug and release: dip under the OL\'s hands and shrug the block off your shoulders',
      'Two-gap technique: control the blocker with two hands and squeeze both gaps',
      'Maintain inside leverage — force the ball carrier outside toward help',
    ],
  },
  {
    order: 6,
    topic: 'Pursuit — Angles and Finishing the Play',
    technique_area: 'pursuit',
    keyPoints: [
      'Pursuit angle: sprint to the ball carrier\'s inside shoulder — cut off the cutback',
      'Never pursue straight to the ball — angles win; straight lines lose',
      'After shedding a block, take your correct pursuit angle immediately',
      'Wide pursuit: sprint to the sideline ahead of the ball carrier on outside runs',
      'Finish the tackle: wrap — never arm-tackle from behind',
    ],
  },
]

// ─── Finder & Getter ─────────────────────────────────────────────────────────

export function findDLDrillsForPainPoint(issue: string): DLDrillEntry[] {
  const lower = issue.toLowerCase()
  return DL_DRILLS.filter(d =>
    d.fixes.some(f => lower.includes(f) || f.includes(lower.split(' ')[0]))
  )
}

export function dlDrillToExercise(drill: DLDrillEntry) {
  return {
    name: drill.name,
    sets: drill.sets ? parseInt(drill.sets) : null,
    reps: drill.reps ? parseInt(drill.reps) : null,
    duration: drill.duration ?? null,
    why: drill.why,
    category: 'technique' as const,
  }
}

export function getDLTeachingStep(area: DLTechniqueArea): DLTeachingStep | undefined {
  return DL_TEACHING_PROGRESSION.find(s => s.technique_area === area)
}
