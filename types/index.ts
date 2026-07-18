// ─── Domain Types ─────────────────────────────────────────────────────────────

export type ExperienceLevel = 'beginner' | 'intermediate' | 'elite'

export type FootballPosition =
  | 'QB' | 'RB' | 'FB' | 'WR' | 'TE'
  | 'OL' | 'C' | 'OG' | 'OT'
  | 'DE' | 'DT' | 'NT' | 'DL'
  | 'MLB' | 'LB' | 'ILB' | 'OLB'
  | 'CB' | 'NB' | 'SS' | 'FS' | 'DB'
  | 'K' | 'P' | 'LS' | 'H' | 'PR' | 'KR'
  | 'Athlete'

// ─── Database Row Types ───────────────────────────────────────────────────────

export interface Coach {
  id: string
  coach_id: string          // human-readable code, e.g. ABC123XYZ
  name: string | null
  email: string | null
  team_name: string | null
  sport: string
  terms_version: string | null
  terms_accepted_at: string | null
  created_at: string
}

export interface Player {
  id: string
  coach_id: string
  name: string
  position: FootballPosition | null
  experience_level: ExperienceLevel | null
  date_of_birth: string | null          // ISO date YYYY-MM-DD
  is_minor: boolean | null              // auto-computed from date_of_birth
  consent_status: 'pending' | 'obtained' | 'refused' | 'withdrawn'
  parental_consent_status: 'not_required' | 'pending' | 'obtained' | 'refused' | 'withdrawn'
  training_opt_in: boolean
  created_at: string
}

export type ConsentType =
  | 'terms_of_service'
  | 'privacy_policy'
  | 'player_consent'
  | 'parental_consent'
  | 'training_opt_in'

export interface ConsentRecord {
  id: string
  coach_id: string
  player_id: string | null
  consent_type: ConsentType
  document_version: string
  accepted: boolean
  accepted_by_email: string | null
  ip_address: string | null
  user_agent: string | null
  created_at: string
}

export interface Session {
  id: string
  player_id: string | null
  coach_id: string | null
  player_account_id: string | null
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
  coaching_cue?: string | null   // sideline coaching tip, e.g. "Eyes through the ball on the catch"
  demo_url?: string | null       // YouTube demo link or search URL
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
  date_of_birth?: string              // ISO date YYYY-MM-DD
  player_consent: boolean             // player/guardian confirmed consent
  parental_email?: string             // required when player is a minor
  training_opt_in: boolean
}

export interface CreateSessionRequest {
  player_id?: string
  coach_id?: string
  player_account_id?: string
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

export type AnalysisStatus =
  | 'pending' | 'processing' | 'complete' | 'failed'          // legacy single-clip
  | 'awaiting_both' | 'awaiting_side' | 'awaiting_front' | 'ready'  // two-clip
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

// Output shape of the Python service's POST /feedback route (service/feedback.py).
// Distinct from VideoAnalysis: text-only (no frames_analyzed/technique_scores/
// comparison — nothing derived from images), so issues have no timestamp_hint.
export interface StanceFeedbackIssue {
  issue:         string
  root_cause:    string
  severity:      IssueSeverity   // same 'critical'|'high'|'medium'|'low' vocabulary as TechniqueIssue
  coaching_cue:  string
  drill_fix:     string
}

export interface StanceFeedback {
  summary:             string
  issues:              StanceFeedbackIssue[]
  strengths:           TechniqueStrength[]   // same {strength, evidence} shape feedback.py returns
  position_context:    string
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
  view_angle:       'side' | 'front' | null
  media_type:       'video' | 'photo'
  analysis_status:  AnalysisStatus
  analysis:         VideoAnalysis | null
  feedback:         StanceFeedback | null
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
