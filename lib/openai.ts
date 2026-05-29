import OpenAI from 'openai'
import type { Exercise, ExperienceLevel, VideoAnalysis, VideoComparison } from '@/types'
import { getTemplateExercises } from './training-templates'
import { findRBDrillsForPainPoint } from './position-drills/rb'

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

  // For RB players, pull relevant drills from the curated library and include them
  // in the prompt so the AI references real, coach-validated drill names.
  let positionDrillContext = ''
  if (params.position?.toUpperCase() === 'RB' && params.painPoints.length > 0) {
    const seen = new Set<string>()
    const rbDrillLines: string[] = []
    for (const pp of params.painPoints) {
      for (const drill of findRBDrillsForPainPoint(pp)) {
        if (!seen.has(drill.name)) {
          seen.add(drill.name)
          rbDrillLines.push(
            `  • ${drill.name} — "${drill.coaching_cue}" (fixes: ${drill.fixes.slice(0, 3).join(', ')})`
          )
        }
      }
    }
    if (rbDrillLines.length > 0) {
      positionDrillContext = `\nCurated RB Drill Library (prefer these drills when relevant):\n${rbDrillLines.join('\n')}\n`
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
- name: exercise name
- sets: number of sets (or null if not applicable)
- reps: number of reps (or null if time-based)
- duration: time-based duration (or null if set/rep based), e.g. "30 seconds"
- why: 1-2 sentence explanation of WHY this helps the specific pain point
- category: one of: warmup, agility, strength, footwork, speed, technique, cooldown

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
  QB:  'Evaluate: drop-back footwork, hip rotation through throw, platform consistency, eyes pre-snap vs post-snap, ball placement by coverage type.',
  WR:  'Evaluate: release off line, route stem depth, break sharpness, catch point (hands vs body), separation creation, after-catch run.',
  RB:  'Evaluate: stance (2pt weight on balls of feet / 3pt fingertips only), first-step burst direction and explosion timing off snap, pad level through the hole (stay low at contact), ball security (4-point carry: fingertips wrap over tip, forearm under ball, bicep squeeze, tuck into chest), pass protection stance (wide base, hands ready, punch timing), route running from backfield (sell run fake first, release clean), cut sharpness (outside foot plant, rip or spin, re-accelerate). Reference drills: Two-Point Stance, Three-Point Stance, Ball Security Gauntlet, Cone Cut Drill, Shuffle Cut, Third Leg Drill, Hand & Finger Placement, Route Running Out of Backfield.',
  TE:  'Evaluate: release vs press, route precision, hands (catching away from body), blocking hand placement and sustain.',
  OL:  'Evaluate: stance balance, first-step direction, hand placement (punch inside frame), pad level, hip drive, sustain through whistle.',
  DL:  'Evaluate: pre-snap alignment, get-off timing, hand usage, pass rush move setup and counter, pad level.',
  LB:  'Evaluate: pre-snap read, run-fit angles, trigger quickness, hip flip in coverage, zone drops, open-field tackling.',
  CB:  'Evaluate: press alignment, backpedal mechanics, hip flip timing, zone technique, man-coverage leverage, ball-tracking.',
  DB:  'Evaluate: alignment depth, backpedal, break on ball, angle of pursuit, zone assignment execution.',
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

${positionCue}`

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
    model: 'gpt-4o',             // vision requires gpt-4o, not mini
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user',   content: userContent },
    ],
    temperature: 0.3,            // lower temp for consistent structured output
    max_tokens: 2500,
  })

  const raw = response.choices[0]?.message?.content ?? '{}'
  const cleaned = raw.replace(/```json\n?|\n?```/g, '').trim()

  try {
    return JSON.parse(cleaned) as VideoAnalysis
  } catch {
    // Return a safe fallback if parsing fails
    console.error('Failed to parse video analysis JSON:', cleaned.slice(0, 200))
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
