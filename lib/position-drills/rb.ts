/**
 * Running Back Position-Specific Drill Library
 * Source: Curated video library covering 10 technique categories
 * Used by: training plan generator, video analysis AI, drill reference UI
 */

import type { Exercise } from '@/types'

// ─── Reference Video Type ─────────────────────────────────────────────────────

export interface DrillVideo {
  title: string
  url: string
  duration: string
  notes?: string
}

export interface RBDrillEntry {
  name: string
  category: Exercise['category']
  technique_area: RBTechniqueArea
  sets: number | null
  reps: number | null
  duration: string | null
  why: string
  coaching_cue: string
  common_mistake: string
  fixes: string[]           // pain-point keywords this drill addresses
  progressions: string[]    // beginner → advanced
  videos: DrillVideo[]
}

export type RBTechniqueArea =
  | 'stance'
  | 'first_step'
  | 'handoff'
  | 'ball_security'
  | 'contact_breaking_tackles'
  | 'blocking'
  | 'cuts'
  | 'footwork'
  | 'catching'
  | 'strength_conditioning'

// ─── Full RB Drill Library ────────────────────────────────────────────────────

export const RB_DRILLS: RBDrillEntry[] = [

  // ── STANCE ────────────────────────────────────────────────────────────────

  {
    name: 'Two-Point Stance (RB)',
    category: 'technique',
    technique_area: 'stance',
    sets: 3, reps: 10, duration: null,
    why: 'A proper two-point stance keeps the RB balanced, hides their read, and allows equal explosion left or right. Poor stance telegraphs the play before the snap.',
    coaching_cue: 'Weight on balls of feet, slight forward lean, eyes through the line',
    common_mistake: 'Leaning too far forward or back — shifts weight and slows first step',
    fixes: ['slow first step', 'balance', 'stance', 'telegraphing'],
    progressions: ['Static hold reps', 'Stance + freeze on snap', 'Stance + live first step'],
    videos: [
      { title: 'Arian Foster proper stance', url: 'https://www.youtube.com/watch?v=C90C34g0-mc&t=145s', duration: '3:57' },
      { title: 'Running back 2 point stance', url: 'https://www.youtube.com/watch?v=R1S5jA59Al0', duration: '0:26' },
    ],
  },
  {
    name: 'Three-Point Stance (RB)',
    category: 'technique',
    technique_area: 'stance',
    sets: 3, reps: 10, duration: null,
    why: 'Three-point stance is used in I-formation and power sets. Hand placement and weight distribution directly determine first-step quickness and direction.',
    coaching_cue: 'Fingertips on ground, dominant foot staggered back, flat back',
    common_mistake: 'Putting full hand down — kills quick first step off the line',
    fixes: ['stance', 'first step', 'slow start', 'power formation'],
    progressions: ['Stance hold', 'Stance + direction command', 'Stance + live snap count'],
    videos: [
      { title: 'Running back 3 point stance', url: 'https://www.youtube.com/watch?v=xogouCANlcA', duration: '0:26' },
      { title: 'Fullback stance', url: 'https://www.youtube.com/watch?v=OVum0dwY3QE', duration: '1:39' },
    ],
  },

  // ── FIRST STEP ────────────────────────────────────────────────────────────

  {
    name: 'Stance Start & Reads',
    category: 'technique',
    technique_area: 'first_step',
    sets: 5, reps: 5, duration: null,
    why: 'Reading the defense and reacting with the correct first step is the foundation of every run. The RB who reads correctly gains 2–3 yards before contact.',
    coaching_cue: 'Read the backside guard — where he goes, you go',
    common_mistake: 'Eyes down at the ground instead of reading the blocking scheme',
    fixes: ['first step', 'slow off the ball', 'reading defense', 'hesitation'],
    progressions: ['Stance start to cone', 'Stance start vs. bag', 'Live snap with read'],
    videos: [
      { title: 'RB stance start and reads', url: 'https://www.youtube.com/watch?v=UpAq7w3n-FY&t=64s', duration: '3:37' },
      { title: 'How to get off the ball quickly', url: 'https://www.youtube.com/watch?v=Xbh5sc5ztzw', duration: '1:50' },
      { title: 'Coaching youth RB toss sweep', url: 'https://www.youtube.com/watch?v=9m0lGVmb4L8', duration: '1:28' },
    ],
  },
  {
    name: 'Mesh Drill (QB-RB)',
    category: 'technique',
    technique_area: 'first_step',
    sets: 4, reps: 8, duration: null,
    why: 'The mesh between QB and RB must be timed perfectly. A late or early step creates a fumble risk and slows the run. This drill syncs timing with muscle memory.',
    coaching_cue: 'Step to the QB, not away — close the mesh point fast',
    common_mistake: 'Taking too wide a path to the QB, creating a soft mesh',
    fixes: ['handoff', 'timing', 'first step', 'mesh', 'fumble'],
    progressions: ['Walk-through', 'Half speed', 'Full speed with live snap'],
    videos: [
      { title: 'QB and RB mesh drill (Verone McKinley)', url: 'https://www.youtube.com/watch?v=YFH10lm0Nmc', duration: '1:29' },
    ],
  },

  // ── HANDOFF ───────────────────────────────────────────────────────────────

  {
    name: 'Pocket Handoff Drill',
    category: 'technique',
    technique_area: 'handoff',
    sets: 4, reps: 10, duration: null,
    why: 'Creating a proper "pocket" (top arm parallel to ground, bottom arm angled up) gives the QB a clear target and prevents the ball from bouncing off the chest.',
    coaching_cue: 'Top arm creates the shelf — eyes forward, not at the ball',
    common_mistake: 'Reaching for the ball or breaking pocket too early — increases fumble risk',
    fixes: ['handoff', 'ball security', 'fumble', 'pocket'],
    progressions: ['Static pocket hold', 'Walk-through exchange', 'Full-speed mesh'],
    videos: [
      { title: 'How to take a handoff in football', url: 'https://www.youtube.com/watch?v=h5Tc0QPiB_o&t=7s', duration: '1:34' },
      { title: 'Running back handoff drill', url: 'https://www.youtube.com/watch?v=K2GxSW-RQg4&t=18s', duration: '1:19' },
      { title: 'Running back taking handoff', url: 'https://www.youtube.com/watch?v=a8U00sE81uE', duration: '0:24' },
      { title: 'RB training taking handoff', url: 'https://www.youtube.com/watch?v=BqERWHzlPgE&t=24s', duration: '1:59' },
    ],
  },
  {
    name: 'Handoff Exchange Drill (Team)',
    category: 'technique',
    technique_area: 'handoff',
    sets: 3, reps: null, duration: '10 minutes',
    why: 'Full-team handoff exchange reps build timing at game speed and expose any mesh-point inconsistencies between QB and RB.',
    coaching_cue: 'Run your path — trust the QB to find your pocket',
    common_mistake: 'Looking back at the QB during the approach',
    fixes: ['handoff', 'timing', 'fumble', 'mesh'],
    progressions: ['Walk-through', 'Half speed', 'Full speed live'],
    videos: [
      { title: 'Florida Gators RB Drills – handoff exchange', url: 'https://www.youtube.com/watch?v=CStJzFgTexU&t=828s', duration: '23:16 (full session)' },
      { title: 'Washington RBs – handoff drill', url: 'https://www.youtube.com/watch?v=QO-HilMzUdc&t=84s', duration: '12:14 (full session)' },
    ],
  },

  // ── BALL SECURITY ─────────────────────────────────────────────────────────

  {
    name: 'Four-Point Ball Carry (High & Tight)',
    category: 'technique',
    technique_area: 'ball_security',
    sets: 4, reps: null, duration: '30 seconds each',
    why: 'The four points of pressure (fingertips, forearm, bicep, chest) make it nearly impossible to strip the ball. Carrying the ball loose with one point is the leading cause of fumbles.',
    coaching_cue: 'Four points — fingers, forearm, bicep, chest. No daylight.',
    common_mistake: 'Single-point carry under pressure, especially after contact',
    fixes: ['ball security', 'fumble', 'carrying', 'loose ball'],
    progressions: ['Static hold', 'Jog with hold', 'Gauntlet drill with hold'],
    videos: [
      { title: 'Arian Foster ball security & transferring', url: 'https://www.youtube.com/watch?v=82zEvDo31IQ&t=77s', duration: '2:43' },
      { title: 'Football ball security with Arian Foster', url: 'https://www.youtube.com/watch?v=CqfEcaFooys', duration: '3:04' },
      { title: 'How to carry the football', url: 'https://www.youtube.com/watch?v=CqfEcaFooys', duration: '2:44' },
      { title: 'Coach Hinton ball security', url: 'https://www.youtube.com/watch?v=CqfEcaFooys', duration: '3:01' },
    ],
  },
  {
    name: 'Ball Security Gauntlet Drill',
    category: 'technique',
    technique_area: 'ball_security',
    sets: 5, reps: 2, duration: null,
    why: 'Running through defenders attempting to strip the ball under game-speed pressure builds the automatic muscle memory to secure the ball when everything is chaotic.',
    coaching_cue: 'Tuck before contact — don\'t wait until you feel the hit',
    common_mistake: 'Switching the ball to the outside arm near a defender',
    fixes: ['ball security', 'fumble', 'gauntlet', 'strip'],
    progressions: ['1 defender', '3 defenders', 'full gauntlet + change of direction'],
    videos: [
      { title: 'Gauntlet drill – Running Back', url: 'https://www.youtube.com/watch?v=CqfEcaFooys', duration: '0:52' },
      { title: 'Running Back Drills – Building ball security', url: 'https://www.youtube.com/watch?v=phpRnYwyPpo', duration: '3:48' },
      { title: 'Ball security drill (full session)', url: 'https://www.youtube.com/watch?v=DSwBMLlKMSY', duration: '13:44' },
      { title: 'Carolina Panthers banded ball security', url: 'https://www.youtube.com/watch?v=4ef8CXaIpoI', duration: '1:32' },
    ],
  },
  {
    name: 'Ball Security Tow Drill (Strip Resistance)',
    category: 'technique',
    technique_area: 'ball_security',
    sets: 4, reps: 8, duration: null,
    why: 'Resistance against a direct strip attempt trains grip strength and reinforces proper securing technique under the exact force used in games.',
    coaching_cue: 'When you feel the tug — squeeze tighter, don\'t pull back',
    common_mistake: 'Pulling the ball away instead of clamping down',
    fixes: ['ball security', 'fumble', 'strip', 'grip strength'],
    progressions: ['Partner tow', 'Partner tow + jog', 'Partner tow + change of direction'],
    videos: [
      { title: 'Applewhite UT RB drills – tow drill', url: 'https://www.youtube.com/watch?v=Ax-Xyr_EXD0&t=234s', duration: '15:59 (full session)' },
      { title: 'Florida Gators – tow drill', url: 'https://www.youtube.com/watch?v=CStJzFgTexU&t=828s', duration: '23:16 (full session)' },
    ],
  },
  {
    name: 'Grip Strength — Isometric Holds',
    category: 'strength',
    technique_area: 'ball_security',
    sets: 3, reps: null, duration: '30 seconds each',
    why: 'Grip strength is the physical foundation of ball security. Stronger grip = harder to strip, period.',
    coaching_cue: 'Squeeze until you feel the burn, hold through it',
    common_mistake: 'Releasing before time is up — partial reps don\'t build strength',
    fixes: ['ball security', 'grip', 'fumble', 'strip'],
    progressions: ['Squeeze rice', 'Plate pinch', 'Isometric holds with weight'],
    videos: [
      { title: 'Isometric holds for grip strength', url: 'https://www.youtube.com/watch?v=8olu5gLWYMs', duration: '1:30' },
      { title: 'Plate pinch for stronger grip', url: 'https://www.youtube.com/watch?v=lFhg2nAC1c0', duration: '0:35' },
      { title: 'Squeeze rice for grip strength', url: 'https://www.youtube.com/watch?v=IJYvvJUJc5Y', duration: '0:25' },
    ],
  },

  // ── CONTACT / BREAKING TACKLES ────────────────────────────────────────────

  {
    name: 'Dip & Rip',
    category: 'technique',
    technique_area: 'contact_breaking_tackles',
    sets: 4, reps: 8, duration: null,
    why: 'Dipping the shoulder and ripping through the tackler\'s arms is the most effective tackle-breaking technique through the line. It lowers your pad level and generates upward force through the defender.',
    coaching_cue: 'Dip the shoulder, rip up through the armpit — not around',
    common_mistake: 'Going around the tackler instead of through — loses yards and momentum',
    fixes: ['breaking tackles', 'contact', 'pad level', 'yards after contact'],
    progressions: ['Bag rip', 'Partner static', 'Live pursuit drill'],
    videos: [
      { title: 'Claude Mathis: Dip & Rip', url: 'https://www.youtube.com/watch?v=BvwgyCg-C8s', duration: '2:07' },
      { title: 'How to break free from defenders & run the football', url: 'https://www.youtube.com/watch?v=6JRPyfD8FAo', duration: '1:17' },
    ],
  },
  {
    name: 'Spin Move',
    category: 'technique',
    technique_area: 'contact_breaking_tackles',
    sets: 4, reps: 6, duration: null,
    why: 'The spin move creates separation by rotating away from a tackler\'s grip in space. Done correctly it adds 3–5 yards on broken tackle plays.',
    coaching_cue: 'Plant the outside foot, spin tight — wide spin loses yards',
    common_mistake: 'Spinning too wide or without planting — defender stays attached',
    fixes: ['breaking tackles', 'spin', 'space', 'yards after contact'],
    progressions: ['Cone spin', 'Bag spin', 'Live pursuit spin'],
    videos: [
      { title: 'Spin Move (LaDainian Tomlinson)', url: 'https://www.youtube.com/watch?v=ItjlV-zqX1w', duration: '1:20' },
      { title: 'RB Academy – Hit and Spin', url: 'https://www.youtube.com/watch?v=UDxqYOu4iNE', duration: '1:20' },
    ],
  },
  {
    name: 'Stiff Arm Drill',
    category: 'technique',
    technique_area: 'contact_breaking_tackles',
    sets: 4, reps: 8, duration: null,
    why: 'A proper stiff arm extends full arm length, targeting the defender\'s face/shoulder. It creates maximum distance and allows the RB to accelerate past.',
    coaching_cue: 'Full extension — lock the elbow, push through, don\'t hold',
    common_mistake: 'Bent elbow stiff arm — no leverage, can get grabbed',
    fixes: ['stiff arm', 'contact', 'breaking tackles', 'arm strength'],
    progressions: ['Static push on wall', 'Bag stiff arm', 'Live one-on-one pursuit'],
    videos: [
      { title: 'RB Academy – Stiff Arm Drill', url: 'https://www.youtube.com/watch?v=4xKUOgGZCdk', duration: '1:42' },
      { title: 'Stiff arm drill', url: 'https://www.youtube.com/watch?v=9I22dQk0SXo&t=22s', duration: '1:21' },
    ],
  },
  {
    name: 'Same Foot Same Shoulder (Sideline Tackle Avoidance)',
    category: 'technique',
    technique_area: 'contact_breaking_tackles',
    sets: 4, reps: 6, duration: null,
    why: 'When a tackler approaches from the sideline, using the same foot and shoulder as the defender creates a natural shield, protecting the ball and generating a cutting angle to avoid the tackle.',
    coaching_cue: 'Left defender = left shoulder and left foot forward. Make yourself a wall.',
    common_mistake: 'Leading with the opposite shoulder — opens the body to the tackle',
    fixes: ['sideline tackle', 'same foot same shoulder', 'contact', 'open field'],
    progressions: ['Walk-through with partner', 'Jog speed', 'Full-speed sideline drill'],
    videos: [
      { title: '2 Minute Drill – Same Foot Same Shoulder (Merril Hoge)', url: 'https://www.youtube.com/watch?v=8J4ucrLFpJ0&t=22s', duration: '2:45' },
      { title: 'Spread Offense RB Drills – sideline tackle', url: 'https://www.youtube.com/watch?v=0KPXkWSBHOA&t=211s', duration: '34:52 (full session)' },
    ],
  },
  {
    name: 'Pad Level & Balance Contact Drill',
    category: 'technique',
    technique_area: 'contact_breaking_tackles',
    sets: 4, reps: null, duration: '5 minutes',
    why: 'Staying low (pad level below the tackler) gives the RB a physical leverage advantage. High pad level = easy tackle; low pad = extra yards.',
    coaching_cue: 'Bend your knees, not your waist — eyes up, pads down',
    common_mistake: 'Bending at the waist and losing balance after first contact',
    fixes: ['pad level', 'balance', 'contact', 'yards after contact', 'falling forward'],
    progressions: ['Bag contact drill', 'Shield contact drill', 'Live pursuit'],
    videos: [
      { title: 'Avoid being tackled – Stay low and keep balance', url: 'https://www.youtube.com/watch?v=XIYnzAZlFII&t=11s', duration: '1:23' },
      { title: 'RB Drills – Explosion after contact', url: 'https://www.youtube.com/watch?v=T4l0hVBkCOA', duration: '3:01' },
      { title: 'Press the line & side shuffle', url: 'https://www.youtube.com/watch?v=CXGYTJ8O334', duration: '1:37' },
      { title: 'Guaranteed yardage vs a linebacker', url: 'https://www.youtube.com/watch?v=DduYOoh2saY', duration: '3:29' },
    ],
  },
  {
    name: 'Wounded Dog Drill',
    category: 'strength',
    technique_area: 'contact_breaking_tackles',
    sets: 3, reps: 6, duration: null,
    why: 'The wounded dog drill develops the core and hip strength needed to stay upright after being hit off-balance, converting would-be tackles into positive yards.',
    coaching_cue: 'Fight for the ground — every inch counts after first contact',
    common_mistake: 'Going down on first contact instead of driving legs through',
    fixes: ['contact', 'balance', 'yards after contact', 'falling forward', 'leg drive'],
    progressions: ['Cone drill', 'Partner resistance', 'Live contact'],
    videos: [
      { title: 'Wounded Dog drill', url: 'https://www.youtube.com/watch?v=mvyXb0hkM5Q', duration: '1:04' },
    ],
  },

  // ── BLOCKING ──────────────────────────────────────────────────────────────

  {
    name: 'Pass Protection Mirror Drill',
    category: 'technique',
    technique_area: 'blocking',
    sets: 4, reps: null, duration: '30 seconds each',
    why: 'Pass protection is the #1 skill separating good RBs from great ones in the NFL. The mirror drill builds the lateral footwork and hand timing to stay in front of a blitzing linebacker.',
    coaching_cue: 'Stay square, punch on contact — don\'t lunge or reach',
    common_mistake: 'Over-committing to one side and getting beat to the other',
    fixes: ['pass protection', 'blocking', 'blitz pickup', 'footwork'],
    progressions: ['Mirror only', 'Mirror + punch', 'Live one-on-one vs LB'],
    videos: [
      { title: 'Pass protection and mirror drill for RBs', url: 'https://www.youtube.com/watch?v=uohNDI20NNI&t=63s', duration: '3:34' },
      { title: 'Justin Forsett QB protect', url: 'https://www.youtube.com/watch?v=iLsEVO-lI8M&t=147s', duration: '3:41' },
      { title: 'Alabama RBs – pass blocking practice', url: 'https://www.youtube.com/watch?v=s9XMDaH_jOg', duration: '0:43' },
      { title: 'Running backs – pass protection', url: 'https://www.youtube.com/watch?v=EHjPR1v7cE8', duration: '1:12' },
    ],
  },
  {
    name: 'Punch & Extend Block Drill',
    category: 'technique',
    technique_area: 'blocking',
    sets: 4, reps: 10, duration: null,
    why: 'The punch-and-extend technique (hands inside the defender\'s frame, elbows in, driving through) is the foundation of all run and pass blocking.',
    coaching_cue: 'Hands inside, thumbs up, drive through the chest — not the shoulders',
    common_mistake: 'Punching with hands outside the frame — no leverage, easy shed',
    fixes: ['blocking', 'run block', 'hand placement', 'leverage'],
    progressions: ['From knees on bag', 'From 3-point stance on bag', 'Punch and drive sled'],
    videos: [
      { title: 'Football tips – how to block as RB', url: 'https://www.youtube.com/watch?v=1ApW8UUn9sA', duration: '2:58' },
      { title: 'RB run block technique', url: 'https://www.youtube.com/watch?v=YHdlbVOmB5s', duration: '2:56' },
      { title: 'Florida Gators – block technique from knees', url: 'https://www.youtube.com/watch?v=CStJzFgTexU&t=828s', duration: '23:16 (full session)' },
    ],
  },
  {
    name: 'Cut Block Drill',
    category: 'technique',
    technique_area: 'blocking',
    sets: 3, reps: 8, duration: null,
    why: 'Cut blocking (targeting the defender\'s lower half) is used in zone-run schemes to neutralize pass rushers. Proper technique keeps the RB safe and effective.',
    coaching_cue: 'Aim at the thighs — not the knees. Explode and bear crawl through.',
    common_mistake: 'Targeting the knees — illegal and ineffective',
    fixes: ['blocking', 'cut block', 'zone scheme', 'pass rush'],
    progressions: ['From distance to bag', 'Up close with bear crawl finish', 'Live vs partner'],
    videos: [
      { title: 'Running back cut block', url: 'https://www.youtube.com/watch?v=1r7weNOetQc', duration: '0:17' },
      { title: 'Northwestern – kneeling cut block drill', url: 'https://www.youtube.com/watch?v=OMPGRdNxnBU', duration: '1:24' },
    ],
  },
  {
    name: 'Meet in the Middle (Blocking)',
    category: 'technique',
    technique_area: 'blocking',
    sets: 4, reps: 6, duration: null,
    why: 'Teaches the RB to engage a defender on the move — getting hands inside under game-speed collision conditions. Critical for pulling blocks and lead blocks.',
    coaching_cue: 'Win the inside hand position — hands inside wins every time',
    common_mistake: 'Shoulders hitting first instead of hands',
    fixes: ['blocking', 'hand placement', 'collision', 'lead block'],
    progressions: ['Head-on', 'Angled approach', 'Angle + ride to outside'],
    videos: [
      { title: 'Spread Offense RB Drills – meet in the middle', url: 'https://www.youtube.com/watch?v=0KPXkWSBHOA&t=211s', duration: '34:52 (full session)' },
    ],
  },

  // ── CUTS ─────────────────────────────────────────────────────────────────

  {
    name: 'Jump Cut Drill',
    category: 'footwork',
    technique_area: 'cuts',
    sets: 4, reps: 8, duration: null,
    why: 'The jump cut (hop and plant to change direction) is the most effective way to make a defender miss in a tight space. One clean jump cut = a missed tackle + 5 bonus yards.',
    coaching_cue: 'One foot, two foot, or agile — plant and explode opposite. Don\'t round it.',
    common_mistake: 'Rounding the cut instead of planting and driving — defender stays in position',
    fixes: ['cuts', 'change of direction', 'jump cut', 'making defenders miss', 'open field'],
    progressions: ['1-foot jump cut', '2-foot jump cut', 'Agile jump cut', 'Jump cut vs live defender'],
    videos: [
      { title: 'RB Drills – Jump cuts', url: 'https://www.youtube.com/watch?v=ZX5z1Jckzhw', duration: '0:46' },
      { title: 'Florida Gators – Jump cuts', url: 'https://www.youtube.com/watch?v=CStJzFgTexU&t=828s', duration: '23:16 (full session)' },
      { title: 'Spread Offense RB Drills – jump cuts (1 foot, 2 foot, agile)', url: 'https://www.youtube.com/watch?v=0KPXkWSBHOA&t=211s', duration: '34:52 (full session)' },
    ],
  },
  {
    name: 'Plant & Drive Cut (45° Cone Drill)',
    category: 'footwork',
    technique_area: 'cuts',
    sets: 4, reps: 6, duration: null,
    why: 'Planting at 45° and driving out is the foundation of all cut routes and zone-read cuts. Sharp cuts create separation; rounded cuts don\'t.',
    coaching_cue: 'Bend the knee on the plant foot — straight leg = no explosion',
    common_mistake: 'Cutting on a rounded path — defender can mirror and make the tackle',
    fixes: ['cuts', 'change of direction', 'route running', 'plant and drive'],
    progressions: ['Cones only', 'Cones + rip finish vs bag', 'Cones + roll off vs bag'],
    videos: [
      { title: 'How to make running back sharp cuts', url: 'https://www.youtube.com/watch?v=RbqPagBudl8', duration: '3:02' },
      { title: 'Running back run cut drills', url: 'https://www.youtube.com/watch?v=pQRw3zZvb_g&t=179s', duration: '9:43' },
    ],
  },
  {
    name: 'Shuffle Cut',
    category: 'footwork',
    technique_area: 'cuts',
    sets: 3, reps: 8, duration: null,
    why: 'The shuffle cut keeps the RB\'s hips square to the line of scrimmage while setting up a cut — allowing them to go any direction without telegraphing.',
    coaching_cue: 'Stay square, shuffle — don\'t open your hips until you commit',
    common_mistake: 'Opening hips during the shuffle — defender reads it instantly',
    fixes: ['cuts', 'footwork', 'change of direction', 'telegraphing'],
    progressions: ['Shuffle + cut to cone', 'Shuffle + react to coach signal', 'Live shuffle cut'],
    videos: [
      { title: 'Washington RBs – shuffle cut', url: 'https://www.youtube.com/watch?v=QO-HilMzUdc&t=84s', duration: '12:14 (full session)' },
      { title: 'RB footwork drill – shuffle cut', url: 'https://www.youtube.com/watch?v=afu1Ve1D11I', duration: '1:52' },
    ],
  },

  // ── FOOTWORK ─────────────────────────────────────────────────────────────

  {
    name: 'Third Leg Drill (Balance)',
    category: 'footwork',
    technique_area: 'footwork',
    sets: 3, reps: null, duration: '5 minutes',
    why: 'The "third leg" concept trains the RB to always have a foot on the ground during a cut — never both feet in the air — maintaining balance and explosion angle.',
    coaching_cue: 'One foot always touching — you always have a third leg planted',
    common_mistake: 'Both feet in the air at the cut — zero leverage, easy to trip up',
    fixes: ['balance', 'footwork', 'cuts', 'third leg', 'coordination'],
    progressions: ['Walk-through with ball', 'Jog speed', 'Full-speed with ball security'],
    videos: [
      { title: 'Applewhite UT RB drills – third leg drill', url: 'https://www.youtube.com/watch?v=Ax-Xyr_EXD0&t=234s', duration: '15:59 (full session)' },
      { title: 'Florida Gators – third leg + ball security', url: 'https://www.youtube.com/watch?v=CStJzFgTexU&t=828s', duration: '23:16 (full session)' },
      { title: 'Georgia Bulldogs – third leg drill', url: 'https://www.youtube.com/watch?v=DA6nXrKDHCg&t=256s', duration: '26:25 (full session)' },
    ],
  },
  {
    name: 'Ladder Footwork (RB)',
    category: 'footwork',
    technique_area: 'footwork',
    sets: 3, reps: null, duration: '10 minutes',
    why: 'Ladder drills train the feet to move independently and quickly — directly translating to faster cuts, quicker first steps, and better balance through traffic.',
    coaching_cue: 'Eyes up, not on the ladder — arms drive your feet',
    common_mistake: 'Looking down at the ladder — kills game-speed reads',
    fixes: ['footwork', 'foot speed', 'coordination', 'agility', 'lateral quickness'],
    progressions: ['High knees through', 'Lateral in-out', 'Ickey shuffle', 'React + sprint'],
    videos: [
      { title: 'Football basics – RB football drills', url: 'https://www.youtube.com/watch?v=Bb6KKt0uMu0', duration: '2:04' },
      { title: 'Football training tips – running back drills', url: 'https://www.youtube.com/watch?v=0jt2bJSqG5o', duration: '1:52' },
      { title: 'Running back footwork warmup', url: 'https://www.youtube.com/watch?v=Ocs9fiPbQE8', duration: '2:23' },
      { title: 'Justin Forsett – running back footwork', url: 'https://www.youtube.com/watch?v=bXlR-sGf06E', duration: '4:24' },
    ],
  },
  {
    name: 'RB Cone Drills (4-Cone)',
    category: 'agility',
    technique_area: 'footwork',
    sets: 4, reps: null, duration: '8 minutes',
    why: 'Cone drills train change of direction with specific cut angles that mirror real game scenarios — around blockers, through gaps, and past defenders.',
    coaching_cue: 'Low on the cones, explode out of each turn',
    common_mistake: 'Standing up at cone turns — kills the acceleration out of the cut',
    fixes: ['footwork', 'change of direction', 'cone drills', 'agility', 'cuts'],
    progressions: ['Single cone', '3-cone', '4-cone', 'With reaction signal'],
    videos: [
      { title: 'RB Cone Drills', url: 'https://www.youtube.com/watch?v=1Q00yl4nnSs&t=2s', duration: '8:56' },
      { title: 'Running back drills', url: 'https://www.youtube.com/watch?v=LeDFfyoU0LY', duration: '2:25' },
    ],
  },
  {
    name: 'Z-Drill (Bags + Reaction)',
    category: 'agility',
    technique_area: 'footwork',
    sets: 4, reps: 4, duration: null,
    why: 'The Z-drill combines jumping over bags (in a Z-pattern), sprinting, and reacting to a live defender — simulating the exact footwork required in broken-play situations.',
    coaching_cue: 'Land and go — no pause at the jump, your eyes are already on the defender',
    common_mistake: 'Pausing after the jump before reacting to the defender',
    fixes: ['footwork', 'reaction time', 'agility', 'broken play', 'open field'],
    progressions: ['Bags only', 'Bags + cone', 'Bags + live defender react'],
    videos: [
      { title: 'Spread Offense RB Drills – Z-drill', url: 'https://www.youtube.com/watch?v=0KPXkWSBHOA&t=211s', duration: '34:52 (full session)' },
    ],
  },

  // ── CATCHING ─────────────────────────────────────────────────────────────

  {
    name: 'Route Running Out of Backfield',
    category: 'technique',
    technique_area: 'catching',
    sets: 4, reps: 8, duration: null,
    why: 'RBs who can run precise routes (flat, swing, hook/dump, arrow) are game-changers in the passing game. Imprecise routes lead to missed completions and coverage sacks.',
    coaching_cue: 'Sell the run first — then release clean on the route',
    common_mistake: 'Releasing into the route without selling the run fake first',
    fixes: ['route running', 'catching', 'pass game', 'backfield routes'],
    progressions: ['Walk-through route', 'Half speed', 'Full speed with QB', 'vs coverage'],
    videos: [
      { title: 'RB route running from backfield', url: 'https://www.youtube.com/watch?v=iNKI-qPDKR0', duration: '2:37' },
      { title: 'Swing route for RBs', url: 'https://www.youtube.com/watch?v=EsXjPkIyX6w', duration: '1:08' },
      { title: 'The flat route for RBs', url: 'https://www.youtube.com/watch?v=cVKCf9DSoQ4', duration: '0:58' },
      { title: 'Flat route (right) technique', url: 'https://www.youtube.com/watch?v=bwpXAOpkrlA', duration: '0:32' },
      { title: 'Georgia Bulldogs – RB routes (hook, flat, arrow, swing)', url: 'https://www.youtube.com/watch?v=DA6nXrKDHCg&t=256s', duration: '26:25 (full session)' },
    ],
  },
  {
    name: 'Hand & Finger Placement (Catch Technique)',
    category: 'technique',
    technique_area: 'catching',
    sets: 3, reps: 20, duration: null,
    why: 'Thumbs-in for balls at or above the waist, thumbs-out for balls below. Wrong hand placement is the #1 cause of drops in the passing game.',
    coaching_cue: 'Catch with your hands, not your body. Soft hands — squeeze after the catch.',
    common_mistake: 'Body catching (trapping the ball against the chest) instead of extending to catch',
    fixes: ['catching', 'drops', 'hand placement', 'pass game', 'hands'],
    progressions: ['Wall ball', 'Partner toss close range', 'Full route + catch'],
    videos: [
      { title: 'Arian Foster – working with your hands', url: 'https://www.youtube.com/watch?v=3hRemkNU1d0&t=193s', duration: '5:25' },
      { title: 'How to catch a football – tips', url: 'https://www.youtube.com/watch?v=cxiDnxxQmN8', duration: '1:58' },
      { title: 'Crimson Football – catching a pass', url: 'https://www.youtube.com/watch?v=3oDnVRI9P0E', duration: '1:17' },
    ],
  },
  {
    name: '3 RB Catching Drills',
    category: 'technique',
    technique_area: 'catching',
    sets: 3, reps: null, duration: '10 minutes',
    why: 'Varied catching angles and speeds (high, low, away, behind) train the RB to catch anything thrown their way under pressure.',
    coaching_cue: 'Eyes on the ball all the way into the hands — not to the defender',
    common_mistake: 'Taking eyes off the ball before securing it to look for the defender',
    fixes: ['catching', 'drops', 'concentration', 'pass game'],
    progressions: ['Stationary', 'Moving', 'Movement + defender'],
    videos: [
      { title: '3 Running back catching drills', url: 'https://www.youtube.com/watch?v=Oesi9adAdpU&t=42s', duration: '3:17' },
    ],
  },

  // ── STRENGTH & CONDITIONING ───────────────────────────────────────────────

  {
    name: 'RB Leg Strength Circuit',
    category: 'strength',
    technique_area: 'strength_conditioning',
    sets: 3, reps: 12, duration: null,
    why: 'Leg strength is the engine behind every explosive cut, jump, and tackle break. RBs without strong legs gas out by the 4th quarter.',
    coaching_cue: 'Full range of motion — half reps build half the strength',
    common_mistake: 'Skipping single-leg work — imbalances show up as ankle injuries in games',
    fixes: ['speed', 'explosion', 'leg strength', 'conditioning', 'endurance'],
    progressions: ['Bodyweight', 'Loaded', 'Loaded + explosive finish'],
    videos: [
      { title: 'Justin Forsett leg strength', url: 'https://www.youtube.com/watch?v=9acM0P6DASM', duration: '2:47' },
      { title: 'Football RB strength and weight training', url: 'https://www.youtube.com/watch?v=GquC4ouwd8c', duration: '0:55' },
      { title: 'How to get bigger for a fullback/RB position', url: 'https://www.youtube.com/watch?v=WXNLoZ0SmoY', duration: '1:59' },
      { title: 'Strength training – football RB (Tim Gambone)', url: 'https://www.youtube.com/watch?v=mIqXlUvDgdM', duration: '9:39' },
      { title: 'Weightlifting routines for RBs', url: 'https://www.youtube.com/watch?v=HTJmlkZlmMc', duration: '2:56' },
    ],
  },
  {
    name: 'Balance & Agility Indoor Circuit (RB)',
    category: 'agility',
    technique_area: 'strength_conditioning',
    sets: 3, reps: null, duration: '20 minutes',
    why: 'Off-season indoor balance and agility work maintains the RB\'s proprioception and foot quickness even without field access.',
    coaching_cue: 'Control the movement — speed comes after you own the pattern',
    common_mistake: 'Going too fast before the pattern is clean — builds bad habits',
    fixes: ['agility', 'balance', 'footwork', 'conditioning', 'coordination'],
    progressions: ['Balance only', 'Balance + agility', 'Full circuit timed'],
    videos: [
      { title: 'RB training – indoor balance and agility', url: 'https://www.youtube.com/watch?v=Scq3EklQ6vQ&t=10s', duration: '6:28' },
      { title: 'RB training – indoor conditioning workout', url: 'https://www.youtube.com/watch?v=IQkmQMx5J9Q', duration: '4:00' },
      { title: 'RB training – indoor hand and eye coordination', url: 'https://www.youtube.com/watch?v=BaQreD665tU&t=44s', duration: '4:46' },
      { title: 'Arian Foster – nutrition & what to eat as an RB', url: 'https://www.youtube.com/watch?v=-KAuRupDP0Q&t=102s', duration: '2:55', notes: 'Nutrition context' },
    ],
  },
  {
    name: 'Football Conditioning Off-Season Drill',
    category: 'speed',
    technique_area: 'strength_conditioning',
    sets: 5, reps: null, duration: '5 minutes total',
    why: 'Position-specific conditioning keeps the RB game-ready and builds the anaerobic capacity needed to explode on every play even late in the game.',
    coaching_cue: 'Every rep at game speed — conditioning at practice speed is useless',
    common_mistake: 'Jogging through conditioning reps — builds slow-twitch habits in a fast-twitch position',
    fixes: ['conditioning', 'endurance', 'speed', 'fourth quarter'],
    progressions: ['Moderate intensity', 'High intensity', 'Position-specific sprint circuits'],
    videos: [
      { title: 'Football conditioning off-season RB drill', url: 'https://www.youtube.com/watch?v=iaAo9Ju4KQQ', duration: '1:05' },
    ],
  },

  // ── ALL-AROUND FULL SESSION REFERENCE ────────────────────────────────────
  // These 8 comprehensive full-session videos cover multiple technique areas.
  // Referenced here for coaches who want to study complete practice sessions.

  {
    name: 'Full Practice Session Study (All Areas)',
    category: 'technique',
    technique_area: 'footwork',   // spans all areas — filed under footwork
    sets: null, reps: null, duration: 'Full sessions (7–35 min each)',
    why: 'Watching elite-level full practice sessions provides context for how drills chain together — stance into first step into contact into route, all in one flow.',
    coaching_cue: 'Study how each rep transitions to the next — football is one continuous motion',
    common_mistake: 'Practicing drills in isolation without understanding how they connect in a play',
    fixes: ['all around', 'full session', 'comprehensive', 'study', 'practice'],
    progressions: ['Watch and take notes', 'Replicate each drill segment', 'Build your own session from the sequence'],
    videos: [
      { title: 'NFL HSPD RB drills (footwork, pad level, routes)', url: 'https://www.youtube.com/watch?v=Apjo2HCaB2w&t=123s', duration: '8:30', notes: 'Commentary + explanation' },
      { title: 'RB Drills compilation (third leg, cone, bags, gauntlet)', url: 'https://www.youtube.com/watch?v=IqwLPGMneGU&t=1s', duration: '7:02' },
      { title: 'RB Drills #1 (blocking, routes, cones, pass pro)', url: 'https://www.youtube.com/watch?v=5Ujc0H_JLXI&t=430s', duration: '13:11' },
      { title: 'Applewhite UT RB drills (third leg, ball security, pass blocking)', url: 'https://www.youtube.com/watch?v=Ax-Xyr_EXD0&t=234s', duration: '15:59', notes: 'Drills shown from two viewpoints' },
      { title: 'Florida Gators RB Drills 2006 (handoff, bags, jump cuts, blocking)', url: 'https://www.youtube.com/watch?v=CStJzFgTexU&t=828s', duration: '23:16' },
      { title: 'Georgia Bulldogs RB Drills (stance, handoff, routes, bags)', url: 'https://www.youtube.com/watch?v=DA6nXrKDHCg&t=256s', duration: '26:25', notes: 'Commentary + explanation' },
      { title: 'Spread Offense RB Drills (jump cuts, Z-drill, gauntlet, blocking)', url: 'https://www.youtube.com/watch?v=0KPXkWSBHOA&t=211s', duration: '34:52' },
      { title: 'Washington Running Backs (handoff, ball security, footwork, cuts)', url: 'https://www.youtube.com/watch?v=QO-HilMzUdc&t=84s', duration: '12:14', notes: 'With commentary' },
    ],
  },
]

