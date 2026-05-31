import OpenAI from 'openai'
import type { Exercise, ExperienceLevel, VideoAnalysis, VideoComparison } from '@/types'
import { getTemplateExercises, normalizePosition } from './training-templates'
import { findRBDrillsForPainPoint } from './position-drills/rb'
import { findWRDrillsForPainPoint } from './position-drills/wr'
import { findQBDrillsForPainPoint } from './position-drills/qb'
import { findOLDrillsForPainPoint } from './position-drills/ol'
import { findTEDrillsForPainPoint } from './position-drills/te'
import { findDLDrillsForPainPoint } from './position-drills/dl'
import { findLBDrillsForPainPoint } from './position-drills/lb'
import { findDBDrillsForPainPoint } from './position-drills/db'
import { findOLBDrillsForPainPoint } from './position-drills/olb'
import { findSTDrillsForPainPoint } from './position-drills/specialist'
import { findFBDrillsForPainPoint } from './position-drills/fb'
import { findNBDrillsForPainPoint } from './position-drills/nb'

let _client: OpenAI | null = null

function getClient(): OpenAI {
  if (!_client) {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY is not set')
    }
    _client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  }
  return _client
}

// ─── Training Plan Generation ─────────────────────────────────────────────────

export interface GeneratePlanParams {
  playerName: string
  position: string | null
  experienceLevel: ExperienceLevel
  painPoints: string[]
  strengths: string[]
  commitmentWeeks: number
  videoIssues?: string[]   // issues surfaced from video analysis
}

export async function generateTrainingPlanAI(params: GeneratePlanParams): Promise<Exercise[]> {
  const client = getClient()

  const videoContext = params.videoIssues?.length
    ? `\nVideo Analysis Evidence:\nThese issues were directly observed in practice video footage:\n${params.videoIssues.map(i => `- ${i}`).join('\n')}\nPrioritize exercises that address these video-confirmed issues.`
    : ''

  // For position-specific players, pull relevant drills from the curated library
  // so the AI references real, coach-validated drill names and cues.
  // normalizePosition maps specific variants (OT/OG/C → OL, DE/DT/NT → DL,
  // ILB → LB, CB/SS/FS → DB, FB → RB) so no position falls through to generic.
  let positionDrillContext = ''
  const posNorm = normalizePosition(params.position)
  // OLB/ILB → LB; K/P/LS → ST; FB has its own blocker-first library; QB and TE individual
  const DRILL_LIBRARY_POSITIONS = ['RB','WR','QB','OL','TE','DL','LB','DB','ST','FB','NB']
  if (params.painPoints.length > 0 && posNorm && DRILL_LIBRARY_POSITIONS.includes(posNorm)) {
    const finder = posNorm === 'WR' ? findWRDrillsForPainPoint
      : posNorm === 'QB' ? findQBDrillsForPainPoint
      : posNorm === 'OL' ? findOLDrillsForPainPoint
      : posNorm === 'TE' ? findTEDrillsForPainPoint
      : posNorm === 'DL' ? findDLDrillsForPainPoint
      : posNorm === 'LB' ? findLBDrillsForPainPoint
      : posNorm === 'DB' ? findDBDrillsForPainPoint
      : posNorm === 'ST' ? findSTDrillsForPainPoint
      : posNorm === 'FB' ? findFBDrillsForPainPoint
      : posNorm === 'NB' ? findNBDrillsForPainPoint
      : findRBDrillsForPainPoint  // RB fallback
    const seen = new Set<string>()
    const drillLines: string[] = []
    for (const pp of params.painPoints) {
      for (const drill of finder(pp)) {
        if (!seen.has(drill.name)) {
          seen.add(drill.name)
          drillLines.push(
            `  • ${drill.name} — "${drill.coaching_cue}" (fixes: ${drill.fixes.slice(0, 3).join(', ')})`
          )
        }
      }
    }
    // Use the original position label in the context so the AI knows e.g. "OT" not "OL"
    const posLabel = params.position?.toUpperCase() ?? posNorm
    if (drillLines.length > 0) {
      positionDrillContext = `\nCurated ${posLabel} (${posNorm} library) Drill Reference (prefer these drills when relevant):\n${drillLines.join('\n')}\n`
    }
  }

  const prompt = `You are an expert American football strength & conditioning coach with 20+ years of experience training players from youth through NFL.

Player Profile:
- Name: ${params.playerName}
- Position: ${params.position ?? 'Not specified'}
- Experience Level: ${params.experienceLevel}
- Commitment: ${params.commitmentWeeks} weeks

Strengths to MAINTAIN (do not break what works):
${params.strengths.length > 0 ? params.strengths.map(s => `- ${s}`).join('\n') : '- None specified yet'}

Areas That Need Improvement (pain points):
${params.painPoints.map(p => `- ${p}`).join('\n')}
${videoContext}
${positionDrillContext}
Generate a structured training plan with 8-12 exercises that directly address the pain points while preserving strengths.

For each exercise, provide:
- name: exercise name (use real drill names that coaches and players will recognise — be position-specific)
- sets: number of sets (or null if not applicable)
- reps: number of reps (or null if time-based)
- duration: time-based duration (or null if set/rep based), e.g. "30 seconds"
- why: 1-2 sentence explanation of WHY this helps the specific pain point
- category: one of: warmup, agility, strength, footwork, speed, technique, cooldown
- coaching_cue: the exact verbal cue a coach shouts on the sideline to fix the key fault, e.g. "Eyes through the ball — catch, THEN look for yards"
- demo_url: a real YouTube URL for the best publicly available demonstration of this exact drill. Use a real video you know exists (e.g. https://www.youtube.com/watch?v=VIDEOID). If unsure, use a YouTube search URL like https://www.youtube.com/results?search_query=<drill+name>+football+drill

Respond ONLY with a valid JSON array of exercise objects. No markdown, no explanation outside the JSON.`

  const response = await client.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.7,
    max_tokens: 2000,
  })

  const content = response.choices[0]?.message?.content ?? '[]'

  try {
    const cleaned = content.replace(/```json\n?|\n?```/g, '').trim()
    const exercises: Exercise[] = JSON.parse(cleaned)
    return exercises
  } catch {
    console.error('Failed to parse OpenAI response, falling back to templates')
    return getTemplateExercises(params.experienceLevel, params.painPoints, params.position)
  }
}

