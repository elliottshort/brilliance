import { describe, it, expect } from 'vitest'
import { LearnerProfileSchema } from '@/lib/schemas/assessment'
import type { LearnerProfile } from '@/lib/schemas/assessment'

function makeSampleProfile(overrides: Partial<LearnerProfile> = {}): LearnerProfile {
  return {
    dimensions: {
      priorKnowledge: 0.72,
      patternRecognition: 0.85,
      abstractionComfort: 0.6,
      reasoningStyle: 0.45,
      cognitiveStamina: 0.9,
      selfAwareness: 0.55,
    },
    topic: 'Python fundamentals',
    narrative: 'A curious beginner who learns best through examples.',
    assessedAt: '2025-03-15T10:30:00.000Z',
    ...overrides,
  }
}

describe('LearnerProfile JSON round-trip', () => {
  it('round-trips a full profile through JSON serialization', () => {
    const original = makeSampleProfile()
    const serialized = JSON.stringify(original)
    const deserialized = JSON.parse(serialized)

    expect(deserialized).toEqual(original)
    expect(LearnerProfileSchema.safeParse(deserialized).success).toBe(true)
  })

  it('preserves all 6 dimension values exactly', () => {
    const original = makeSampleProfile()
    const roundTripped = JSON.parse(JSON.stringify(original))

    expect(roundTripped.dimensions.priorKnowledge).toBe(0.72)
    expect(roundTripped.dimensions.patternRecognition).toBe(0.85)
    expect(roundTripped.dimensions.abstractionComfort).toBe(0.6)
    expect(roundTripped.dimensions.reasoningStyle).toBe(0.45)
    expect(roundTripped.dimensions.cognitiveStamina).toBe(0.9)
    expect(roundTripped.dimensions.selfAwareness).toBe(0.55)
  })

  it('handles dimensions at boundary value 0', () => {
    const profile = makeSampleProfile({
      dimensions: {
        priorKnowledge: 0,
        patternRecognition: 0,
        abstractionComfort: 0,
        reasoningStyle: 0,
        cognitiveStamina: 0,
        selfAwareness: 0,
      },
    })
    const roundTripped = JSON.parse(JSON.stringify(profile))

    expect(LearnerProfileSchema.safeParse(roundTripped).success).toBe(true)
    for (const val of Object.values(roundTripped.dimensions)) {
      expect(val).toBe(0)
    }
  })

  it('handles dimensions at boundary value 1', () => {
    const profile = makeSampleProfile({
      dimensions: {
        priorKnowledge: 1,
        patternRecognition: 1,
        abstractionComfort: 1,
        reasoningStyle: 1,
        cognitiveStamina: 1,
        selfAwareness: 1,
      },
    })
    const roundTripped = JSON.parse(JSON.stringify(profile))

    expect(LearnerProfileSchema.safeParse(roundTripped).success).toBe(true)
    for (const val of Object.values(roundTripped.dimensions)) {
      expect(val).toBe(1)
    }
  })

  it('preserves narrative with special characters', () => {
    const profile = makeSampleProfile({
      narrative: 'Learner said: "I\'m excited!" — prefers hands-on & visual. Score: 85%. Emoji: \u2728',
    })
    const roundTripped = JSON.parse(JSON.stringify(profile))

    expect(roundTripped.narrative).toBe(profile.narrative)
    expect(LearnerProfileSchema.safeParse(roundTripped).success).toBe(true)
  })

  it('preserves topic with unicode characters', () => {
    const profile = makeSampleProfile({ topic: 'Algorithmes et structures de donn\u00e9es' })
    const roundTripped = JSON.parse(JSON.stringify(profile))

    expect(roundTripped.topic).toBe(profile.topic)
  })

  it('rejects dimensions outside [0, 1] after deserialization', () => {
    const raw = JSON.stringify(makeSampleProfile())
    const tampered = JSON.parse(raw)
    tampered.dimensions.priorKnowledge = 1.5

    expect(LearnerProfileSchema.safeParse(tampered).success).toBe(false)
  })

  it('rejects negative dimensions after deserialization', () => {
    const raw = JSON.stringify(makeSampleProfile())
    const tampered = JSON.parse(raw)
    tampered.dimensions.selfAwareness = -0.1

    expect(LearnerProfileSchema.safeParse(tampered).success).toBe(false)
  })
})
