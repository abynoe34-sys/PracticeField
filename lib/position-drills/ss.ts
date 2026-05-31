/**
 * Strong Safety (SS) Position Drill Library
 *
 * The Strong Safety is the "enforcer" who lines up closer to the line of
 * scrimmage on the strong side of the formation.
 *
 * Primary Role: Playing in the "box" to stop the run, blitzing, and matching
 *   up with tight ends or running backs in pass coverage.
 * Key Skills:  Physicality, block-shedding, and reliable open-field tackling.
 *
 * Drill emphasis: block destruction and run support first,
 * underneath zone coverage second, blitz and TE coverage third.
 */

import type { Exercise } from '@/types'

export interface DrillVideoSS {
  title: string
  url: string
  duration: string
  notes?: string
}

export type SSTechniqueArea =
  | 'block_shedding'  // striking and shedding OL/TE blocks in the box
  | 'run_support'     // box tackling, alley fit, open-field tackles
  | 'zone_drop'       // hook/curl drops, underneath coverage vs TE and RB
  | 'blitz'           // box blitz paths, timing, disguise
  | 'te_coverage'     // man coverage on TEs and backs
  | 'conditioning'    // physicality and strength foundation

export type SSDrillCategory = Exercise['category']

export interface SSDrillEntry {
  name: string
  category: SSDrillCategory
  technique_area: SSTechniqueArea
  sets: number | null
  reps: number | null
  duration: string | null
  why: string
  coaching_cue: string
  common_mistake: string
  fixes: string[]
  progressions: string[]
  videos: DrillVideoSS[]
}

