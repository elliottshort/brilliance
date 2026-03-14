import { proxyActivities } from '@temporalio/workflow'
import type { LessonGenerationInput, LessonGenerationResult } from '../types'

const { generateLessonScreensActivity } = proxyActivities<
  typeof import('../activities/generation')
>({
  startToCloseTimeout: '5 minutes',
  heartbeatTimeout: '60 seconds',
  retry: {
    initialInterval: '10s',
    maximumInterval: '2m',
    backoffCoefficient: 2,
    maximumAttempts: 3,
    nonRetryableErrorTypes: ['ConfigurationError'],
  },
})

export async function generateLessonWorkflow(
  input: LessonGenerationInput,
): Promise<LessonGenerationResult> {
  return generateLessonScreensActivity(input)
}
