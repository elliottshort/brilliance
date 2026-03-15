import { serializeProfile } from '../serializer'
import type { LearnerProfile } from '@/lib/schemas/assessment'

const baseProfile: LearnerProfile = {
  topic: 'TypeScript Generics',
  assessedAt: '2026-03-14T10:00:00Z',
  narrative: 'The learner shows strong pattern recognition but struggles with abstract type manipulation.',
  dimensions: {
    priorKnowledge: 0.6,
    patternRecognition: 0.8,
    abstractionComfort: 0.3,
    reasoningStyle: 0.5,
    cognitiveStamina: 0.7,
    selfAwareness: 0.4,
  },
}

describe('serializeProfile', () => {
  it('contains all 6 dimension labels', () => {
    const output = serializeProfile(baseProfile)
    expect(output).toContain('Prior Knowledge')
    expect(output).toContain('Pattern Recognition')
    expect(output).toContain('Abstraction Comfort')
    expect(output).toContain('Reasoning Style')
    expect(output).toContain('Cognitive Stamina')
    expect(output).toContain('Self-Awareness')
  })

  it('contains dimension scores formatted to 1 decimal', () => {
    const output = serializeProfile(baseProfile)
    expect(output).toContain('0.6/1.0')
    expect(output).toContain('0.8/1.0')
    expect(output).toContain('0.3/1.0')
    expect(output).toContain('0.5/1.0')
    expect(output).toContain('0.7/1.0')
    expect(output).toContain('0.4/1.0')
  })

  it('contains the topic', () => {
    const output = serializeProfile(baseProfile)
    expect(output).toContain('TypeScript Generics')
  })

  it('contains the narrative text', () => {
    const output = serializeProfile(baseProfile)
    expect(output).toContain('The learner shows strong pattern recognition but struggles with abstract type manipulation.')
  })

  it('output length is under 5000 characters', () => {
    const output = serializeProfile(baseProfile)
    expect(output.length).toBeLessThan(5000)
  })

  it('different profiles produce different recommendation text', () => {
    const beginnerProfile: LearnerProfile = {
      ...baseProfile,
      dimensions: {
        priorKnowledge: 0.1,
        patternRecognition: 0.2,
        abstractionComfort: 0.1,
        reasoningStyle: 0.1,
        cognitiveStamina: 0.2,
        selfAwareness: 0.1,
      },
    }
    const advancedProfile: LearnerProfile = {
      ...baseProfile,
      dimensions: {
        priorKnowledge: 0.9,
        patternRecognition: 0.9,
        abstractionComfort: 0.9,
        reasoningStyle: 0.9,
        cognitiveStamina: 0.9,
        selfAwareness: 0.9,
      },
    }
    const beginnerOutput = serializeProfile(beginnerProfile)
    const advancedOutput = serializeProfile(advancedProfile)
    expect(beginnerOutput).not.toEqual(advancedOutput)

    const beginnerRecs = beginnerOutput.split('### Teaching Recommendations')[1]
    const advancedRecs = advancedOutput.split('### Teaching Recommendations')[1]
    expect(beginnerRecs).not.toEqual(advancedRecs)
  })

  it('interprets score 0.8 as "Advanced understanding"', () => {
    const profile: LearnerProfile = {
      ...baseProfile,
      dimensions: {
        ...baseProfile.dimensions,
        priorKnowledge: 0.85,
      },
    }
    const output = serializeProfile(profile)
    expect(output).toContain('Advanced understanding')
  })

  it('interprets reasoning style correctly for procedural (0.2)', () => {
    const profile: LearnerProfile = {
      ...baseProfile,
      dimensions: {
        ...baseProfile.dimensions,
        reasoningStyle: 0.2,
      },
    }
    const output = serializeProfile(profile)
    expect(output).toContain('Strongly procedural')
  })

  it('interprets reasoning style correctly for conceptual (0.9)', () => {
    const profile: LearnerProfile = {
      ...baseProfile,
      dimensions: {
        ...baseProfile.dimensions,
        reasoningStyle: 0.9,
      },
    }
    const output = serializeProfile(profile)
    expect(output).toContain('Strongly conceptual')
  })

  it('includes at least 2 teaching recommendations', () => {
    const output = serializeProfile(baseProfile)
    const recsSection = output.split('### Teaching Recommendations')[1] ?? ''
    const recLines = recsSection.split('\n').filter((l) => l.startsWith('- '))
    expect(recLines.length).toBeGreaterThanOrEqual(2)
  })
})
