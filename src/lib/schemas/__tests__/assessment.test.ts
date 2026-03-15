import { describe, test, expect } from 'vitest'
import {
  LearnerProfileSchema,
  LearnerProfileDimensionsSchema,
  ConceptSortPuzzleSchema,
  ConfidenceProbePuzzleSchema,
  WhatHappensNextPuzzleSchema,
  AssessmentMultipleChoiceSchema,
  AssessmentPuzzleSchema,
  AssessmentResponseSchema,
} from '../assessment'

const validDimensions = {
  priorKnowledge: 0.5,
  patternRecognition: 0.7,
  abstractionComfort: 0.3,
  reasoningStyle: 0.6,
  cognitiveStamina: 0.8,
  selfAwareness: 0.4,
}

const validProfile = {
  dimensions: validDimensions,
  topic: 'Python basics',
  narrative: 'The learner shows moderate prior knowledge with strong pattern recognition.',
  assessedAt: '2026-03-14T10:00:00.000Z',
}

describe('LearnerProfileSchema', () => {
  test('valid profile passes', () => {
    expect(() => LearnerProfileSchema.parse(validProfile)).not.toThrow()
  })

  test('dimension exactly 0 passes (lower boundary)', () => {
    const dims = { ...validDimensions, priorKnowledge: 0 }
    expect(() => LearnerProfileDimensionsSchema.parse(dims)).not.toThrow()
  })

  test('dimension exactly 1 passes (upper boundary)', () => {
    const dims = { ...validDimensions, priorKnowledge: 1 }
    expect(() => LearnerProfileDimensionsSchema.parse(dims)).not.toThrow()
  })

  test('dimension -0.1 rejects', () => {
    const dims = { ...validDimensions, priorKnowledge: -0.1 }
    expect(() => LearnerProfileDimensionsSchema.parse(dims)).toThrow()
  })

  test('dimension 1.5 rejects', () => {
    const dims = { ...validDimensions, priorKnowledge: 1.5 }
    expect(() => LearnerProfileDimensionsSchema.parse(dims)).toThrow()
  })

  test('missing dimension rejects', () => {
    const { priorKnowledge: _, ...dims } = validDimensions
    expect(() => LearnerProfileDimensionsSchema.parse(dims)).toThrow()
  })
})

describe('ConceptSortPuzzleSchema', () => {
  test('valid concept sort puzzle passes', () => {
    const puzzle = {
      type: 'concept_sort',
      id: 'cs-1',
      title: 'Sort these Python concepts',
      concepts: [
        { id: 'c1', text: 'variable' },
        { id: 'c2', text: 'function' },
        { id: 'c3', text: 'decorator' },
      ],
      categories: ['Know it', 'Heard of it', 'New to me'],
    }
    expect(() => ConceptSortPuzzleSchema.parse(puzzle)).not.toThrow()
  })
})

describe('ConfidenceProbePuzzleSchema', () => {
  test('valid confidence probe passes', () => {
    const puzzle = {
      type: 'confidence_probe',
      id: 'cp-1',
      statement: 'I understand how Python decorators work.',
      topicContext: 'Python advanced features',
    }
    expect(() => ConfidenceProbePuzzleSchema.parse(puzzle)).not.toThrow()
  })

  test('confidence probe without optional topicContext passes', () => {
    const puzzle = {
      type: 'confidence_probe',
      id: 'cp-2',
      statement: 'I can write a recursive function.',
    }
    expect(() => ConfidenceProbePuzzleSchema.parse(puzzle)).not.toThrow()
  })
})

describe('WhatHappensNextPuzzleSchema', () => {
  test('valid what happens next puzzle passes', () => {
    const puzzle = {
      type: 'what_happens_next',
      id: 'whn-1',
      scenario: 'You call a function before defining it in Python.',
      options: [
        { id: 'o1', text: 'It works fine' },
        { id: 'o2', text: 'NameError is raised' },
      ],
      correctId: 'o2',
      explanation: 'Python raises NameError because the function is not yet defined.',
    }
    expect(() => WhatHappensNextPuzzleSchema.parse(puzzle)).not.toThrow()
  })
})

describe('AssessmentMultipleChoiceSchema (Act 2 puzzle)', () => {
  test('valid multiple choice with abstract field passes', () => {
    const puzzle = {
      type: 'multiple_choice',
      id: 'mc-1',
      title: 'Which is a mutable type?',
      options: [
        { id: 'o1', text: 'tuple', isCorrect: false },
        { id: 'o2', text: 'list', isCorrect: true },
      ],
      explanation: 'Lists are mutable; tuples are immutable. This is a key distinction.',
      hints: ['Think about which type can be changed after creation'],
      difficulty: 'easy' as const,
      abstract: true,
    }
    expect(() => AssessmentMultipleChoiceSchema.parse(puzzle)).not.toThrow()
  })
})

describe('AssessmentResponseSchema', () => {
  test('response with correct: null passes', () => {
    const response = {
      puzzleId: 'cs-1',
      puzzleType: 'concept_sort',
      response: { sorted: { 'Know it': ['c1'], 'Heard of it': ['c2'], 'New to me': ['c3'] } },
      responseTimeMs: 12000,
      hintsUsed: 0,
      correct: null,
    }
    expect(() => AssessmentResponseSchema.parse(response)).not.toThrow()
  })

  test('response with correct: true passes', () => {
    const response = {
      puzzleId: 'mc-1',
      puzzleType: 'multiple_choice',
      response: { selectedId: 'o2' },
      responseTimeMs: 3500,
      hintsUsed: 1,
      correct: true,
    }
    expect(() => AssessmentResponseSchema.parse(response)).not.toThrow()
  })
})

describe('AssessmentPuzzleSchema discriminated union', () => {
  test('resolves concept_sort type correctly', () => {
    const puzzle = {
      type: 'concept_sort',
      id: 'cs-1',
      title: 'Sort concepts',
      concepts: [
        { id: 'c1', text: 'variable' },
        { id: 'c2', text: 'function' },
        { id: 'c3', text: 'class' },
      ],
      categories: ['Know it', 'Heard of it', 'New to me'],
    }
    const result = AssessmentPuzzleSchema.parse(puzzle)
    expect(result.type).toBe('concept_sort')
  })

  test('resolves confidence_probe type correctly', () => {
    const puzzle = {
      type: 'confidence_probe',
      id: 'cp-1',
      statement: 'I understand closures.',
    }
    const result = AssessmentPuzzleSchema.parse(puzzle)
    expect(result.type).toBe('confidence_probe')
  })

  test('rejects unknown type', () => {
    const puzzle = {
      type: 'unknown_type',
      id: 'x-1',
    }
    expect(() => AssessmentPuzzleSchema.parse(puzzle)).toThrow()
  })
})
