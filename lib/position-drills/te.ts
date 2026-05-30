/**
 * Tight End (TE) Drill Library
 *
 * Sources:
 *  - Tim Shields, Wisconsin-Whitewater — Player Development and TE Play
 *  - OL-TE clinic series (McClanathan, Drake University; Clowes, Utica College;
 *    McPeek, Frederick Douglass HS; Vassil, Becker College; Leonard, Clear Lake HS)
 *  - Paul Alexander NFL OL clinic: blocking mechanics applied to TE alignment
 *  - WR receiving fundamentals (hands, releases) adapted for TE body type
 *
 * The TE is a hybrid player who must master in-line blocking (OL-level technique)
 * and off-ball receiving (WR-level hands, routes, releases). Drills address both.
 */

export type TETechniqueArea =
  | 'inline_blocking'
  | 'releases'
  | 'route_running'
  | 'hands'
  | 'athleticism'
  | 'pass_protection'

export interface TEDrillEntry {
  name: string
  technique_area: TETechniqueArea
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

export interface TETeachingStep {
  order: number
  topic: string
  technique_area: TETechniqueArea
  keyPoints: string[]
  techniques?: { name: string; bestFor: string; cues: string[] }[]
}

// ─── Area Labels ──────────────────────────────────────────────────────────────

export const TE_AREA_LABELS: Record<TETechniqueArea, string> = {
  inline_blocking:  'In-Line Blocking',
  releases:         'Releases vs Press',
  route_running:    'Route Running',
  hands:            'Hands & Catch Technique',
  athleticism:      'Athleticism & Footwork',
  pass_protection:  'Pass Protection',
}

// ─── Drill Library ─────────────────────────────────────────────────────────────

export const TE_DRILLS: TEDrillEntry[] = [
  // ── In-Line Blocking ────────────────────────────────────────────────────────
  {
    name: 'TE 3-Point Stance & Get-Off',
    technique_area: 'inline_blocking',
    coaching_cue: 'You\'re an OL in this stance — coil, then uncoil on the snap',
    why: 'When aligned in-line, the TE must fire out like an offensive lineman. A flat, low first step with proper coil is the difference between winning and losing the edge.',
    common_mistake: 'Rising on the first step or false-stepping backward — gives the edge defender a free run at the quarterback.',
    fixes: ['stance', 'get off', 'first step', 'pad level', 'inline blocking'],
    sets: '4',
    reps: '8',
    progressions: [
      'Three-point stance hold: weight on fingertips, knees bent, hips coiled',
      'Get-off on snap: fire out at bag — freeze after first two steps',
      'Full get-off: contact → uncoil → drive 3 yards',
    ],
    videos: [
      { title: 'Player Development and TE Play — Shields (Wisconsin-Whitewater)', url: 'https://www.youtube.com/watch?v=placeholder_shields_te', duration: 'Clinic' },
    ],
  },
  {
    name: 'TE Reach / Seal Block',
    technique_area: 'inline_blocking',
    coaching_cue: 'Hat across the face — seal the edge, create the alley',
    why: 'The reach/seal block is the TE\'s signature run-blocking assignment on outside zone and perimeter run plays. Getting the helmet across the defender\'s face creates the outside lane for the running back.',
    common_mistake: 'Running past the defender instead of cutting off with the head — results in the defender chasing the back from behind.',
    fixes: ['reach block', 'seal block', 'inline blocking', 'outside zone', 'edge'],
    sets: '3',
    reps: '6',
    progressions: [
      'Zone-step footwork: playside foot to defender\'s playside foot',
      'Hat across the face: focus on crossing the defender\'s face, not driving straight',
      'Contested reach: defender tries to stay square while TE must cross face',
    ],
    videos: [
      { title: 'Player Development and TE Play — Shields (Wisconsin-Whitewater)', url: 'https://www.youtube.com/watch?v=placeholder_shields_te', duration: 'Clinic' },
    ],
  },
  {
    name: 'TE Down Block / Fold Block',
    technique_area: 'inline_blocking',
    coaching_cue: 'Step down-inside, hit the near shoulder — seal the C-gap',
    why: 'Down and fold blocks from the TE position are critical for gap and power run schemes. The TE must step inside to angle-block the first defender to the inside.',
    common_mistake: 'Stepping flat instead of at a 45-degree angle inside, allowing the defender to cross the TE\'s face.',
    fixes: ['down block', 'inline blocking', 'gap scheme', 'run blocking'],
    sets: '3',
    reps: '6',
    progressions: [
      '45-degree step drill: practice the correct inside angle step without contact',
      'Fit on inside bag: get into proper fit position for the down angle',
      'Full down block: cadence → step inside → fit → drive',
    ],
    videos: [],
  },
  {
    name: 'Sled Work for TEs ("Hands" Progression)',
    technique_area: 'inline_blocking',
    coaching_cue: 'Thumbs up, inside the frame — you block like an OL, not a WR',
    why: 'TEs must have proper hand placement to block at the NFL level. The sled progression teaches the muscle memory of inside, thumbs-up hand placement — the same technique used by offensive linemen.',
    common_mistake: 'Using a "push" block with flat palms instead of a punch with thumbs-up grip, losing leverage on the block.',
    fixes: ['hand placement', 'punch', 'inline blocking', 'leverage'],
    sets: '3',
    reps: '10',
    progressions: [
      'On knee: alternate inside hand punches on sled pad',
      'On knee: both hands simultaneously, freeze at full extension',
      'Two-point stance: shoot hands, extend, drive — disengage and reset',
    ],
    videos: [],
  },

  // ── Releases vs Press ───────────────────────────────────────────────────────
  {
    name: 'TE Swim Release vs Press Coverage',
    technique_area: 'releases',
    coaching_cue: 'Swipe the arm down, rip through — vertical, not sideways',
    why: 'When the linebacker or safety presses the TE at the line, the swim move is the fastest release technique. The TE sweeps the defender\'s arm down with one hand while ripping the opposite arm upward and through.',
    common_mistake: 'Going sideways with the release instead of dipping under and through — results in losing vertical stem.',
    fixes: ['releases', 'press coverage', 'swim move', 'vertical'],
    sets: '3',
    reps: '6',
    progressions: [
      'Arm action only: practice swipe-and-rip arm motion without partner',
      'With partner: partner holds passive press, execute swim at half-speed',
      'Contested: partner tries to maintain contact while TE executes swim',
    ],
    videos: [],
  },
  {
    name: 'TE Rip Release vs Contact',
    technique_area: 'releases',
    coaching_cue: 'Elbow drives to the hip — not out to the side',
    why: 'The rip is a lower-body-driven release: the TE drops the near shoulder and drives the elbow through the contact while staying low. It\'s faster than a swim against defenders who anticipate the swipe.',
    common_mistake: 'Ripping with the arm only instead of using the whole body — the shoulder and hip must drive through together.',
    fixes: ['releases', 'press coverage', 'rip move', 'off the line'],
    sets: '3',
    reps: '6',
    progressions: [
      'Rip arm action: practice the elbow-to-hip rip motion in isolation',
      'From stance: rip release against partner holding a bag',
      'Versus live press: react to defender contact and choose swim or rip',
    ],
    videos: [],
  },

  // ── Route Running ──────────────────────────────────────────────────────────
  {
    name: 'TE Seam / Vertical Route',
    technique_area: 'route_running',
    coaching_cue: 'Threaten the safety\'s inside shoulder — make him honor vertical',
    why: 'The TE\'s vertical seam route is one of the most dangerous plays in football when run correctly. By threatening the safety\'s inside shoulder, the TE forces the safety to honor deep — creating shallow crossing routes underneath.',
    common_mistake: 'Drifting outside on the seam route instead of attacking the middle of the field, making the route easy to cover.',
    fixes: ['route running', 'seam', 'vertical', 'separation'],
    sets: '4',
    reps: '6',
    progressions: [
      'Straight-line release drill: 10-yard sprint up the seam without a defender',
      'Threaten inside: run at the safety\'s inside shoulder, sell the route',
      'Full route: release → stem → fade outside or continue inside based on coverage',
    ],
    videos: [],
  },
  {
    name: 'TE Crossing / Drag Route',
    technique_area: 'route_running',
    coaching_cue: 'Get underneath linebackers — flat enough to cross but not a bubble route',
    why: 'The crossing route is the highest-percentage TE route in the modern game. Proper depth (6-8 yards) keeps the TE below linebacker drops but above short zone defenders — finding the void in Cover 2 and Cover 4.',
    common_mistake: 'Running too flat (2-3 yards) and catching a short route behind the line of scrimmage, or too deep (12 yards) and getting underneath the safety.',
    fixes: ['route running', 'crossing route', 'drag', 'depth', 'separation'],
    sets: '4',
    reps: '6',
    progressions: [
      'Crossing route depth: mark 6-8 yards, cross at the correct depth',
      'Underneath zone: identify linebacker drops and find the void',
      'Speed through coverage: run at full speed, don\'t slow down at the break',
    ],
    videos: [],
  },

  // ── Hands & Catch Technique ─────────────────────────────────────────────────
  {
    name: 'TE Hands — Catch Away from Body',
    technique_area: 'hands',
    coaching_cue: 'Catch with your hands, not your chest — soft hands, eyes through the catch',
    why: 'TEs tend to body-catch because of their large frame. Catching with the hands away from the body improves range and reduces drops, especially on contested catches in traffic.',
    common_mistake: 'Letting the ball contact the chest or pads before the hands — creates hard rebounds and increases drop rate.',
    fixes: ['hands', 'catching', 'drops', 'concentration'],
    sets: '4',
    reps: '10',
    progressions: [
      'Stationary catch: partner throws at half-speed — hands only, no body contact',
      'Eye-through-catch drill: lock eyes on the ball until it is secured in both hands',
      'High-low throws: alternate above-waist and below-waist catches to practice hand position changes',
    ],
    videos: [],
  },
  {
    name: 'Contested Catch / Concentration Drill',
    technique_area: 'hands',
    coaching_cue: 'Catch first, look for yards second — secure before you run',
    why: 'TEs face contact on nearly every route. The concentration drill trains the TE to secure the ball through contact instead of anticipating the hit and allowing early eye movement that causes drops.',
    common_mistake: 'Peeking at the defender before securing the ball — the most common cause of contested drops.',
    fixes: ['hands', 'concentration', 'contested catch', 'drops'],
    sets: '3',
    reps: '8',
    progressions: [
      'Distraction throw: thrower calls out a random number while TE must catch and say the number',
      'Contact after catch: defender taps TE on contact, TE must still secure first',
      'Full contested: defender rides the TE through the catch — TE must catch and tuck before looking for yards',
    ],
    videos: [],
  },

  // ── Athleticism & Footwork ──────────────────────────────────────────────────
  {
    name: 'TE Agility Ladder — Release Footwork',
    technique_area: 'athleticism',
    coaching_cue: 'Light feet, quick steps — don\'t stomp through the ladder',
    why: 'TEs often sacrifice athleticism for blocking, but the best TEs in the game have the footwork of wide receivers. The agility ladder builds the quick, light foot mechanics needed for clean releases and sharp route breaks.',
    common_mistake: 'Heavy-footing through the ladder — contact the ground with the balls of the feet, not the heels.',
    fixes: ['athleticism', 'footwork', 'agility', 'releases', 'first step'],
    duration: '10 min',
    progressions: [
      'Single-leg ladder: one foot per box, forward progression',
      'Lateral shuffle through ladder, staying low',
      'In-out pattern: both feet in, both feet out — simulates release vs press contact',
    ],
    videos: [],
  },
  {
    name: 'TE Hip Flip / Transition Drill',
    technique_area: 'athleticism',
    coaching_cue: 'Open the hip on the move — not the shoulders first',
    why: 'TEs must transition from run-blocking alignment to pass-receiving routes in the same play (RPOs, misdirection). The hip flip drill trains the quick hip rotation needed to go from a blocking stance to a running route without losing separation.',
    common_mistake: 'Turning the whole body (shoulders first) instead of flipping the hips — gives the defender time to recover.',
    fixes: ['athleticism', 'route running', 'hip rotation', 'transition'],
    sets: '3',
    reps: '8',
    progressions: [
      'Hip flip in place: from blocking stance, flip hips to run stance without moving feet',
      'Hip flip and go: 3-step block fake → hip flip → stem into route',
      'Full RPO rep: read run/pass, execute block or release based on cue',
    ],
    videos: [],
  },

  // ── Pass Protection ────────────────────────────────────────────────────────
  {
    name: 'TE Pass Protection — Chip & Release',
    technique_area: 'pass_protection',
    coaching_cue: 'Chip the DE, don\'t fight him — redirect and release',
    why: 'Most TE pass protection assignments are chip blocks: hit the edge rusher to slow him down, then release into a route. A full stop-block assignment is rare. The chip must be a hard punch — not a brush — before the release.',
    common_mistake: 'Giving a weak chip that doesn\'t affect the rusher, or holding the chip too long and missing the route.',
    fixes: ['pass protection', 'chip block', 'edge', 'releases', 'route running'],
    sets: '3',
    reps: '6',
    progressions: [
      'Chip-only: punch the edge rusher hard, reset — no release',
      'Chip-and-go: punch → release flat at the correct timing',
      'Full RPO chip: read EMOL, chip if rusher attacks, release into flat route',
    ],
    videos: [],
  },
  {
    name: 'TE Anchor vs Power Rush',
    technique_area: 'pass_protection',
    coaching_cue: 'Drop hips and widen base — you\'re an immovable object',
    why: 'Unlike WRs who chip and release, TEs in full-slide protection must sometimes anchor alone against an edge rusher. The anchor technique (drop hips, widen base, take the bull rush into the ground) is the TE\'s last line of defense for the QB.',
    common_mistake: 'Getting driven back upright by a power rush because hips were too high at contact.',
    fixes: ['pass protection', 'anchor', 'bull rush', 'leverage'],
    sets: '3',
    reps: '6',
    progressions: [
      'Isometric anchor hold: partner applies steady pressure, TE holds position for 5 sec',
      'Absorb and redirect: partner charges, TE takes impact and drops hips',
      'Full protection rep: set, kick-slide, anchor on contact — hold through whistle',
    ],
    videos: [],
  },
]

// ─── Teaching Progression ─────────────────────────────────────────────────────

export const TE_TEACHING_PROGRESSION: TETeachingStep[] = [
  {
    order: 1,
    topic: 'In-Line Blocking — Your OL Foundation',
    technique_area: 'inline_blocking',
    keyPoints: [
      'In 3-point stance: fingertips, weight on balls of feet, hips coiled',
      'First step must be flat and low — no false step or upright first step',
      'Hand placement: thumbs-up, inside the defender\'s frame — identical to an OL',
      'Reach/seal block: zone step, hat across the face, cut off the edge',
      'Finish blocks with feet: keep driving until the whistle',
    ],
    techniques: [
      {
        name: 'Reach / Seal Block',
        bestFor: 'Outside zone, perimeter run plays',
        cues: [
          'Zone step: playside foot to defender\'s playside foot',
          'Cross the face with your helmet — seal the edge',
          'Drive square, don\'t over-rotate',
        ],
      },
      {
        name: 'Down / Fold Block',
        bestFor: 'Power, counter, gap schemes',
        cues: [
          'Step at 45 degrees inside — not flat',
          'Contact the near shoulder of the inside defender',
          'Drive the defender across the formation',
        ],
      },
    ],
  },
  {
    order: 2,
    topic: 'Releases — Getting Off the Line',
    technique_area: 'releases',
    keyPoints: [
      'Every release is a physical battle — treat it like a WR release, not a jog into a route',
      'Swim: swipe defender\'s arm down, rip your arm up and through — stay vertical',
      'Rip: drop near shoulder, drive elbow to hip — faster than a swim vs anticipating defenders',
      'Push-pull: two-hand jab into the defender\'s chest, pull down on one side to create leverage',
      'Get vertical immediately after the release — don\'t drift flat',
    ],
    techniques: [
      {
        name: 'Swim Move',
        bestFor: 'vs linebackers jamming at the line',
        cues: ['Swipe the arm down with one hand', 'Rip the opposite arm up and through', 'Stay vertical after — no drift sideways'],
      },
      {
        name: 'Rip Move',
        bestFor: 'vs defenders who anticipate the swim',
        cues: ['Drop the near shoulder', 'Drive elbow to the hip — whole body rotation', 'Come out of the rip low and fast'],
      },
    ],
  },
  {
    order: 3,
    topic: 'Route Running — Precision from a Big Body',
    technique_area: 'route_running',
    keyPoints: [
      'Seam/vertical: threaten the safety\'s inside shoulder — make him honor deep',
      'Cross/drag: run at 6-8 yards depth — find the void under linebacker drops',
      'Out/corner: use body to shield the ball on short out routes — attack the sideline',
      'Sell every route as a potential run block — stay low at the top of the route',
      'Accelerate through the break — most TEs decelerate before the cut, giving DBs time to recover',
    ],
  },
  {
    order: 4,
    topic: 'Hands & Catch Technique — Soft Hands in Traffic',
    technique_area: 'hands',
    keyPoints: [
      'Catch with hands, not chest — keep the ball away from the body on every catch',
      'Above waist: thumbs-in (pointing toward each other), fingers spread',
      'Below waist: pinkies-together (little fingers touching), scoop upward',
      'Eyes on the tip of the ball through the catch — not on the defender',
      'Secure before you run — catch-tuck-look, not catch-and-run simultaneously',
    ],
  },
  {
    order: 5,
    topic: 'Athleticism & Footwork — Move Like a Receiver',
    technique_area: 'athleticism',
    keyPoints: [
      'TEs must be able to match up with linebackers AND safeties — footwork is non-negotiable',
      'Light on your feet: balls of feet, not heels — quick and quiet steps',
      'Hip flip: learn to transition from blocking stance to receiving stance without telegraphing',
      'Agility ladder work daily — builds the fast-twitch foot patterns needed for release and route running',
      'Change of direction: outside foot plant on every cut, re-accelerate immediately',
    ],
  },
  {
    order: 6,
    topic: 'Pass Protection — Chip, Anchor, and Release',
    technique_area: 'pass_protection',
    keyPoints: [
      'Most TE assignments are chip-and-release — hit hard, then get into the route',
      'The chip must be a punch: two-hand strike, not a brush — actually slow the rusher',
      'Anchor assignments: drop hips, widen base, take the bull rush into the ground',
      'Never lunge: maintain balance so you can redirect if the rusher counters',
      'Communication with the QB and OL: declare your blocking assignment pre-snap',
    ],
  },
]

// ─── Finder & Getter ─────────────────────────────────────────────────────────

export function findTEDrillsForPainPoint(issue: string): TEDrillEntry[] {
  const lower = issue.toLowerCase()
  return TE_DRILLS.filter(d =>
    d.fixes.some(f => lower.includes(f) || f.includes(lower.split(' ')[0]))
  )
}

export function teDrillToExercise(drill: TEDrillEntry) {
  return {
    name: drill.name,
    sets: drill.sets ? parseInt(drill.sets) : null,
    reps: drill.reps ? parseInt(drill.reps) : null,
    duration: drill.duration ?? null,
    why: drill.why,
    category: 'technique' as const,
    coaching_cue: drill.coaching_cue ?? null,
    demo_url: drill.videos[0]?.url ?? null,
  }
}

export function getTETeachingStep(area: TETechniqueArea): TETeachingStep | undefined {
  return TE_TEACHING_PROGRESSION.find(s => s.technique_area === area)
}