// Template-only fallback (no API call)
export function generateTrainingPlanTemplate(params: GeneratePlanParams): Exercise[] {
  return getTemplateExercises(params.experienceLevel, params.painPoints, params.position)
}

// ─── Video Analysis ───────────────────────────────────────────────────────────

export interface AnalyzeVideoParams {
  frames: string[]           // base64-encoded JPEG frames (6–10 recommended)
  playerName: string
  position: string | null
  experienceLevel: ExperienceLevel
  drillType: string
  label: string
  baselineAnalysis?: VideoAnalysis | null   // previous analysis to compare against
}

const GRADE_RUBRIC = `
Grading rubric:
A = Technically sound, minor refinements only, college/pro level execution
B = Good fundamentals with 1-2 correctable flaws, improving trajectory
C = Visible technique breakdowns affecting performance, needs focused work
D = Fundamental errors present, safety or effectiveness concerns`

const POSITION_CUES: Record<string, string> = {
  QB:  'Evaluate: drop-back footwork (is the QB hitting the correct landmark depth — 3-step at 3-4 yds, 5-step at 5-7 yds, 7-step at 9-11 yds — or drifting past it?), platform on the throw (set base, or off the back foot?), hip rotation (hips-first sequence into the throw, or arm-only?), release point (at the apex or past it?), elbow position (up through the throw or dropping to side-arm?), pocket presence (sliding and stepping up to reset platform, or bailing backward/sideways at first pressure?), pre-snap eyes (scanning coverage before the snap or staring at one receiver?), post-snap progression speed (working 1-2-3 or locking onto the first read?), accuracy and ball placement by coverage type.',
  WR:  'Evaluate: release off the line of scrimmage (vs press: swim/rip/push-pull — is the release effective or does the CB maintain contact?), route stem (does the WR attack the CB\'s leverage or run a flat predictable stem?), break sharpness (hips before shoulders on out/comeback; no rounding on slants), catch technique (hands-first vs. body catch, thumbs-in above waist / pinkies-together below, eyes on tip of ball through catch), concentration under contact (does the WR secure the ball before looking for yards or does anticipation of contact cause early eye movement?), separation at the top of route, after-catch run ability. Also evaluate stalk block effort and technique on run plays.',
  RB:  'Evaluate: stance (2pt weight on balls of feet / 3pt fingertips only), first-step burst direction and explosion timing off snap, pad level through the hole (stay low at contact), ball security (4-point carry: fingertips wrap over tip, forearm under ball, bicep squeeze, tuck into chest), pass protection stance (wide base, hands ready, punch timing), route running from backfield (sell run fake first, release clean), cut sharpness (outside foot plant, rip or spin, re-accelerate). Reference drills: Two-Point Stance, Three-Point Stance, Ball Security Gauntlet, Cone Cut Drill, Shuffle Cut, Third Leg Drill, Hand & Finger Placement, Route Running Out of Backfield.',
  FB:  'NOTE: The fullback is primarily a BLOCKER, not a runner. Evaluate blocking first, ball-carrying second. Evaluate: lead block mechanics (does the FB leave their stance low and arrive at full speed, or do they slow down before contact?), hand placement on contact (thumbs up, inside the frame — or outside/grabbing?), pad level through the block (pad under pad or getting stood up?), hip drive and sustain (feet keep moving through the whistle?), kick-out block angle (attacking inside number to seal, or running past the defender?), pass protection punch and anchor (wide base, hands ready, redirecting the rusher — or lunging and getting swim-moved?), short-yardage carry mechanics (low pad level, high knee drive, falling forward through contact), ball security (4-point carry when used as ball carrier). Evaluate blocking effort and technique on EVERY rep, not just designed carries.',
  OL:  'NOTE: OT, OG, and C have different responsibilities — evaluate accordingly. OT (Tackle): focus on pass protection kick-slide (flat kick, no false step), anchor vs bull rush (hip sink, wide base), edge containment vs speed rush (not over-setting), and run-block reach/drive technique. OG (Guard): focus on interior run blocking (leverage, hip drive, sustain), pulling mechanics (flat pull path, finding the hole, blocking at speed downfield), and double-team timing with C or OT. C (Center): focus on snap-and-block transition (clean snap delivery, immediate protection), pre-snap identification stance (does the C signal protection before the snap?), and communication of blocking schemes (do the guards react correctly to C\'s calls?). ALL OL: stance type (2-pt vs 3-pt — weight on fingertips?), first-step flatness (no false step or upright rise), hand placement on contact (thumbs-up inside the frame), hip drive and uncoil sequence (ground-up, not arms-first), feet sustaining through the whistle.',
  TE:  'Evaluate: stance alignment (in-line vs off-ball — is the stance appropriate for assignment?), release vs press (swim, rip, push-pull — does the TE get clean separation?), route stem and break sharpness (does the TE threaten the safety on vertical routes? does the TE hit proper crossing depth?), catch technique (hands first away from body, eyes on tip through catch, concentration under contact), blocking hand placement and sustain when in-line (same standard as OL), chip-and-release timing on pass protection assignments.',
  DL:  'NOTE: DE, DT, and NT have distinct roles — evaluate accordingly. DE (Defensive End): focus on get-off timing and flatness of the first step (not rising), pass rush from the edge (speed-to-power conversion, bend the corner, not looping wide), edge containment on run plays (attack inside number to spill — not getting reached), swim/rip move execution, and bull-rush anchor. DT (Defensive Tackle): focus on interior pass rush penetration (push the pocket up the middle), inside hand fighting at contact (who wins the inside position?), bull-rush vs double-team anchor (sit the hips and hold ground), and slant/stunt timing with the DE. NT (Nose Tackle, 3-4 scheme): focus on two-gap technique (reading and reacting, not attacking), occupying multiple blockers without penetrating (gap control over pursuit), anchor strength vs double teams, and A-gap responsibility. ALL DL: pre-snap stance (hand position in shade — ball hand or man hand?), first-step flatness (rising or staying low?), pad level through the block (staying low or getting stood up?), block recognition (base vs double team vs reach — does the DL read correctly?), shedding blockers cleanly before pursuing the ball, and pursuit angle after the shed.',
  LB:  'Evaluate: pre-snap alignment and reads (correct gap assignment?), trigger quickness on run (does the LB fire on the right key or hesitate?), block defeat technique (shock and shed — or absorbed?), back-hip pursuit angle (inside leverage maintained?), pass drop footwork (45-degree angle or flat/straight back?), hip flip timing in zone-to-man transitions, zone assignment execution (correct window depth?), open-field tackling (hawk progression — buzz feet, hit position, wrap and drive?).',
  MLB: 'NOTE: The MLB is the defensive field general — evaluate communication and reads as equally important as physical skills. Evaluate: pre-snap reads and communication (does the MLB correctly identify the run/pass formation, adjust the front, and make the coverage call before the snap?), run-fill trigger (does the MLB attack the correct gap on the right key — or hesitate and get blocked at the LOS?), block shedding at the second level (does the MLB shock the blocker to separate before tackling — or getting absorbed and dragged?), A-gap and B-gap discipline (staying in assigned gap or over-pursuing and creating cutback lanes?), hook-curl zone ownership in pass coverage (correct depth 8-12 yards, eyes on QB not receivers, breaks on throw not on route?), blitz execution (A-gap or B-gap path, disguised stance until snap, flat gap path — or telegraphing early and looping wide?), open-field tackling on RBs catching screens and checkdowns (break down, press inside hip, wrap — or lunging and missing?), communication with DL and secondary (does the MLB direct the entire defense or stay quiet?).',
  OLB: 'Evaluate: pre-snap stance and shade vs TE (inside/head-up/outside — does it match assignment? does it tip the call?), get-off timing on snap (keying ball movement vs QB cadence), edge setting vs run to OLB side (attack inside number to spill — or getting reached?), wrong-arm technique on down block + pull (dipping under the down block to spill the puller, or fighting over the top?), pass rush arc (attacking upfield before bending the corner — or flattening too early and getting redirected?), counter move availability (swim/rip after setting up speed rush, or one-move rusher?), flat zone coverage (owning the flat on Cover 2 — not chasing seam or dropping too deep), hook-curl drop (45-degree angle to correct depth, or running straight back?), man coverage on TE (jamming the release with outside hand — or giving a free vertical release?), cutback lane on run-away plays (square shuffle to maintain gap — or over-pursuing and vacating the cutback lane?), blitz discipline (disguised stance until snap, skinny through gap — or telegraphing the blitz?).',
  CB:  'Evaluate: press alignment (inside/head-up/outside shade based on WR split?), backpedal mechanics (chin over toes, feet cutting the grass, butt leading?), cushion management (opening hips too early or too late?), hip flip / man turn timing (low elbow plane, lead toe at 180°?), bump and run jam effectiveness (punch the breastplate — not the arms), phase awareness (in-phase: look for ball; out-of-phase: play receiver\'s head and hands), zone funnel technique (jab-style jam, funnel inside), bail mechanics (1 yard outside receiver, key through to QB), stalk block defeat (fit, lockout, shed sequence), crack recognition and crack call. Reference drills: W Drill, Hip Turns, Bump & Run Mirror/Snake, Cushion/Turn, Phase Drill, Stalk Block Defeat, Crack Block Recognition.',
  DB:  'NOTE: FS and SS have distinct responsibilities — evaluate accordingly. FS (Free Safety): focus on deep zone coverage (center field, 12-15 yard pre-snap depth, maintaining cushion over the top), range to cover the full width of the field on downfield throws, run/pass read discipline from depth (does the FS hold on play-action or commit too early?), break timing on downhill routes (T-step or foot-fire — not over-running shallow throws or arriving late on deep balls), communication of coverage assignments to the secondary. SS (Strong Safety): focus on run support near the LOS (does the SS fit the correct gap in run support — or over-pursuing?), physical presence in the alley (press inside hip to flatten the ball carrier), coverage on TEs and slot WRs (can the SS match up in man on bigger receivers?), blitz execution from the box (disguise, flat path, arrives at the right time), and pre-snap communication on TE coverage. ALL DBs: pre-snap alignment and leverage (correct depth and shade for coverage call?), backpedal mechanics (chin over toes, feet cutting the grass, butt leading?), cushion management (opening hips too early or too late?), hip flip / man turn (low elbow plane — 90° or less), phase awareness (in-phase hip to hip: look for ball; out-of-phase trailing: play head and hands, smack far wrist), zone drop footwork (landmark depth, T-step or foot-fire on downhill breaks), run/pass read discipline (does the DB bite on play-action?), open-field tackling (shorten stride and sink hips on approach, press inside hip to flatten carrier\'s move), ball skills (tracking, highest-point catch, strip technique before tackle). Reference drills: W Drill, Hip Turns, Pedal and Turn, Phase Drill, Drop and Read, Bail Technique, Tip Drill, Stalk Block Defeat, Open Field Tackle.',
  NB:  'NOTE: The Nickelback (NB) is the 5th defensive back deployed in nickel packages (3+ WR sets). The NB is a hybrid CB/LB — evaluate both coverage skills and run-support/tackling skills. Evaluate: slot alignment and shade (inside shade to take away the quick slant — not head-up allowing a free inside release), man coverage trail technique on slot WR (hip-to-hip inside shade — does the NB stay in contact through the route or give a free release?), hip flip in space (does the NB flip the hips sharply in tight quarters without an extra gather step?), mirror drill reactive agility (reading the slot WR\'s hips not the feet — gets juked or stays in phase?), press jam from inside shade (punch the outside shoulder to redirect the slot WR outside — or jamming straight and opening the slant window?), pick/rub/mesh route recognition (does the NB call "rub!" and switch immediately — or chase the assigned WR into the pick?), hook-curl and flat zone drops in nickel packages (correct 45-degree angle, correct landmark depth — or dropping straight back?), open-field tackling on slot WR after the catch (shorten stride, press inside hip — or lunging and missing?), blitz path execution (disguised stance until snap, flat gap path, speed-to-power — or telegraphing and looping wide?), W Drill lateral quickness (pedal with purpose, low elbow on the break — or upright backpedal on heels?).',
  S:   'Evaluate: pre-snap alignment (correct depth for 1/4s, 1/2 field, or robber?), bounce technique (don\'t be cemented — stay on balls of feet), run/pass key reads (through uncovered linemen to backfield), high-tempo backpedal in 1/2 field (maintain cushion without flattening out), break timing (T-step or foot-fire on downhill breaks — not overrunning shallow throws), seam delivery (same-leg same-arm power base — cannot allow outside release by #2), alley support on run (Freddie/Rover support vs. counterpoint), interception at highest point, communication on crack blocks.',
  default: 'Evaluate overall athletic movement quality, technique consistency, and position-specific fundamentals.',
}

