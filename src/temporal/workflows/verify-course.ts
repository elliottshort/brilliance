import { proxyActivities } from '@temporalio/workflow'
import type { VerificationInput } from '../types'

const verificationActivities = proxyActivities<
  typeof import('../activities/verification')
>({
  startToCloseTimeout: '3 minutes',
  heartbeatTimeout: '60 seconds',
  retry: {
    initialInterval: '10s',
    maximumInterval: '2m',
    backoffCoefficient: 2,
    maximumAttempts: 2,
    nonRetryableErrorTypes: ['ConfigurationError'],
  },
})

const persistenceActivities = proxyActivities<
  typeof import('../activities/persistence')
>({
  startToCloseTimeout: '30 seconds',
  retry: {
    initialInterval: '3s',
    maximumInterval: '30s',
    backoffCoefficient: 2,
    maximumAttempts: 3,
  },
})

export async function verifyCourseWorkflow(
  input: VerificationInput,
): Promise<void> {
  const verification = await verificationActivities.verifyCourseActivity({
    course: input.course,
  })

  if (verification.overallPass) {
    return
  }

  let fixed
  try {
    fixed = await verificationActivities.autoFixCourseActivity({
      course: input.course,
      verification,
    })
  } catch {
    return
  }

  const recheck = await verificationActivities.verifyCourseActivity({
    course: fixed,
  })

  const bestCourse = recheck.overallPass ? fixed : input.course

  if (recheck.overallPass) {
    await persistenceActivities.updateCourseActivity({
      courseId: input.courseId,
      course: bestCourse,
    })
  }
}
