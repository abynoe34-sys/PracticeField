// ─── Domain Types ─────────────────────────────────────────────────────────────

export type ExperienceLevel = 'beginner' | 'intermediate' | 'elite'

export type FootballPosition =
  | 'QB' | 'RB' | 'FB' | 'WR' | 'TE'
  | 'OL' | 'C' | 'OG' | 'OT'
  | 'DE' | 'DT' | 'NT' | 'DL'
  | 'LB' | 'ILB' | 'OLB'
  | 'CB' | 'SS' | 'FS' | 'DB'
  | 'K' | 'P' | 'LS'
  | 'Athlete'

// ─── Database Row Types ───────────────────────────────────────────────────────

export interface Coach {
  id: string
  coach_id: string          // human-readable code, e.g. ABC123XYZ
  name: string | null
  email: string | null
  team_name: string | null
  sport: string
  created_at: string
}

export interface Player {
  id: string
  coach_id: string
  name: string
  position: FootballPosition | null
  experience_level: ExperienceLevel | null
  created_at: string
}

export interface Session {
  id: string
  player_id: string
  coach_id: string
  session_date: string      // ISO date string YYYY-MM-DD
  strengths: string[]
  improvements: string[]
  root_causes: Record<string, string>  // { area: "root_cause description" }
  notes: string | null
  created_at: string
}

export interface Exercise {
  name: string
  sets: number | null
  reps: number | null
  duration: string | null   // e.g. "30 seconds", "10 minutes"
  why: string
  category: 'warmup' | 'agility' | 'strength' | 'footwork' | 'speed' | 'technique' | 'cooldown'
}

export interface TrainingPlan {
  id: string
  player_id: string
  coach_id: string
  pain_points: string[]
  experience_level: ExperienceLevel
  commitment_weeks: number
  exercises: Exercise[]
  generated_by: 'ai' | 'coach'
  created_at: string
  expires_at: string | null
}

export interface ProgressMetric {
  id: string
  player_id: string
  coach_id: string
  metric_name: string       // "40-yard dash", "vertical jump", "route precision score"
  value: number
  measured_at: string       // ISO date string
  created_at: string
}

// ─── Extended / Join Types ────────────────────────────────────────────────────

export interface PlayerWithSessions extends Player {
  sessions: Session[]
  latest_session: Session | null
  session_count: number
}

export interface SessionWithPlayer extends Session {
  player: Player
}

// ─── API Request / Response Types ────────────────────────────────────────────

export interface CreateCoachRequest {
  name?: string
  email?: string
}

export interface CreateCoachResponse {
  coach: Coach
}

export interface CreatePlayerRequest {
  coach_id: string
  name: string
  position?: FootballPosition
  experience_level?: ExperienceLevel
}

export interface CreateSessionRequest {
  player_id: string
  coach_id: string
  session_date: string
  strengths: string[]
  improvements: string[]
  root_causes: Record<string, string>
  notes?: string
}

export interface GenerateTrainingPlanRequest {
  player_id: string
  coach_id: string
  pain_points: string[]
  experience_level: ExperienceLevel
  commitment_weeks: number
  use_ai?: boolean
}

export interface LogProgressRequest {
  player_id: string
  coach_id: string
  metric_name: string
  value: number
  measured_at: string
}

// ─── UI / Component Types ─────────────────────────────────────────────────────

export interface ProgressDataPoint {
  date: string
  value: number
  label: string
}

export interface PivotWarning {
  weeks_since_improvement: number
  last_improvement_date: string | null
  recommendation: string
}

export type ViewMode = 'single-player' | 'multi-player'
export type SessionFocus = 'single-session' | 'multi-session'

export interface CoachSettings {
  view_mode: ViewMode
  session_focus: SessionFocus
  dark_mode: boolean
}

export interface ApiError {
  error: string
  details?: string
}

// ─── Video Analysis Types ─────────────────────────────────────────────────────

export type AnalysisStatus = 'pending' | 'processing' | 'complete' | 'failed'
export type OverallGrade   = 'A' | 'B' | 'C' | 'D'
export type IssueSeverity  = 'critical' | 'high' | 'medium' | 'low'
export type DrillType      = 'technique' | 'agility' | 'speed' | 'strength' | 'route' | 'coverage' | 'blocking' | 'general'

export interface TechniqueIssue {
  issue: string            // e.g. "Rounded back on first step"
  root_cause: string       // e.g. "Weak posterior chain causing forward lean compensation"
  severity: IssueSeverity
  timestamp_hint: string   // e.g. "~0:02–0:04 of clip"
  coaching_cue: string     // e.g. "Drive knee up, push hips through"
  drill_fix: string        // recommended drill to correct this
}

export interface TechniqueStrength {
  strength: string         // e.g. "Clean hip extension at top speed"
  evidence: string         // e.g. "Consistent through all reps in clip"
}

export interface TechniqueScores {
  stance:        number    // 1–10
  first_step:    number
  acceleration:  number
  mechanics:     number
  consistency:   number
  [key: string]: number    // position-specific scores added dynamically
}

export interface VideoComparison {
  trend: 'improving' | 'declining' | 'plateau' | 'baseline'
  improvement_areas: string[]
  decline_areas: string[]
  notes: string
}

export interface PlanModification {
  action: string           // e.g. "Add hip flexor mobility work before every session"
  priority: 'urgent' | 'recommended' | 'optional'
  reason: string           // why this modification is needed based on video evidence
}

export interface VideoAnalysis {
  overall_grade:           OverallGrade
  summary:                 string        // 2–3 sentence overall assessment
  technique_scores:        TechniqueScores
  issues:                  TechniqueIssue[]
  strengths:               TechniqueStrength[]
  comparison:              VideoComparison
  recommended_modifications: PlanModification[]
  frames_analyzed:         number
  position_context:        string        // position-specific coaching notes
}

export interface SessionVideo {
  id:               string
  session_id:       string | null
  player_id:        string
  coach_id:         string
  storage_path:     string
  public_url:       string | null
  file_name:        string | null
  file_size_bytes:  number | null
  duration_seconds: number | null
  thumbnail_path:   string | null
  analysis_status:  AnalysisStatus
  analysis:         VideoAnalysis | null
  frame_paths:      string[]
  label:            string | null
  drill_type:       DrillType | null
  notes:            string | null
  is_baseline:      boolean
  recorded_at:      string | null  // user-set date the footage was shot (YYYY-MM-DD)
  created_at:       string
}

export interface UploadVideoRequest {
  player_id:   string
  coach_id:    string
  session_id?: string
  label?:      string
  drill_type?: DrillType
  notes?:      string
  is_baseline?: boolean
}
