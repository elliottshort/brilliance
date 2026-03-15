import { describe, it, expect } from 'vitest'
import {
  validateMultipleChoice,
  validateFillInBlank,
  validateOrdering,
  validateCodeBlock,
  validateMatching,
  validateLesson,
} from '@/lib/validation/content-validator'
import type {
  MultipleChoiceScreen,
  FillInBlankScreen,
  OrderingScreen,
  CodeBlockScreen,
  MatchingScreen,
  Lesson,
} from '@/lib/schemas/content'

function makeMultipleChoice(overrides: Partial<MultipleChoiceScreen> = {}): MultipleChoiceScreen {
  return {
    id: 'mc-1',
    type: 'multiple_choice',
    title: 'Which is a string?',
    options: [
      { id: 'a', text: 'Hello World', isCorrect: true },
      { id: 'b', text: '42', isCorrect: false },
    ],
    explanation: 'Hello World is a string because it uses quotes.',
    hints: ['Think about text values'],
    difficulty: 'easy',
    ...overrides,
  }
}

function makeFillInBlank(overrides: Partial<FillInBlankScreen> = {}): FillInBlankScreen {
  return {
    id: 'fib-1',
    type: 'fill_in_blank',
    title: 'Complete the Code',
    prompt: 'A {{blank}} loop runs while a condition is {{blank}}.',
    blanks: [
      { id: 'blank-1', acceptedAnswers: ['while'], caseSensitive: false },
      { id: 'blank-2', acceptedAnswers: ['true'], caseSensitive: false },
    ],
    explanation: 'A while loop continues as long as the condition is true.',
    hints: ['Think about conditional loops'],
    difficulty: 'medium',
    ...overrides,
  }
}

function makeOrdering(overrides: Partial<OrderingScreen> = {}): OrderingScreen {
  return {
    id: 'order-1',
    type: 'ordering',
    title: 'Arrange these steps',
    items: [
      { id: 'step-1', text: 'Declare variable' },
      { id: 'step-2', text: 'Assign value' },
      { id: 'step-3', text: 'Use variable' },
    ],
    correctOrder: ['step-1', 'step-2', 'step-3'],
    explanation: 'You must declare before assigning and using a variable.',
    hints: ['What comes first?'],
    difficulty: 'easy',
    ...overrides,
  }
}

function makeCodeBlock(overrides: Partial<CodeBlockScreen> = {}): CodeBlockScreen {
  return {
    id: 'code-1',
    type: 'code_block',
    title: 'Add Two Numbers',
    language: 'python',
    starterCode: 'def add(a, b):\n  pass',
    testCases: [{ input: 'add(2, 3)', expectedOutput: '5' }],
    explanation: 'Return the sum of a and b using the + operator.',
    hints: ['Use the + operator'],
    difficulty: 'easy',
    ...overrides,
  }
}

function makeLesson(overrides: Partial<Lesson> = {}): Lesson {
  return {
    id: 'lesson-1',
    title: 'Intro to Variables',
    description: 'Learn what variables are.',
    screens: [
      {
        id: 'explain-1',
        type: 'explanation',
        title: 'What is a Variable?',
        content: 'A variable is a named container for storing data values in memory.',
      },
      makeMultipleChoice({ id: 'mc-1' }),
    ],
    ...overrides,
  }
}

describe('validateMultipleChoice', () => {
  it('returns valid for a correct screen', () => {
    const result = validateMultipleChoice(makeMultipleChoice())
    expect(result.valid).toBe(true)
    expect(result.errors).toHaveLength(0)
  })

  it('returns error when no correct option exists', () => {
    const screen = makeMultipleChoice({
      options: [
        { id: 'a', text: 'Option A', isCorrect: false },
        { id: 'b', text: 'Option B', isCorrect: false },
      ],
    })
    const result = validateMultipleChoice(screen)
    expect(result.valid).toBe(false)
    expect(result.errors.some((e) => e.includes('exactly one correct option'))).toBe(true)
  })

  it('returns error when multiple correct options exist', () => {
    const screen = makeMultipleChoice({
      options: [
        { id: 'a', text: 'Option A', isCorrect: true },
        { id: 'b', text: 'Option B', isCorrect: true },
      ],
    })
    const result = validateMultipleChoice(screen)
    expect(result.valid).toBe(false)
    expect(result.errors.some((e) => e.includes('exactly one correct option'))).toBe(true)
  })

  it('returns error for duplicate option text', () => {
    const screen = makeMultipleChoice({
      options: [
        { id: 'a', text: 'Same Text', isCorrect: true },
        { id: 'b', text: 'Same Text', isCorrect: false },
      ],
    })
    const result = validateMultipleChoice(screen)
    expect(result.valid).toBe(false)
    expect(result.errors.some((e) => e.includes('Duplicate option text'))).toBe(true)
  })

  it('duplicate detection is case-insensitive', () => {
    const screen = makeMultipleChoice({
      options: [
        { id: 'a', text: 'hello', isCorrect: true },
        { id: 'b', text: 'HELLO', isCorrect: false },
      ],
    })
    const result = validateMultipleChoice(screen)
    expect(result.valid).toBe(false)
    expect(result.errors.some((e) => e.includes('Duplicate option text'))).toBe(true)
  })
})

