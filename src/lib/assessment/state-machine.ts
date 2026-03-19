import type { AssessmentPuzzle, AssessmentResponse, LearnerProfile } from '@/lib/schemas/assessment'

const ACT1_PUZZLE_TYPES = new Set(['concept_sort', 'confidence_probe'])
const ACT2_PUZZLE_TYPES = new Set(['multiple_choice', 'fill_in_blank', 'ordering', 'code_block'])

export type AssessmentPhase =
  | 'topic'
  | 'generating_puzzles'
  | 'act1'
  | 'awaiting_act2'
  | 'act2'
  | 'generating_profile'
  | 'complete'
  | 'error'

export interface AssessmentState {
  phase: AssessmentPhase
  topic: string
  puzzles: AssessmentPuzzle[]
  act2Loaded: boolean
  responses: AssessmentResponse[]
  currentPuzzleIndex: number
  profile: LearnerProfile | null
  error: string | null
  direction: 'forward' | 'backward'
}

export type AssessmentAction =
  | { type: 'SET_TOPIC'; topic: string }
  | { type: 'PUZZLES_GENERATED'; puzzles: AssessmentPuzzle[] }
  | { type: 'ACT1_PUZZLES_RECEIVED'; puzzles: AssessmentPuzzle[] }
  | { type: 'ACT2_PUZZLES_RECEIVED'; puzzles: AssessmentPuzzle[] }
  | { type: 'RECORD_RESPONSE'; response: AssessmentResponse }
  | { type: 'NEXT_PUZZLE' }
  | { type: 'PROFILE_GENERATED'; profile: LearnerProfile }
  | { type: 'SET_ERROR'; error: string }
  | { type: 'RETRY' }

export function createInitialState(topic?: string): AssessmentState {
  return {
    phase: topic ? 'generating_puzzles' : 'topic',
    topic: topic ?? '',
    puzzles: [],
    act2Loaded: false,
    responses: [],
    currentPuzzleIndex: 0,
    profile: null,
    error: null,
    direction: 'forward',
  }
}

export function getCurrentPuzzle(state: AssessmentState): AssessmentPuzzle | null {
  if (state.puzzles.length === 0) return null
  if (state.currentPuzzleIndex < 0 || state.currentPuzzleIndex >= state.puzzles.length) return null
  return state.puzzles[state.currentPuzzleIndex]
}

function resolveNextPhase(
  currentPhase: AssessmentPhase,
  currentPuzzle: AssessmentPuzzle,
  nextPuzzle: AssessmentPuzzle | undefined,
  act2Loaded: boolean,
): AssessmentPhase {
  if (!nextPuzzle) {
    if (!act2Loaded) return 'awaiting_act2'
    return 'generating_profile'
  }

  const crossingFromAct1ToAct2 =
    ACT1_PUZZLE_TYPES.has(currentPuzzle.type) && ACT2_PUZZLE_TYPES.has(nextPuzzle.type)
  if (crossingFromAct1ToAct2) return 'act2'

  const leavingAct2 =
    currentPhase === 'act2' && !ACT2_PUZZLE_TYPES.has(nextPuzzle.type) && !ACT1_PUZZLE_TYPES.has(nextPuzzle.type)
  if (leavingAct2) return 'generating_profile'

  return currentPhase
}

export function assessmentReducer(state: AssessmentState, action: AssessmentAction): AssessmentState {
  switch (action.type) {
    case 'SET_TOPIC': {
      if (state.phase !== 'topic') return state
      return {
        ...state,
        topic: action.topic,
        phase: 'generating_puzzles',
        direction: 'forward',
      }
    }

    case 'PUZZLES_GENERATED': {
      if (state.phase !== 'generating_puzzles') return state
      return {
        ...state,
        puzzles: action.puzzles,
        act2Loaded: true,
        currentPuzzleIndex: 0,
        phase: 'act1',
        direction: 'forward',
      }
    }

    case 'ACT1_PUZZLES_RECEIVED': {
      if (state.phase !== 'generating_puzzles') return state
      return {
        ...state,
        puzzles: action.puzzles,
        currentPuzzleIndex: 0,
        phase: 'act1',
        direction: 'forward',
      }
    }

    case 'ACT2_PUZZLES_RECEIVED': {
      const newPuzzles = [...state.puzzles, ...action.puzzles]
      return {
        ...state,
        puzzles: newPuzzles,
        act2Loaded: true,
        phase: state.phase === 'awaiting_act2' ? 'act2' : state.phase,
        direction: 'forward',
      }
    }

    case 'RECORD_RESPONSE': {
      if (state.phase !== 'act1' && state.phase !== 'act2') return state
      return {
        ...state,
        responses: [...state.responses, action.response],
        direction: 'forward',
      }
    }

    case 'NEXT_PUZZLE': {
      if (state.phase !== 'act1' && state.phase !== 'act2') return state

      const currentPuzzle = state.puzzles[state.currentPuzzleIndex]
      const nextIndex = state.currentPuzzleIndex + 1
      const nextPuzzle = state.puzzles[nextIndex]

      return {
        ...state,
        currentPuzzleIndex: nextIndex,
        phase: resolveNextPhase(state.phase, currentPuzzle, nextPuzzle, state.act2Loaded),
        direction: 'forward',
      }
    }

    case 'PROFILE_GENERATED': {
      if (state.phase !== 'generating_profile') return state
      return {
        ...state,
        profile: action.profile,
        phase: 'complete',
        direction: 'forward',
      }
    }

    case 'SET_ERROR': {
      return {
        ...state,
        phase: 'error',
        error: action.error,
        direction: 'forward',
      }
    }

    case 'RETRY': {
      if (state.phase !== 'error') return state
      return {
        ...state,
        phase: 'generating_puzzles',
        error: null,
        puzzles: [],
        act2Loaded: false,
        responses: [],
        currentPuzzleIndex: 0,
        profile: null,
        direction: 'forward',
      }
    }

    default:
      return state
  }
}