export async function analyzeVideoFrames(params: AnalyzeVideoParams): Promise<VideoAnalysis> {
  const client = getClient()

  const positionCue = POSITION_CUES[params.position ?? 'default'] ?? POSITION_CUES.default

  const comparisonInstruction = params.baselineAnalysis
    ? `\nCOMPARISON: Compare this footage against a previous baseline analysis. Previous grade: ${params.baselineAnalysis.overall_grade}. Previous issues: ${params.baselineAnalysis.issues.map(i => i.issue).join(', ')}. Identify what has improved, what has declined, and what remains the same.`
    : '\nThis is the BASELINE video. Mark comparison.trend as "baseline".'

  const systemPrompt = `You are an elite American football technique analyst and strength & conditioning specialist with NFL-level expertise. You analyze video frames to identify biomechanical issues, technique flaws, and athletic development opportunities.

Your analysis must be:
- SPECIFIC: Name exact body parts, joint angles, timing errors
- EVIDENCE-BASED: Reference what you actually see in the frames
- ACTIONABLE: Every issue must have a coaching cue and drill fix
- HONEST: Grade strictly — a "B" means genuinely good technique, not just acceptable
${GRADE_RUBRIC}

${positionCue}

IMPORTANT: You must ALWAYS respond with a valid JSON object. If video quality is poor or frames are unclear, still return the JSON structure with overall_grade "D", describe the quality issue in the summary, and include one issue with severity "low" explaining what would need to be visible for a proper analysis.`

  const userContent: OpenAI.Chat.ChatCompletionContentPart[] = [
    {
      type: 'text',
      text: `Analyze these ${params.frames.length} video frames from a ${params.drillType} drill.

Player: ${params.playerName}
Position: ${params.position ?? 'Unknown'}
Experience Level: ${params.experienceLevel}
Drill/Label: ${params.label}
${comparisonInstruction}

Respond ONLY with a single valid JSON object matching this exact structure (no markdown):
{
  "overall_grade": "A"|"B"|"C"|"D",
  "summary": "2-3 sentence assessment",
  "technique_scores": {
    "stance": 1-10,
    "first_step": 1-10,
    "acceleration": 1-10,
    "mechanics": 1-10,
    "consistency": 1-10
  },
  "issues": [
    {
      "issue": "specific technique flaw observed",
      "root_cause": "biomechanical or strength reason this flaw exists",
      "severity": "critical"|"high"|"medium"|"low",
      "timestamp_hint": "approximate frame/moment in clip",
      "coaching_cue": "short verbal cue coach gives on sideline",
      "drill_fix": "specific drill to correct this issue"
    }
  ],
  "strengths": [
    {
      "strength": "specific positive observed",
      "evidence": "what in the frames shows this"
    }
  ],
  "comparison": {
    "trend": "improving"|"declining"|"plateau"|"baseline",
    "improvement_areas": ["..."],
    "decline_areas": ["..."],
    "notes": "overall trajectory assessment"
  },
  "recommended_modifications": [
    {
      "action": "specific change to training plan",
      "priority": "urgent"|"recommended"|"optional",
      "reason": "why this modification is needed based on video evidence"
    }
  ],
  "frames_analyzed": ${params.frames.length},
  "position_context": "position-specific coaching observation"
}`,
    },
    // Attach all frames as vision images
    ...params.frames.map((b64, i): OpenAI.Chat.ChatCompletionContentPart => ({
      type: 'image_url',
      image_url: {
        url: `data:image/jpeg;base64,${b64}`,
        detail: i === 0 || i === params.frames.length - 1 ? 'high' : 'low',
      },
    })),
  ]

  const response = await client.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user',   content: userContent },
    ],
    temperature: 0.3,
    max_tokens: 4096,
    response_format: { type: 'json_object' }, // forces pure JSON — no prose, no markdown
  })

  const raw = response.choices[0]?.message?.content ?? ''
  const finishReason = response.choices[0]?.finish_reason
  console.log('OpenAI finish_reason:', finishReason, '| raw length:', raw.length)

  if (!raw) {
    console.error('OpenAI returned empty content')
    return buildFallbackAnalysis(params)
  }

  // Strip markdown fences if present
  let cleaned = raw.replace(/```json\n?|\n?```/g, '').trim()

  // Always extract outermost { } block — handles leading prose, trailing notes,
  // or any extra text GPT-4o adds before or after the JSON object
  const jsonStart = cleaned.indexOf('{')
  const jsonEnd   = cleaned.lastIndexOf('}')
  if (jsonStart !== -1 && jsonEnd > jsonStart) {
    cleaned = cleaned.slice(jsonStart, jsonEnd + 1)
  }

  try {
    return JSON.parse(cleaned) as VideoAnalysis
  } catch {
    // Return a safe fallback if parsing fails
    console.error('Failed to parse video analysis JSON. finish_reason:', finishReason, '| first 400 chars:', cleaned.slice(0, 400))
    return buildFallbackAnalysis(params)
  }
}

function buildFallbackAnalysis(params: AnalyzeVideoParams): VideoAnalysis {
  return {
    overall_grade: 'C',
    summary: `Analysis of ${params.label} for ${params.playerName}. AI analysis encountered an issue — please review frames manually and re-analyze.`,
    technique_scores: { stance: 5, first_step: 5, acceleration: 5, mechanics: 5, consistency: 5 },
    issues: [{
      issue: 'Unable to complete automated analysis',
      root_cause: 'AI parsing error — video may need better lighting or closer framing',
      severity: 'low',
      timestamp_hint: 'Full clip',
      coaching_cue: 'Review footage manually',
      drill_fix: 'Re-upload with clearer angle',
    }],
    strengths: [],
    comparison: {
      trend: params.baselineAnalysis ? 'plateau' : 'baseline',
      improvement_areas: [],
      decline_areas: [],
      notes: 'Manual review required',
    },
    recommended_modifications: [],
    frames_analyzed: params.frames.length,
    position_context: `${params.position ?? 'Unknown'} position analysis pending manual review.`,
  }
}