// ─── Helper: Get drills by technique area ────────────────────────────────────

export function getRBDrillsByArea(area: RBTechniqueArea): RBDrillEntry[] {
  return RB_DRILLS.filter(d => d.technique_area === area)
}

// ─── Helper: Find relevant drills by pain point keywords ─────────────────────

export function findRBDrillsForPainPoint(painPoint: string): RBDrillEntry[] {
  const lower = painPoint.toLowerCase()
  return RB_DRILLS.filter(d =>
    d.fixes.some(fix => lower.includes(fix) || fix.includes(lower.split(' ')[0]))
  ).slice(0, 4)
}

// ─── Helper: Convert RBDrillEntry to Exercise for training plan ──────────────

export function rbDrillToExercise(drill: RBDrillEntry): import('@/types').Exercise {
  return {
    name: drill.name,
    sets: drill.sets,
    reps: drill.reps,
    duration: drill.duration,
    why: drill.why,
    category: drill.category,
  }
}

// ─── Map of technique areas to readable labels ───────────────────────────────

export const RB_AREA_LABELS: Record<RBTechniqueArea, string> = {
  stance:                    'Stance',
  first_step:                'First Step & Reads',
  handoff:                   'Handoff',
  ball_security:             'Ball Security',
  contact_breaking_tackles:  'Contact & Breaking Tackles',
  blocking:                  'Blocking',
  cuts:                      'Cuts',
  footwork:                  'Footwork',
  catching:                  'Catching & Routes',
  strength_conditioning:     'Strength & Conditioning',
}
