import type {
  AssessmentResponse,
  AssessmentPuzzle,
  LearnerProfileDimensions,
} from '@/lib/schemas/assessment'

const ACT2_TYPES = [
  'multiple_choice', 'fill_in_blank', 'ordering', 'code_block',
  'matching', 'categorization', 'hotspot', 'diagram_label',
  'interactive_graph', 'number_line', 'pattern_builder',
  'process_stepper', 'simulation', 'block_coding',
] as const

const DIFFICULTY_WEIGHTS: Record<string, number> = {
  easy: 1,
  medium: 1.5,
  hard: 2,
}

export function clamp(value: number, min: number, max: number): number {
  if (Number.isNaN(value)) return (min + max) / 2
  return Math.min(max, Math.max(min, value))
}

function safeDiv(numerator: number, denominator: number, fallback = 0.5): number {
  if (denominator === 0 || !Number.isFinite(numerator / denominator)) return fallback
  return numerator / denominator
}

function nanGuard(value: number, fallback = 0.5): number {
  return Number.isNaN(value) || !Number.isFinite(value) ? fallback : value
}

function findPuzzle(puzzleId: string, puzzles: AssessmentPuzzle[]): AssessmentPuzzle | undefined {
  return puzzles.find((p) => p.id === puzzleId)
}

export function getAct2Responses(
  responses: AssessmentResponse[],
  _puzzles: AssessmentPuzzle[],
): AssessmentResponse[] {
  return responses.filter((r) => (ACT2_TYPES as readonly string[]).includes(r.puzzleType))
}

export function getResponsesByType(
  responses: AssessmentResponse[],
  type: string,
): AssessmentResponse[] {
  return responses.filter((r) => r.puzzleType === type)
}

/**
 * Prior Knowledge (0-1): Weighted average of Act 2 correctness.
 * Harder puzzles weighted more. Concept-sort alignment boosts/reduces.
 */
function scorePriorKnowledge(
  responses: AssessmentResponse[],
  puzzles: AssessmentPuzzle[],
  act2Responses: AssessmentResponse[],
): number {
  if (act2Responses.length === 0) return 0.5

  let weightedCorrect = 0
  let totalWeight = 0

  for (const r of act2Responses) {
    const puzzle = findPuzzle(r.puzzleId, puzzles)
    const difficulty = (puzzle && 'difficulty' in puzzle) ? (puzzle as { difficulty: string }).difficulty : 'medium'
    const weight = DIFFICULTY_WEIGHTS[difficulty] ?? 1.5
    weightedCorrect += r.correct === true ? weight : 0
    totalWeight += weight
  }

  let base = safeDiv(weightedCorrect, totalWeight, 0.5)

  // Concept sort cross-reference: if user claimed "Know it" on concepts but
  // got Act 2 answers wrong, reduce; if aligned, boost.
  const conceptSortResponses = getResponsesByType(responses, 'concept_sort')
  if (conceptSortResponses.length > 0) {
    const act2Correct = act2Responses.filter((r) => r.correct === true).length
    const act2Accuracy = safeDiv(act2Correct, act2Responses.length, 0.5)

    for (const csr of conceptSortResponses) {
      const sorted = csr.response as Record<string, unknown> | null
      if (sorted && typeof sorted === 'object') {
        // response shape: { sorted: { "Know it": [...], ... } } or { "Know it": [...], ... }
        const sortData = ('sorted' in sorted ? sorted.sorted : sorted) as Record<string, string[]> | undefined
        if (sortData && typeof sortData === 'object') {
          const knowItItems = sortData['Know it']
          if (Array.isArray(knowItItems) && knowItItems.length > 0) {
            const conceptCount = Object.values(sortData).flat().length
            const knowItFraction = knowItItems.length / Math.max(conceptCount, 1)
            // High confidence ("Know it") + high accuracy → boost
            // High confidence + low accuracy → reduce
            if (knowItFraction > 0.3) {
              if (act2Accuracy >= 0.7) {
                base = Math.min(1, base + 0.1)
              } else if (act2Accuracy <= 0.3) {
                base = Math.max(0, base - 0.1)
              }
            }
          }
        }
      }
    }
  }

  return clamp(base, 0, 1)
}

