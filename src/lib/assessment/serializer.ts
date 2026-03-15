import type { LearnerProfile } from '@/lib/schemas/assessment'

function interpretScore(score: number): string {
  if (score <= 0.2) return 'Starting fresh'
  if (score <= 0.4) return 'Building foundations'
  if (score <= 0.6) return 'Developing understanding'
  if (score <= 0.8) return 'Strong foundation'
  return 'Advanced understanding'
}

function interpretReasoningStyle(score: number): string {
  if (score <= 0.3) return 'Strongly procedural'
  if (score <= 0.7) return 'Balanced'
  return 'Strongly conceptual'
}

function fmt(score: number): string {
  return score.toFixed(1)
}

function deriveRecommendations(profile: LearnerProfile): string[] {
  const { dimensions } = profile
  const recs: string[] = []

  if (dimensions.priorKnowledge < 0.4) {
    recs.push('Start with foundational concepts and build incrementally')
  } else if (dimensions.priorKnowledge >= 0.6 && dimensions.abstractionComfort < 0.4) {
    recs.push('Build on existing knowledge with concrete, hands-on examples')
  }

  if (dimensions.patternRecognition >= 0.6) {
    recs.push('Leverage interleaved concept presentation across lessons')
  }

  if (dimensions.cognitiveStamina < 0.4) {
    recs.push('Use shorter lessons with frequent breathing-room screens')
  }

  if (dimensions.selfAwareness >= 0.6) {
    recs.push('Include meta-learning moments that reinforce growth awareness')
  } else if (dimensions.selfAwareness < 0.4) {
    recs.push('Include calibration exercises and explicit progress markers')
  }

  if (dimensions.reasoningStyle <= 0.3) {
    recs.push('Lead with doing — practical exercises before theory')
  } else if (dimensions.reasoningStyle >= 0.7) {
    recs.push('Connect concepts to broader frameworks and principles')
  }

  if (recs.length < 2) {
    if (!recs.includes('Start with foundational concepts and build incrementally')) {
      recs.push('Start with foundational concepts and build incrementally')
    }
    if (recs.length < 2) {
      recs.push('Include calibration exercises and explicit progress markers')
    }
  }

  return recs.slice(0, 4)
}

export function serializeProfile(profile: LearnerProfile): string {
  const { dimensions } = profile
  const recs = deriveRecommendations(profile)

  const lines: string[] = [
    '## Learner Assessment Profile',
    '',
    `**Topic**: ${profile.topic}`,
    `**Assessed**: ${profile.assessedAt}`,
    '',
    '### Dimension Scores',
    `- Prior Knowledge: ${fmt(dimensions.priorKnowledge)}/1.0 — ${interpretScore(dimensions.priorKnowledge)}`,
    `- Pattern Recognition: ${fmt(dimensions.patternRecognition)}/1.0 — ${interpretScore(dimensions.patternRecognition)}`,
    `- Abstraction Comfort: ${fmt(dimensions.abstractionComfort)}/1.0 — ${interpretScore(dimensions.abstractionComfort)}`,
    `- Reasoning Style: ${fmt(dimensions.reasoningStyle)}/1.0 — ${interpretReasoningStyle(dimensions.reasoningStyle)}`,
    `- Cognitive Stamina: ${fmt(dimensions.cognitiveStamina)}/1.0 — ${interpretScore(dimensions.cognitiveStamina)}`,
    `- Self-Awareness: ${fmt(dimensions.selfAwareness)}/1.0 — ${interpretScore(dimensions.selfAwareness)}`,
    '',
    '### Personalized Narrative',
    profile.narrative,
    '',
    '### Teaching Recommendations',
    ...recs.map((r) => `- ${r}`),
  ]

  return lines.join('\n')
}
