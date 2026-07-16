"""
feedback.py — GPT-4o-mini text feedback writer for two-clip OL stance.

Takes the raw MediaPipe measurements already computed by
measurements.aggregate_side_measurements() and turns them into a coaching
feedback JSON object. Text-only — no frames or images are sent, only the
numeric measurements and the calibration context (fault_type, line_side,
position). Model is instructed not to claim visual detail it can't derive
from those numbers.

Position-agnostic by structure (build_prompt/generate_feedback take a
`position` string and look up cues from POSITION_CUES), but only the OL
3-point stance fault taxonomy exists today — see CLAUDE.md "What's Still
Outstanding" for the blocking gap on other positions.
"""

import os
import json
import logging

from openai import OpenAI

log = logging.getLogger(__name__)

_client: OpenAI | None = None


def _get_client() -> OpenAI:
    global _client
    if _client is None:
        api_key = os.environ.get("OPENAI_API_KEY", "")
        if not api_key:
            raise RuntimeError("OPENAI_API_KEY must be set")
        _client = OpenAI(api_key=api_key)
    return _client


FAULT_TYPE_CUES = {
    "none":          "No specific fault was targeted for this clip — evaluate the stance generally against sound 3-point stance fundamentals.",
    "narrow_stance": "This clip targets NARROW STANCE — feet positioned too close together, reducing base width and stability.",
    "stagger":       "This clip targets STAGGER — uneven front-to-back foot positioning between the two feet.",
    "head_down":     "This clip targets HEAD DOWN — chin tucked or head dropped below neutral, losing forward vision at the snap.",
    "forward_lean":  "This clip targets FORWARD LEAN — excessive forward torso lean past the intended launch angle, weight over-committed forward.",
    "sitting_back":  "This clip targets SITTING BACK — weight shifted onto the heels, hips dropped back rather than loaded forward.",
}

POSITION_CUES = {
    "guard_tackle": "Player is a Guard or Tackle. In a proper 3-point stance, hips should sit slightly higher than shoulders (positive slope_deg), weight loaded onto the down hand, ready to fire out low and long.",
    "center":       "Player is a Center. Stance must also accommodate a clean, one-handed snap — the down-hand/snap-hand relationship limits how far forward weight can load compared to a Guard/Tackle stance, but hips should still sit at or slightly above shoulder height.",
}

GRADE_RUBRIC = """
Grading rubric:
A = Technically sound stance, minor refinements only, college/pro level execution
B = Good fundamentals with 1-2 correctable flaws, improving trajectory
C = Visible technique breakdowns affecting performance, needs focused work
D = Fundamental errors present, safety or effectiveness concerns"""


def _measurements_summary(m: dict) -> str:
    lines = [
        f"- slope_deg_mean: {m.get('slope_deg_mean')} (positive = hips higher than shoulders, correct loaded 3-point stance; near zero or negative = hips level with or below shoulders)",
        f"- slope_deg_min: {m.get('slope_deg_min')}",
        f"- slope_deg_max: {m.get('slope_deg_max')}",
        f"- lean_from_vertical_mean: {m.get('lean_from_vertical_mean')} degrees (torso lean off vertical, direction-independent)",
        f"- higher_majority: {m.get('higher_majority')} (which of hips/shoulders sat higher across the majority of frames)",
        f"- frame_count: {m.get('frame_count')}, detected_frame_count: {m.get('detected_frame_count')}",
        f"- detection_rate: {m.get('detection_rate')}",
        f"- reliable: {m.get('reliable')} (False means detection_rate was below 50% — treat findings as low-confidence and say so in the summary)",
    ]
    return "\n".join(lines)


def build_prompt(measurements: dict, fault_type: str, line_side: str, position: str) -> str:
    fault_cue    = FAULT_TYPE_CUES.get(fault_type, FAULT_TYPE_CUES["none"])
    position_cue = POSITION_CUES.get(position, POSITION_CUES["guard_tackle"])

    return f"""You are an expert offensive line coach evaluating a 3-point stance from MediaPipe pose measurements. You do NOT have the video — only the numeric measurements below. Do not invent visual details you cannot know from these numbers (no comments on hand placement, eye level, or anything not derivable from the slope/lean angles).

{position_cue}
Line side filmed: {line_side}
{fault_cue}
{GRADE_RUBRIC}

Measurements (aggregated across the clip):
{_measurements_summary(measurements)}

Respond ONLY with a single valid JSON object matching this exact structure (no markdown):
{{
  "overall_grade": "A"|"B"|"C"|"D",
  "summary": "2-3 sentence assessment grounded only in the measurements above",
  "issues": [
    {{
      "issue": "specific technique flaw implied by the measurements",
      "root_cause": "biomechanical reason this flaw shows up in the numbers",
      "severity": "critical"|"high"|"medium"|"low",
      "coaching_cue": "short verbal cue a coach gives on the sideline",
      "drill_fix": "specific drill to correct this issue"
    }}
  ],
  "strengths": [
    {{
      "strength": "specific positive implied by the measurements",
      "evidence": "which measurement supports this"
    }}
  ],
  "position_context": "one sentence connecting the grade to the {position} stance requirements"
}}

If reliable is false, still return the structure above but grade conservatively, keep issues to at most one low-severity entry noting detection was unreliable, and say so explicitly in the summary."""


def _no_detection_fallback() -> dict:
    return {
        "overall_grade": "D",
        "summary": "No usable pose detections in this clip — slope and lean angles could not be computed. Re-film with the player clearly visible from the side.",
        "issues": [{
            "issue": "No pose detected",
            "root_cause": "Player not visible/detected across the clip (occlusion, framing, or lighting)",
            "severity": "high",
            "coaching_cue": "Re-shoot with full body in frame, side-on, unobstructed",
            "drill_fix": "Re-film clip",
        }],
        "strengths": [],
        "position_context": "Unable to evaluate — no measurements available.",
    }


def generate_feedback(measurements: dict, fault_type: str, line_side: str, position: str) -> dict:
    """
    Calls gpt-4o-mini with a text-only prompt built from raw MediaPipe
    measurements and returns the parsed feedback JSON object.

    Raises RuntimeError if OpenAI returns content that isn't valid JSON.
    Skips the API call entirely (returns a fixed fallback) if the clip had
    zero usable detections — no measurements exist for the model to reason
    about, so a call would just be an invitation to hallucinate.
    """
    if measurements.get("slope_deg_mean") is None and measurements.get("lean_from_vertical_mean") is None:
        log.warning("no slope/lean measurements available — skipping OpenAI call, returning fallback")
        return _no_detection_fallback()

    prompt = build_prompt(measurements, fault_type, line_side, position)
    client = _get_client()

    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[{"role": "user", "content": prompt}],
        temperature=0.3,
        max_tokens=1024,
        response_format={"type": "json_object"},
    )

    raw = response.choices[0].message.content or ""
    log.info(
        "feedback generation finish_reason=%s raw_len=%d",
        response.choices[0].finish_reason,
        len(raw),
    )

    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        log.error("failed to parse feedback JSON, first 400 chars: %s", raw[:400])
        raise RuntimeError("OpenAI returned invalid JSON for feedback")