/**
 * Pattern Recognition (0-1): Performance on ordering puzzles.
 * If none, proxy from overall Act 2 accuracy.
 */
function scorePatternRecognition(act2Responses: AssessmentResponse[]): number {
  if (act2Responses.length === 0) return 0.5

  const orderingResponses = act2Responses.filter((r) => r.puzzleType === 'ordering')

  if (orderingResponses.length > 0) {
    const correct = orderingResponses.filter((r) => r.correct === true).length
    return clamp(safeDiv(correct, orderingResponses.length, 0.5), 0, 1)
  }

  // Proxy: average Act 2 correctness
  const correct = act2Responses.filter((r) => r.correct === true).length
  return clamp(safeDiv(correct, act2Responses.length, 0.5), 0, 1)
}

/**
 * Abstraction Comfort (0-1): Compare abstract vs concrete puzzle performance.
 * If abstract puzzles scored as well or better → 1.0, much worse → 0.0.
 */
function scoreAbstractionComfort(
  act2Responses: AssessmentResponse[],
  puzzles: AssessmentPuzzle[],
): number {
  if (act2Responses.length === 0) return 0.5

  let abstractCorrect = 0
  let abstractTotal = 0
  let concreteCorrect = 0
  let concreteTotal = 0

  for (const r of act2Responses) {
    const puzzle = findPuzzle(r.puzzleId, puzzles)
    const isAbstract = puzzle && 'abstract' in puzzle && (puzzle as { abstract?: boolean }).abstract === true

    if (isAbstract) {
      abstractTotal++
      if (r.correct === true) abstractCorrect++
    } else if (puzzle && 'abstract' in puzzle && (puzzle as { abstract?: boolean }).abstract === false) {
      concreteTotal++
      if (r.correct === true) concreteCorrect++
    }
  }

  // No abstract distinction available
  if (abstractTotal === 0 && concreteTotal === 0) return 0.5
  // Only abstract puzzles — score based on accuracy
  if (concreteTotal === 0) return clamp(safeDiv(abstractCorrect, abstractTotal, 0.5), 0, 1)
  // Only concrete puzzles
  if (abstractTotal === 0) return 0.5

  const abstractAcc = safeDiv(abstractCorrect, abstractTotal, 0)
  const concreteAcc = safeDiv(concreteCorrect, concreteTotal, 0)
  const diff = abstractAcc - concreteAcc

  // diff >= 0 → abstract as good or better → toward 1.0
  // diff << 0 → abstract much worse → toward 0.0
  // Map diff from [-1, 1] to [0, 1]
  return clamp(0.5 + diff * 0.5, 0, 1)
}

/**
 * Reasoning Style (0-1, procedural=0, conceptual=1):
 * Fast responses (<3s) suggest procedural, slower (>5s) suggest conceptual.
 */
function scoreReasoningStyle(act2Responses: AssessmentResponse[]): number {
  if (act2Responses.length === 0) return 0.5

  const FAST_THRESHOLD_MS = 3000
  const SLOW_THRESHOLD_MS = 5000

  let fastCount = 0
  let slowCount = 0

  for (const r of act2Responses) {
    if (r.responseTimeMs < FAST_THRESHOLD_MS) fastCount++
    else if (r.responseTimeMs > SLOW_THRESHOLD_MS) slowCount++
  }

  const total = fastCount + slowCount
  if (total === 0) return 0.5

  // More slow → conceptual (toward 1), more fast → procedural (toward 0)
  return clamp(safeDiv(slowCount, total, 0.5), 0, 1)
}

/**
 * Cognitive Stamina (0-1): Compare accuracy of first half vs second half.
 * Maintained/improved = 1, significant drop = 0.
 */