describe('validateFillInBlank', () => {
  it('returns valid for a correct screen', () => {
    const result = validateFillInBlank(makeFillInBlank())
    expect(result.valid).toBe(true)
    expect(result.errors).toHaveLength(0)
  })

  it('returns error when marker count mismatches blanks array length', () => {
    const screen = makeFillInBlank({
      prompt: 'A {{blank}} loop.',
      blanks: [
        { id: 'blank-1', acceptedAnswers: ['while'], caseSensitive: false },
        { id: 'blank-2', acceptedAnswers: ['true'], caseSensitive: false },
      ],
    })
    const result = validateFillInBlank(screen)
    expect(result.valid).toBe(false)
    expect(result.errors.some((e) => e.includes('does not match blanks array length'))).toBe(true)
  })

  it('returns error when prompt has no {{blank}} markers', () => {
    const screen = makeFillInBlank({ prompt: 'No markers here.' })
    const result = validateFillInBlank(screen)
    expect(result.valid).toBe(false)
    expect(result.errors.some((e) => e.includes('{{blank}} marker'))).toBe(true)
  })
})

describe('validateOrdering', () => {
  it('returns valid for a correct screen', () => {
    const result = validateOrdering(makeOrdering())
    expect(result.valid).toBe(true)
    expect(result.errors).toHaveLength(0)
  })

  it('returns error when correctOrder references non-existent item ID', () => {
    const screen = makeOrdering({ correctOrder: ['step-1', 'step-2', 'step-WRONG'] })
    const result = validateOrdering(screen)
    expect(result.valid).toBe(false)
    expect(result.errors.some((e) => e.includes('does not exist in items'))).toBe(true)
  })

  it('returns error when item ID is missing from correctOrder', () => {
    const screen = makeOrdering({ correctOrder: ['step-1', 'step-2'] })
    const result = validateOrdering(screen)
    expect(result.valid).toBe(false)
    expect(result.errors.some((e) => e.includes('missing from correctOrder'))).toBe(true)
  })

  it('returns error when items have duplicate IDs', () => {
    const screen = makeOrdering({
      items: [
        { id: 'step-1', text: 'First' },
        { id: 'step-1', text: 'Duplicate' },
        { id: 'step-3', text: 'Third' },
      ],
      correctOrder: ['step-1', 'step-1', 'step-3'],
    })
    const result = validateOrdering(screen)
    expect(result.valid).toBe(false)
    expect(result.errors.some((e) => e.includes('duplicate IDs'))).toBe(true)
  })
})

describe('validateCodeBlock', () => {
  it('returns valid for a correct screen', () => {
    const result = validateCodeBlock(makeCodeBlock())
    expect(result.valid).toBe(true)
    expect(result.errors).toHaveLength(0)
  })

  it('returns error for unsupported language', () => {
    const screen = makeCodeBlock({ language: 'brainfuck' })
    const result = validateCodeBlock(screen)
    expect(result.valid).toBe(false)
    expect(result.errors.some((e) => e.includes('not a supported value'))).toBe(true)
  })

  it('returns error when starterCode is empty', () => {
    const screen = makeCodeBlock({ starterCode: '' })
    const result = validateCodeBlock(screen)
    expect(result.valid).toBe(false)
    expect(result.errors.some((e) => e.includes('starterCode must be non-empty'))).toBe(true)
  })

  it('accepts all supported languages', () => {
    const languages = ['python', 'javascript', 'typescript', 'java', 'go', 'rust']
    for (const language of languages) {
      const result = validateCodeBlock(makeCodeBlock({ language }))
      expect(result.valid).toBe(true)
    }
  })
})

