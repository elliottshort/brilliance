import {
  assessmentReducer,
  createInitialState,
  getCurrentPuzzle,
  type AssessmentState,
} from '../state-machine'
import type { AssessmentPuzzle, AssessmentResponse, LearnerProfile } from '@/lib/schemas/assessment'

const act1Puzzles: AssessmentPuzzle[] = [
  {
    type: 'concept_sort',
    id: 'cs-1',
    title: 'Sort the concepts',
    concepts: [
      { id: 'c1', text: 'Variable' },
      { id: 'c2', text: 'Function' },
      { id: 'c3', text: 'Loop' },
    ],
    categories: ['Basics', 'Control Flow', 'Other'],
  },
  {
    type: 'confidence_probe',
    id: 'cp-1',
    statement: 'I understand closures',
  },
]

const act2Puzzles: AssessmentPuzzle[] = [
  {
    type: 'multiple_choice',
    id: 'mc-1',
    title: 'What is 2+2?',
    options: [
      { id: 'a', text: '3', isCorrect: false },
      { id: 'b', text: '4', isCorrect: true },
    ],
    explanation: 'Basic arithmetic: 2+2=4.',
    hints: ['Think about basic addition'],
    difficulty: 'easy' as const,
  },
  {
    type: 'ordering',
    id: 'ord-1',
    title: 'Order the steps',
    items: [
      { id: 's1', text: 'Step 1' },
      { id: 's2', text: 'Step 2' },
    ],
    correctOrder: ['s1', 's2'],
    explanation: 'Sequential order is correct.',
    hints: ['First things first'],
    difficulty: 'hard' as const,
  },
]

const allPuzzles: AssessmentPuzzle[] = [...act1Puzzles, ...act2Puzzles]

const mockResponse: AssessmentResponse = {
  puzzleId: 'cs-1',
  puzzleType: 'concept_sort',
  response: { sorted: true },
  responseTimeMs: 5000,
  hintsUsed: 0,
  correct: null,
}

const mockProfile: LearnerProfile = {
  topic: 'JavaScript',
  assessedAt: '2026-03-14T10:00:00Z',
  narrative: 'Learner shows solid fundamentals.',
  dimensions: {
    priorKnowledge: 0.6,
    patternRecognition: 0.7,
    abstractionComfort: 0.5,
    reasoningStyle: 0.5,
    cognitiveStamina: 0.8,
    selfAwareness: 0.4,
  },
}

describe('createInitialState', () => {
  it('starts in topic phase when no topic provided', () => {
    const state = createInitialState()
    expect(state.phase).toBe('topic')
    expect(state.topic).toBe('')
  })

  it('starts in generating_puzzles phase when topic provided', () => {
    const state = createInitialState('JavaScript')
    expect(state.phase).toBe('generating_puzzles')
    expect(state.topic).toBe('JavaScript')
  })

  it('initializes all fields to defaults', () => {
    const state = createInitialState()
    expect(state.puzzles).toEqual([])
    expect(state.responses).toEqual([])
    expect(state.currentPuzzleIndex).toBe(0)
    expect(state.profile).toBeNull()
    expect(state.error).toBeNull()
    expect(state.direction).toBe('forward')
  })
})