function scoreCognitiveStamina(act2Responses: AssessmentResponse[]): number {
  if (act2Responses.length <= 2) return 0.5

  const mid = Math.floor(act2Responses.length / 2)
  const firstHalf = act2Responses.slice(0, mid)
  const secondHalf = act2Responses.slice(mid)

  const firstAcc = safeDiv(
    firstHalf.filter((r) => r.correct === true).length,
    firstHalf.length,
    0.5,
  )
  const secondAcc = safeDiv(
    secondHalf.filter((r) => r.correct === true).length,
    secondHalf.length,
    0.5,
  )

  // If second half is as good or better, full stamina
  if (secondAcc >= firstAcc) return 1.0

  // Drop from first to second: scale 0-1
  // Full drop (1.0 → 0.0) → stamina = 0
  const drop = firstAcc - secondAcc
  return clamp(1 - drop, 0, 1)
}

/**
 * Self-Awareness (0-1): Compare confidence probe to actual performance.
 * Well-calibrated high confidence + high accuracy → 1.
 * Dunning-Kruger (high confidence, low accuracy) → 0.
 */
function scoreSelfAwareness(
  responses: AssessmentResponse[],
  act2Responses: AssessmentResponse[],
): number {
  const confidenceResponses = getResponsesByType(responses, 'confidence_probe')
  if (confidenceResponses.length === 0) return 0.5

  // Extract average confidence (0-100 → 0-1)
  let totalConfidence = 0
  let confidenceCount = 0

  for (const cr of confidenceResponses) {
    const resp = cr.response as Record<string, unknown> | null
    if (resp && typeof resp === 'object' && 'confidence' in resp) {
      const val = Number(resp.confidence)
      if (!Number.isNaN(val)) {
        totalConfidence += val
        confidenceCount++
      }
    }
  }

  if (confidenceCount === 0) return 0.5

  const avgConfidence = totalConfidence / confidenceCount / 100 // normalize to 0-1
  const highConfidence = avgConfidence >= 0.5

  // Actual accuracy
  if (act2Responses.length === 0) return 0.5
  const act2Correct = act2Responses.filter((r) => r.correct === true).length
  const accuracy = safeDiv(act2Correct, act2Responses.length, 0.5)
  const highAccuracy = accuracy >= 0.5

  if (highConfidence && highAccuracy) {
    // Well-calibrated — scale from 0.7 to 1.0 based on how close confidence matches accuracy
    const calibrationError = Math.abs(avgConfidence - accuracy)
    return clamp(1.0 - calibrationError, 0.7, 1.0)
  }
  if (highConfidence && !highAccuracy) {
    // Dunning-Kruger: overconfident
    return clamp(0.2 - (avgConfidence - accuracy) * 0.3, 0, 0.2)
  }
  if (!highConfidence && highAccuracy) {
    // Under-confident
    return 0.3
  }
  // Low confidence, low accuracy — calibrated but low
  return 0.5
}

/**
 * Compute a 6-dimension learner profile from assessment responses and puzzles.
 * Each dimension is clamped to [0, 1]. Any NaN defaults to 0.5.
 */
export function scoreProfile(
  responses: AssessmentResponse[],
  puzzles: AssessmentPuzzle[],
): LearnerProfileDimensions {
  if (responses.length === 0) {
    return {
      priorKnowledge: 0.5,
      patternRecognition: 0.5,
      abstractionComfort: 0.5,
      reasoningStyle: 0.5,
      cognitiveStamina: 0.5,
      selfAwareness: 0.5,
    }
  }

  const act2Responses = getAct2Responses(responses, puzzles)

  return {
    priorKnowledge: nanGuard(scorePriorKnowledge(responses, puzzles, act2Responses)),
    patternRecognition: nanGuard(scorePatternRecognition(act2Responses)),
    abstractionComfort: nanGuard(scoreAbstractionComfort(act2Responses, puzzles)),
    reasoningStyle: nanGuard(scoreReasoningStyle(act2Responses)),
    cognitiveStamina: nanGuard(scoreCognitiveStamina(act2Responses)),
    selfAwareness: nanGuard(scoreSelfAwareness(responses, act2Responses)),
  }
}
