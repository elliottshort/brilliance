import { describe, test, expect } from 'vitest'
import { scoreProfile, clamp, getAct2Responses, getResponsesByType } from '../scoring'
import type { AssessmentResponse, AssessmentPuzzle } from '@/lib/schemas/assessment'

function makeResponse(overrides: Partial<AssessmentResponse> & { puzzleId: string; puzzleType: string }): AssessmentResponse {
  return {
    response: null,
    responseTimeMs: 4000,
    hintsUsed: 0,
    correct: null,
    ...overrides,
  }
}

const PUZZLES: AssessmentPuzzle[] = [
  {
    type: 'concept_sort',
    id: 'cs-1',
    title: 'Sort concepts',
    concepts: [
      { id: 'c1', text: 'variable' },
      { id: 'c2', text: 'function' },
      { id: 'c3', text: 'class' },
    ],
    categories: ['Know it', 'Heard of it', 'New to me'],
  },
  {
    type: 'confidence_probe',
    id: 'cp-1',
    statement: 'I understand variables.',
  },
  {
    type: 'what_happens_next',
    id: 'whn-1',
    scenario: 'You use an undefined variable.',
    options: [
      { id: 'o1', text: 'It works' },
      { id: 'o2', text: 'Error' },
    ],
    correctId: 'o2',
    explanation: 'An error is raised because the variable is not defined.',
  },
  {
    type: 'multiple_choice',
    id: 'mc-1',
    title: 'Which is mutable?',
    options: [
      { id: 'o1', text: 'tuple', isCorrect: false },
      { id: 'o2', text: 'list', isCorrect: true },
    ],
    explanation: 'Lists are mutable, tuples are not.',
    hints: ['Think about which can change'],
    difficulty: 'easy' as const,
    abstract: false,
  },
  {
    type: 'fill_in_blank',
    id: 'fib-1',
    title: 'Complete the code',
    prompt: 'A {{blank}} stores data.',
    blanks: [{ id: 'b1', acceptedAnswers: ['variable'], caseSensitive: false }],
    explanation: 'Variables store data for later use.',
    hints: ['Starts with v'],
    difficulty: 'easy' as const,
    abstract: false,
  },
  {
    type: 'ordering',
    id: 'ord-1',
    title: 'Order the steps',
    items: [
      { id: 's1', text: 'Declare' },
      { id: 's2', text: 'Assign' },
      { id: 's3', text: 'Use' },
    ],
    correctOrder: ['s1', 's2', 's3'],
    explanation: 'You must declare, then assign, then use a variable.',
    hints: ['What comes first?'],
    difficulty: 'medium' as const,
    abstract: true,
  },
  {
    type: 'code_block',
    id: 'cb-1',
    title: 'Write a function',
    language: 'python',
    starterCode: 'def add(a, b):\n  pass',
    testCases: [{ input: 'add(1, 2)', expectedOutput: '3' }],
    explanation: 'The function should return the sum of a and b.',
    hints: ['Use the + operator'],
    difficulty: 'hard' as const,
    abstract: true,
  },
]

function allCorrectResponses(): AssessmentResponse[] {
  return [
    makeResponse({
      puzzleId: 'cs-1',
      puzzleType: 'concept_sort',
      response: { sorted: { 'Know it': ['c1', 'c2', 'c3'], 'Heard of it': [], 'New to me': [] } },
      responseTimeMs: 8000,
    }),
    makeResponse({
      puzzleId: 'cp-1',
      puzzleType: 'confidence_probe',
      response: { confidence: 85 },
      responseTimeMs: 3000,
    }),
    makeResponse({
      puzzleId: 'whn-1',
      puzzleType: 'what_happens_next',
      response: { selectedId: 'o2' },
      correct: true,
      responseTimeMs: 5500,
    }),
    makeResponse({ puzzleId: 'mc-1', puzzleType: 'multiple_choice', correct: true, responseTimeMs: 6000 }),
    makeResponse({ puzzleId: 'fib-1', puzzleType: 'fill_in_blank', correct: true, responseTimeMs: 7000 }),
    makeResponse({ puzzleId: 'ord-1', puzzleType: 'ordering', correct: true, responseTimeMs: 8000 }),
    makeResponse({ puzzleId: 'cb-1', puzzleType: 'code_block', correct: true, responseTimeMs: 10000 }),
  ]
}

function allWrongResponses(): AssessmentResponse[] {
  return [
    makeResponse({
      puzzleId: 'cs-1',
      puzzleType: 'concept_sort',
      response: { sorted: { 'Know it': ['c1', 'c2', 'c3'], 'Heard of it': [], 'New to me': [] } },
      responseTimeMs: 5000,
    }),
    makeResponse({
      puzzleId: 'cp-1',
      puzzleType: 'confidence_probe',
      response: { confidence: 90 },
      responseTimeMs: 2000,
    }),
    makeResponse({ puzzleId: 'whn-1', puzzleType: 'what_happens_next', correct: false, responseTimeMs: 2000 }),
    makeResponse({ puzzleId: 'mc-1', puzzleType: 'multiple_choice', correct: false, responseTimeMs: 1500 }),
    makeResponse({ puzzleId: 'fib-1', puzzleType: 'fill_in_blank', correct: false, responseTimeMs: 1000 }),
    makeResponse({ puzzleId: 'ord-1', puzzleType: 'ordering', correct: false, responseTimeMs: 1200 }),
    makeResponse({ puzzleId: 'cb-1', puzzleType: 'code_block', correct: false, responseTimeMs: 800 }),
  ]
}