describe('assessmentReducer', () => {
  it('SET_TOPIC transitions from topic to generating_puzzles', () => {
    const state = createInitialState()
    const next = assessmentReducer(state, { type: 'SET_TOPIC', topic: 'React' })
    expect(next.phase).toBe('generating_puzzles')
    expect(next.topic).toBe('React')
  })

  it('PUZZLES_GENERATED transitions from generating_puzzles to act1', () => {
    const state = createInitialState('JS')
    const next = assessmentReducer(state, { type: 'PUZZLES_GENERATED', puzzles: allPuzzles })
    expect(next.phase).toBe('act1')
    expect(next.puzzles).toBe(allPuzzles)
    expect(next.currentPuzzleIndex).toBe(0)
  })

  it('RECORD_RESPONSE appends to responses in act1', () => {
    const state: AssessmentState = {
      ...createInitialState('JS'),
      phase: 'act1',
      puzzles: allPuzzles,
    }
    const next = assessmentReducer(state, { type: 'RECORD_RESPONSE', response: mockResponse })
    expect(next.responses).toHaveLength(1)
    expect(next.responses[0]).toBe(mockResponse)
  })

  it('RECORD_RESPONSE appends to responses in act2', () => {
    const state: AssessmentState = {
      ...createInitialState('JS'),
      phase: 'act2',
      puzzles: allPuzzles,
      currentPuzzleIndex: 3,
    }
    const next = assessmentReducer(state, { type: 'RECORD_RESPONSE', response: mockResponse })
    expect(next.responses).toHaveLength(1)
  })

  it('NEXT_PUZZLE increments index within act1', () => {
    const state: AssessmentState = {
      ...createInitialState('JS'),
      phase: 'act1',
      puzzles: allPuzzles,
      currentPuzzleIndex: 0,
    }
    const next = assessmentReducer(state, { type: 'NEXT_PUZZLE' })
    expect(next.currentPuzzleIndex).toBe(1)
    expect(next.phase).toBe('act1')
  })

  it('NEXT_PUZZLE auto-transitions from act1 to act2 at boundary', () => {
    const state: AssessmentState = {
      ...createInitialState('JS'),
      phase: 'act1',
      puzzles: allPuzzles,
      currentPuzzleIndex: 1,
    }
    const next = assessmentReducer(state, { type: 'NEXT_PUZZLE' })
    expect(next.currentPuzzleIndex).toBe(2)
    expect(next.phase).toBe('act2')
  })

  it('NEXT_PUZZLE auto-transitions from act2 to generating_profile after last puzzle', () => {
    const state: AssessmentState = {
      ...createInitialState('JS'),
      phase: 'act2',
      puzzles: allPuzzles,
      act2Loaded: true,
      currentPuzzleIndex: 3,
    }
    const next = assessmentReducer(state, { type: 'NEXT_PUZZLE' })
    expect(next.phase).toBe('generating_profile')
  })

  it('NEXT_PUZZLE transitions to awaiting_act2 when act2 not yet loaded', () => {
    const act1Only = allPuzzles.slice(0, 2)
    const state: AssessmentState = {
      ...createInitialState('JS'),
      phase: 'act1',
      puzzles: act1Only,
      act2Loaded: false,
      currentPuzzleIndex: 1,
    }
    const next = assessmentReducer(state, { type: 'NEXT_PUZZLE' })
    expect(next.phase).toBe('awaiting_act2')
  })

  it('ACT2_PUZZLES_RECEIVED transitions from awaiting_act2 to act2', () => {
    const act1Only = allPuzzles.slice(0, 2)
    const act2Only = allPuzzles.slice(2)
    const state: AssessmentState = {
      ...createInitialState('JS'),
      phase: 'awaiting_act2',
      puzzles: act1Only,
      act2Loaded: false,
      currentPuzzleIndex: 2,
    }
    const next = assessmentReducer(state, { type: 'ACT2_PUZZLES_RECEIVED', puzzles: act2Only })
    expect(next.phase).toBe('act2')
    expect(next.act2Loaded).toBe(true)
    expect(next.puzzles).toHaveLength(4)
  })

  it('ACT2_PUZZLES_RECEIVED during act1 appends without changing phase', () => {
    const act1Only = allPuzzles.slice(0, 2)
    const act2Only = allPuzzles.slice(2)
    const state: AssessmentState = {
      ...createInitialState('JS'),
      phase: 'act1',
      puzzles: act1Only,
      act2Loaded: false,
      currentPuzzleIndex: 0,
    }
    const next = assessmentReducer(state, { type: 'ACT2_PUZZLES_RECEIVED', puzzles: act2Only })
    expect(next.phase).toBe('act1')
    expect(next.act2Loaded).toBe(true)
    expect(next.puzzles).toHaveLength(4)
  })

  it('PROFILE_GENERATED transitions from generating_profile to complete', () => {
    const state: AssessmentState = {
      ...createInitialState('JS'),
      phase: 'generating_profile',
      puzzles: allPuzzles,
    }
    const next = assessmentReducer(state, { type: 'PROFILE_GENERATED', profile: mockProfile })
    expect(next.phase).toBe('complete')
    expect(next.profile).toBe(mockProfile)
  })

  it('SET_ERROR transitions to error from any phase', () => {
    const phases: AssessmentState['phase'][] = [
      'topic', 'generating_puzzles', 'act1', 'act2', 'generating_profile',
    ]
    for (const phase of phases) {
      const state: AssessmentState = { ...createInitialState(), phase }
      const next = assessmentReducer(state, { type: 'SET_ERROR', error: 'Something broke' })
      expect(next.phase).toBe('error')
      expect(next.error).toBe('Something broke')
    }
  })

  it('RETRY transitions from error to generating_puzzles and resets state', () => {
    const state: AssessmentState = {
      ...createInitialState('JS'),
      phase: 'error',
      error: 'Network failure',
      puzzles: allPuzzles,
      responses: [mockResponse],
      currentPuzzleIndex: 3,
      profile: mockProfile,
    }
    const next = assessmentReducer(state, { type: 'RETRY' })
    expect(next.phase).toBe('generating_puzzles')
    expect(next.error).toBeNull()
    expect(next.puzzles).toEqual([])
    expect(next.responses).toEqual([])
    expect(next.currentPuzzleIndex).toBe(0)
    expect(next.profile).toBeNull()
    expect(next.topic).toBe('JS')
  })

  it('silently ignores invalid transitions', () => {
    const topicState = createInitialState()
    expect(assessmentReducer(topicState, { type: 'PUZZLES_GENERATED', puzzles: allPuzzles })).toBe(topicState)
    expect(assessmentReducer(topicState, { type: 'NEXT_PUZZLE' })).toBe(topicState)
    expect(assessmentReducer(topicState, { type: 'RECORD_RESPONSE', response: mockResponse })).toBe(topicState)
    expect(assessmentReducer(topicState, { type: 'RETRY' })).toBe(topicState)

    const act1State: AssessmentState = { ...createInitialState('JS'), phase: 'act1', puzzles: allPuzzles }
    expect(assessmentReducer(act1State, { type: 'SET_TOPIC', topic: 'X' })).toBe(act1State)
  })

  it('direction is always forward', () => {
    let state = createInitialState()
    expect(state.direction).toBe('forward')

    state = assessmentReducer(state, { type: 'SET_TOPIC', topic: 'TS' })
    expect(state.direction).toBe('forward')

    state = assessmentReducer(state, { type: 'PUZZLES_GENERATED', puzzles: allPuzzles })
    expect(state.direction).toBe('forward')

    state = assessmentReducer(state, { type: 'RECORD_RESPONSE', response: mockResponse })
    expect(state.direction).toBe('forward')

    state = assessmentReducer(state, { type: 'NEXT_PUZZLE' })
    expect(state.direction).toBe('forward')

    state = assessmentReducer(state, { type: 'SET_ERROR', error: 'fail' })
    expect(state.direction).toBe('forward')

    state = assessmentReducer(state, { type: 'RETRY' })
    expect(state.direction).toBe('forward')
  })

  it('full happy path: topic → complete', () => {
    let state = createInitialState()
    expect(state.phase).toBe('topic')

    state = assessmentReducer(state, { type: 'SET_TOPIC', topic: 'TypeScript' })
    expect(state.phase).toBe('generating_puzzles')

    state = assessmentReducer(state, { type: 'PUZZLES_GENERATED', puzzles: allPuzzles })
    expect(state.phase).toBe('act1')
    expect(state.currentPuzzleIndex).toBe(0)

    // Act 1: 2 puzzles (concept_sort + confidence_probe)
    for (let i = 0; i < 2; i++) {
      state = assessmentReducer(state, {
        type: 'RECORD_RESPONSE',
        response: { ...mockResponse, puzzleId: allPuzzles[i].id },
      })
      state = assessmentReducer(state, { type: 'NEXT_PUZZLE' })
    }
    expect(state.phase).toBe('act2')
    expect(state.currentPuzzleIndex).toBe(2)
    expect(state.responses).toHaveLength(2)

    // Act 2: 2 puzzles (easy + hard)
    for (let i = 2; i < 4; i++) {
      state = assessmentReducer(state, {
        type: 'RECORD_RESPONSE',
        response: { ...mockResponse, puzzleId: allPuzzles[i].id },
      })
      state = assessmentReducer(state, { type: 'NEXT_PUZZLE' })
    }
    expect(state.phase).toBe('generating_profile')
    expect(state.responses).toHaveLength(4)

    // Profile generated → complete (no act3 step)
    state = assessmentReducer(state, { type: 'PROFILE_GENERATED', profile: mockProfile })
    expect(state.phase).toBe('complete')
    expect(state.profile).toBe(mockProfile)
  })
})

describe('getCurrentPuzzle', () => {
  it('returns null when no puzzles loaded', () => {
    expect(getCurrentPuzzle(createInitialState())).toBeNull()
  })

  it('returns correct puzzle at current index', () => {
    const state: AssessmentState = {
      ...createInitialState('JS'),
      phase: 'act1',
      puzzles: allPuzzles,
      currentPuzzleIndex: 2,
    }
    expect(getCurrentPuzzle(state)).toBe(allPuzzles[2])
  })

  it('returns null when index is out of bounds', () => {
    const state: AssessmentState = {
      ...createInitialState('JS'),
      phase: 'act2',
      puzzles: allPuzzles,
      currentPuzzleIndex: 99,
    }
    expect(getCurrentPuzzle(state)).toBeNull()
  })
})