export const SS_DRILLS: SSDrillEntry[] = [

  // ── BLOCK DESTRUCTION ─────────────────────────────────────────────────────

  {
    name: 'Block Destruction / Shed Drill',
    category: 'technique',
    technique_area: 'block_shedding',
    sets: 4, reps: 8, duration: null,
    why: 'The SS takes on OL and TE blocks in the box on every run play. Striking first with both hands inside the frame and shedding before the ball carrier cuts is the difference between a 2-yard stop and a 10-yard gain.',
    coaching_cue: 'Strike first — two hands inside the frame, punch through the chest, separate and shed. Never let the blocker get into your body.',
    common_mistake: 'Absorbing the block without striking — gets carried away from the tackle lane by a blocker who already has momentum',
    fixes: ['block shedding', 'shed', 'block', 'tackle', 'run support', 'box', 'OL', 'TE', 'run defense', 'strike', 'punch', 'destroy'],
    progressions: ['Strike-and-shed form drill vs pad', 'Half-speed block defeat vs live blocker', 'Full-speed block destruction vs blocker + ball carrier'],
    videos: [
      { title: 'Strong Safety Block Destruction Shed Drill Football', url: 'https://www.youtube.com/results?search_query=strong+safety+block+destruction+shed+drill+football', duration: '~8 min' },
    ],
  },

  // ── RUN SUPPORT & TACKLING ────────────────────────────────────────────────

  {
    name: 'Box Form Tackling — Head-Across-the-Bow',
    category: 'technique',
    technique_area: 'run_support',
    sets: 4, reps: 8, duration: null,
    why: 'The SS makes more tackles in the box than any other DB. Head-across-the-bow technique — head on the near side of the ball carrier — ensures a legal tackle with full wrap and drive through contact in tight spaces.',
    coaching_cue: 'Head across the front of the carrier — wrong shoulder, cheek to the ball, wrap and drive your feet through the whistle',
    common_mistake: 'Diving at the ankles or leading with the crown instead of placing the head properly — results in missed tackles, penalties, or injury risk',
    fixes: ['tackle', 'form tackle', 'tackle technique', 'miss tackle', 'box tackle', 'run support', 'wrap', 'drive', 'head position', 'tackling'],
    progressions: ['Walk-through approach and head placement', 'Half-speed form tackle vs slow ball carrier', 'Full-speed form tackle drill'],
    videos: [
      { title: 'Strong Safety Box Form Tackling Head Across the Bow', url: 'https://www.youtube.com/results?search_query=strong+safety+box+form+tackling+head+across+bow+football', duration: '~7 min' },
    ],
  },
  {
    name: 'Open-Field Tackle — Alley Fit',
    category: 'technique',
    technique_area: 'run_support',
    sets: 4, reps: 8, duration: null,
    why: 'The SS is the primary alley defender — first to arrive on outside runs, sweeps, and screens. Pressing the inside hip and forcing the carrier to the sideline is the SS\'s assignment; lunging creates broken tackles and touchdowns.',
    coaching_cue: 'Shorten your stride as you close — press the inside hip, not the ball. Force them to the sideline or make the tackle.',
    common_mistake: 'Running full-speed into the ball carrier and lunging — gets juked or gets a penalty on the spin move',
    fixes: ['open field tackle', 'alley', 'run support', 'outside run', 'sweep', 'miss tackle', 'tackle', 'force', 'sideline', 'break down'],
    progressions: ['Approach and break-down drill (no contact)', 'Alley fit vs slow ball carrier', 'Full-speed open-field tackle'],
    videos: [
      { title: 'Strong Safety Open Field Tackle Alley Fit Drill Football', url: 'https://www.youtube.com/results?search_query=strong+safety+open+field+tackle+alley+fit+drill+football', duration: '~7 min' },
    ],
  },

  // ── ZONE DROPS ────────────────────────────────────────────────────────────

  {
    name: 'Hook/Curl Drop — SS Underneath Zone',
    category: 'footwork',
    technique_area: 'zone_drop',
    sets: 4, reps: 8, duration: null,
    why: 'In Cover 2 and Tampa-2 the SS drops quickly from near the LOS into the hook-curl zone to disrupt TE and RB checkdowns. The drop must be fast (4-6 yards) and at the correct angle — not so deep that the short throw goes underneath.',
    coaching_cue: 'Drop at 45 degrees to your landmark — collision anything entering your zone, then rally to the ball on the throw',
    common_mistake: 'Dropping straight back instead of at 45 degrees — narrows the zone window and allows the TE to run the seam route behind the drop',
    fixes: ['hook curl', 'zone drop', 'zone', 'Cover 2', 'TE coverage', 'checkdown', 'underneath', 'short pass', 'hook', 'curl', 'depth'],
    progressions: ['Walk-through landmark and angle identification', 'Drop + react to coach signal', 'Full-speed zone vs TE and RB route combos'],
    videos: [
      { title: 'Strong Safety Hook Curl Zone Drop Underneath Coverage', url: 'https://www.youtube.com/results?search_query=strong+safety+hook+curl+zone+drop+underneath+coverage+football', duration: '~8 min' },
    ],
  },

  // ── BLITZ ─────────────────────────────────────────────────────────────────

  {
    name: 'Box Blitz Path Drill — SS Pressure',
    category: 'technique',
    technique_area: 'blitz',
    sets: 3, reps: 8, duration: null,
    why: 'The SS blitz from the box is one of the most effective in football — it arrives from an angle the O-line didn\'t account for. The path must be flat off the snap with no arc, arriving at the QB in a straight line.',
    coaching_cue: 'Flat path off the snap — you\'re going through the gap, not around. First contact is the QB.',
    common_mistake: 'Tipping the blitz by leaning toward the gap before the snap — gives the center time to slide protection and pick up the blitz',
    fixes: ['blitz', 'SS blitz', 'box blitz', 'pass rush', 'pressure', 'sack', 'disguise', 'gap', 'timing', 'safety blitz'],
    progressions: ['Walk-through blitz path identification', 'Half-speed blitz vs stationary QB', 'Full-speed blitz vs live QB with protection'],
    videos: [
      { title: 'Strong Safety Box Blitz Path Drill Football Pass Rush', url: 'https://www.youtube.com/results?search_query=strong+safety+box+blitz+path+drill+football+pass+rush', duration: '~7 min' },
    ],
  },

  // ── TE / RB COVERAGE ─────────────────────────────────────────────────────

  {
    name: 'TE Coverage — Physical Man Technique',
    category: 'technique',
    technique_area: 'te_coverage',
    sets: 3, reps: 8, duration: null,
    why: 'The SS is often matched man-to-man against TEs and RBs in two-back sets. TEs are physically larger than most DBs are used to — the SS must jam the release with physicality and stay hip-to-hip through the route stem.',
    coaching_cue: 'Outside hand jam on the release — redirect them inside toward LB help. Stay hip-to-hip through the stem.',
    common_mistake: 'Giving the TE a free vertical release off the line — by 10 yards the TE is open against man coverage with no recovery angle',
    fixes: ['TE coverage', 'tight end', 'man coverage', 'coverage', 'release', 'jam', 'vertical', 'seam route', 'RB coverage', 'back', 'man'],
    progressions: ['Walk-through jam alignment vs TE', 'Half-speed TE coverage vs air routes', 'Full-speed man coverage vs live TE with QB'],
    videos: [
      { title: 'Strong Safety TE Coverage Man Technique Football', url: 'https://www.youtube.com/results?search_query=strong+safety+tight+end+coverage+man+technique+football', duration: '~7 min' },
    ],
  },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function findSSDrillsForPainPoint(painPoint: string): SSDrillEntry[] {
  const lower = painPoint.toLowerCase()
  return SS_DRILLS.filter(d =>
    d.fixes.some(fix => lower.includes(fix) || fix.includes(lower.split(' ')[0]))
  ).slice(0, 4)
}

export function ssDrillToExercise(drill: SSDrillEntry): Exercise {
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