function makeMatching(overrides: Partial<MatchingScreen> = {}): MatchingScreen {
  return {
    id: 'match-1',
    type: 'matching',
    title: 'Match tools to purposes',
    pairs: [
      { id: 'pair-1', left: 'Wrench', right: 'Tighten bolts' },
      { id: 'pair-2', left: 'Screwdriver', right: 'Drive screws' },
      { id: 'pair-3', left: 'Hammer', right: 'Drive nails' },
    ],
    explanation: 'Each tool is designed for a specific mechanical task.',
    hints: ['Think about the shape of each tool'],
    difficulty: 'easy',
    ...overrides,
  }
}

describe('validateMatching', () => {
  it('returns valid for a correct screen', () => {
    const result = validateMatching(makeMatching())
    expect(result.valid).toBe(true)
    expect(result.errors).toHaveLength(0)
  })

  it('returns error when pairs have duplicate IDs', () => {
    const screen = makeMatching({
      pairs: [
        { id: 'pair-1', left: 'Wrench', right: 'Tighten bolts' },
        { id: 'pair-1', left: 'Screwdriver', right: 'Drive screws' },
        { id: 'pair-3', left: 'Hammer', right: 'Drive nails' },
      ],
    })
    const result = validateMatching(screen)
    expect(result.valid).toBe(false)
    expect(result.errors.some((e) => e.includes('duplicate IDs'))).toBe(true)
  })

  it('returns error for duplicate left values', () => {
    const screen = makeMatching({
      pairs: [
        { id: 'pair-1', left: 'Wrench', right: 'Tighten bolts' },
        { id: 'pair-2', left: 'Wrench', right: 'Drive screws' },
      ],
    })
    const result = validateMatching(screen)
    expect(result.valid).toBe(false)
    expect(result.errors.some((e) => e.includes('Duplicate left value'))).toBe(true)
  })

  it('returns error for duplicate right values', () => {
    const screen = makeMatching({
      pairs: [
        { id: 'pair-1', left: 'Wrench', right: 'Tighten bolts' },
        { id: 'pair-2', left: 'Screwdriver', right: 'Tighten bolts' },
      ],
    })
    const result = validateMatching(screen)
    expect(result.valid).toBe(false)
    expect(result.errors.some((e) => e.includes('Duplicate right value'))).toBe(true)
  })
})

describe('validateLesson', () => {
  it('returns valid for a correct lesson', () => {
    const result = validateLesson(makeLesson())
    expect(result.valid).toBe(true)
    expect(result.errors).toHaveLength(0)
  })

  it('returns error for duplicate screen IDs', () => {
    const lesson = makeLesson({
      screens: [
        {
          id: 'same-id',
          type: 'explanation',
          title: 'Screen 1',
          content: 'A variable is a named container for storing data values in memory.',
        },
        {
          id: 'same-id',
          type: 'explanation',
          title: 'Screen 2',
          content: 'A variable is a named container for storing data values in memory.',
        },
      ],
    })
    const result = validateLesson(lesson)
    expect(result.valid).toBe(false)
    expect(result.errors.some((e) => e.includes('Duplicate screen ID'))).toBe(true)
  })

  it('returns warning when first screen is not explanation', () => {
    const lesson = makeLesson({
      screens: [
        makeMultipleChoice({ id: 'mc-first' }),
        {
          id: 'explain-2',
          type: 'explanation',
          title: 'Explanation',
          content: 'A variable is a named container for storing data values in memory.',
        },
      ],
    })
    const result = validateLesson(lesson)
    expect(result.warnings.some((w) => w.includes('recommended to start with an "explanation"'))).toBe(true)
  })

  it('returns error when lesson has fewer than 2 screens', () => {
    const lesson = makeLesson({
      screens: [
        {
          id: 'explain-1',
          type: 'explanation',
          title: 'Only Screen',
          content: 'A variable is a named container for storing data values in memory.',
        },
      ],
    })
    const result = validateLesson(lesson)
    expect(result.valid).toBe(false)
    expect(result.errors.some((e) => e.includes('at least 2 screens'))).toBe(true)
  })
})