describe('clamp', () => {
  test('clamps value within range', () => {
    expect(clamp(1.5, 0, 1)).toBe(1)
    expect(clamp(-0.5, 0, 1)).toBe(0)
    expect(clamp(0.5, 0, 1)).toBe(0.5)
  })

  test('NaN returns midpoint', () => {
    expect(clamp(NaN, 0, 1)).toBe(0.5)
  })
})

describe('helper filters', () => {
  const responses = allCorrectResponses()

  test('getAct2Responses filters to Act 2 types only', () => {
    const act2 = getAct2Responses(responses, PUZZLES)
    expect(act2).toHaveLength(4)
    expect(act2.every((r) => ['multiple_choice', 'fill_in_blank', 'ordering', 'code_block'].includes(r.puzzleType))).toBe(true)
  })

  test('getResponsesByType filters by specific type', () => {
    const ordering = getResponsesByType(responses, 'ordering')
    expect(ordering).toHaveLength(1)
    expect(ordering[0].puzzleId).toBe('ord-1')
  })
})

describe('scoreProfile', () => {
  test('zero responses → all dimensions 0.5', () => {
    const result = scoreProfile([], PUZZLES)
    expect(result).toEqual({
      priorKnowledge: 0.5,
      patternRecognition: 0.5,
      abstractionComfort: 0.5,
      reasoningStyle: 0.5,
      cognitiveStamina: 0.5,
      selfAwareness: 0.5,
    })
  })

  test('all correct → priorKnowledge ≥ 0.8', () => {
    const result = scoreProfile(allCorrectResponses(), PUZZLES)
    expect(result.priorKnowledge).toBeGreaterThanOrEqual(0.8)
  })

  test('all correct → selfAwareness ≥ 0.7 (high confidence + high accuracy)', () => {
    const result = scoreProfile(allCorrectResponses(), PUZZLES)
    expect(result.selfAwareness).toBeGreaterThanOrEqual(0.7)
  })

  test('all wrong → priorKnowledge ≤ 0.2', () => {
    const result = scoreProfile(allWrongResponses(), PUZZLES)
    expect(result.priorKnowledge).toBeLessThanOrEqual(0.2)
  })

  test('all wrong → profile still valid, no NaN', () => {
    const result = scoreProfile(allWrongResponses(), PUZZLES)
    for (const [key, val] of Object.entries(result)) {
      expect(val, `${key} should not be NaN`).not.toBeNaN()
      expect(val).toBeGreaterThanOrEqual(0)
      expect(val).toBeLessThanOrEqual(1)
    }
  })

  test('mixed performance → middle-range priorKnowledge', () => {
    const responses = allCorrectResponses()
    responses[3] = makeResponse({ puzzleId: 'mc-1', puzzleType: 'multiple_choice', correct: false, responseTimeMs: 4000 })
    responses[5] = makeResponse({ puzzleId: 'ord-1', puzzleType: 'ordering', correct: false, responseTimeMs: 4000 })
    const result = scoreProfile(responses, PUZZLES)
    expect(result.priorKnowledge).toBeGreaterThan(0.2)
    expect(result.priorKnowledge).toBeLessThan(0.9)
  })

  test('all ordering correct → patternRecognition = 1', () => {
    const result = scoreProfile(allCorrectResponses(), PUZZLES)
    expect(result.patternRecognition).toBe(1)
  })

  test('all ordering wrong → patternRecognition = 0', () => {
    const result = scoreProfile(allWrongResponses(), PUZZLES)
    expect(result.patternRecognition).toBe(0)
  })

  test('fast click-through (<2s) → reasoningStyle toward 0 (procedural)', () => {
    const responses = [
      makeResponse({ puzzleId: 'mc-1', puzzleType: 'multiple_choice', correct: true, responseTimeMs: 1000 }),
      makeResponse({ puzzleId: 'fib-1', puzzleType: 'fill_in_blank', correct: true, responseTimeMs: 1500 }),
      makeResponse({ puzzleId: 'ord-1', puzzleType: 'ordering', correct: true, responseTimeMs: 800 }),
      makeResponse({ puzzleId: 'cb-1', puzzleType: 'code_block', correct: true, responseTimeMs: 1200 }),
    ]
    const result = scoreProfile(responses, PUZZLES)
    expect(result.reasoningStyle).toBeLessThanOrEqual(0.1)
  })

  test('thoughtful responses (>5s) → reasoningStyle toward 1 (conceptual)', () => {
    const responses = [
      makeResponse({ puzzleId: 'mc-1', puzzleType: 'multiple_choice', correct: true, responseTimeMs: 8000 }),
      makeResponse({ puzzleId: 'fib-1', puzzleType: 'fill_in_blank', correct: true, responseTimeMs: 12000 }),
      makeResponse({ puzzleId: 'ord-1', puzzleType: 'ordering', correct: true, responseTimeMs: 9000 }),
      makeResponse({ puzzleId: 'cb-1', puzzleType: 'code_block', correct: true, responseTimeMs: 15000 }),
    ]
    const result = scoreProfile(responses, PUZZLES)
    expect(result.reasoningStyle).toBeGreaterThanOrEqual(0.9)
  })

  test('accuracy drops in second half → lower cognitiveStamina', () => {
    const responses = [
      makeResponse({ puzzleId: 'mc-1', puzzleType: 'multiple_choice', correct: true, responseTimeMs: 4000 }),
      makeResponse({ puzzleId: 'fib-1', puzzleType: 'fill_in_blank', correct: true, responseTimeMs: 4000 }),
      makeResponse({ puzzleId: 'ord-1', puzzleType: 'ordering', correct: false, responseTimeMs: 4000 }),
      makeResponse({ puzzleId: 'cb-1', puzzleType: 'code_block', correct: false, responseTimeMs: 4000 }),
    ]
    const result = scoreProfile(responses, PUZZLES)
    expect(result.cognitiveStamina).toBeLessThan(0.5)
  })

  test('accuracy improves in second half → cognitiveStamina = 1', () => {
    const responses = [
      makeResponse({ puzzleId: 'mc-1', puzzleType: 'multiple_choice', correct: false, responseTimeMs: 4000 }),
      makeResponse({ puzzleId: 'fib-1', puzzleType: 'fill_in_blank', correct: false, responseTimeMs: 4000 }),
      makeResponse({ puzzleId: 'ord-1', puzzleType: 'ordering', correct: true, responseTimeMs: 4000 }),
      makeResponse({ puzzleId: 'cb-1', puzzleType: 'code_block', correct: true, responseTimeMs: 4000 }),
    ]
    const result = scoreProfile(responses, PUZZLES)
    expect(result.cognitiveStamina).toBe(1)
  })

  test('no confidence_probe → selfAwareness defaults to 0.5', () => {
    const responses = [
      makeResponse({ puzzleId: 'mc-1', puzzleType: 'multiple_choice', correct: true, responseTimeMs: 4000 }),
      makeResponse({ puzzleId: 'fib-1', puzzleType: 'fill_in_blank', correct: true, responseTimeMs: 4000 }),
      makeResponse({ puzzleId: 'ord-1', puzzleType: 'ordering', correct: true, responseTimeMs: 4000 }),
    ]
    const result = scoreProfile(responses, PUZZLES)
    expect(result.selfAwareness).toBe(0.5)
  })

  test('high confidence + low accuracy → selfAwareness near 0 (Dunning-Kruger)', () => {
    const responses = [
      makeResponse({
        puzzleId: 'cp-1',
        puzzleType: 'confidence_probe',
        response: { confidence: 95 },
        responseTimeMs: 3000,
      }),
      makeResponse({ puzzleId: 'mc-1', puzzleType: 'multiple_choice', correct: false, responseTimeMs: 4000 }),
      makeResponse({ puzzleId: 'fib-1', puzzleType: 'fill_in_blank', correct: false, responseTimeMs: 4000 }),
      makeResponse({ puzzleId: 'ord-1', puzzleType: 'ordering', correct: false, responseTimeMs: 4000 }),
      makeResponse({ puzzleId: 'cb-1', puzzleType: 'code_block', correct: false, responseTimeMs: 4000 }),
    ]
    const result = scoreProfile(responses, PUZZLES)
    expect(result.selfAwareness).toBeLessThanOrEqual(0.2)
  })

  test('abstract puzzles scored worse → lower abstractionComfort', () => {
    const responses = [
      makeResponse({ puzzleId: 'mc-1', puzzleType: 'multiple_choice', correct: true, responseTimeMs: 4000 }),
      makeResponse({ puzzleId: 'fib-1', puzzleType: 'fill_in_blank', correct: true, responseTimeMs: 4000 }),
      makeResponse({ puzzleId: 'ord-1', puzzleType: 'ordering', correct: false, responseTimeMs: 4000 }),
      makeResponse({ puzzleId: 'cb-1', puzzleType: 'code_block', correct: false, responseTimeMs: 4000 }),
    ]
    const result = scoreProfile(responses, PUZZLES)
    expect(result.abstractionComfort).toBeLessThan(0.5)
  })

  test('all dimensions clamped to [0, 1]', () => {
    const result = scoreProfile(allCorrectResponses(), PUZZLES)
    for (const [key, val] of Object.entries(result)) {
      expect(val, `${key} should be >= 0`).toBeGreaterThanOrEqual(0)
      expect(val, `${key} should be <= 1`).toBeLessThanOrEqual(1)
    }
  })
})
