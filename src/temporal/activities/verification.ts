import { heartbeat, ApplicationFailure } from '@temporalio/activity'
import { verifyCourse, autoFixCourse } from '../../lib/claude/verify-course'
import type { VerificationResult } from '../../lib/claude/verify-course'
import type { Course } from '../../lib/schemas/content'

export type { VerificationResult }

export async function verifyCourseActivity(input: {
  course: Course
}): Promise<VerificationResult> {
  heartbeat('Verifying course quality...')

  const heartbeatInterval = setInterval(() => {
    heartbeat('Still verifying course...')
  }, 20_000)

  try {
    return await verifyCourse(input.course)
  } finally {
    clearInterval(heartbeatInterval)
  }
}

export async function autoFixCourseActivity(input: {
  course: Course
  verification: VerificationResult
}): Promise<Course> {
  heartbeat('Auto-fixing course...')

  const heartbeatInterval = setInterval(() => {
    heartbeat('Still auto-fixing course...')
  }, 20_000)

  let fixed: Course
  try {
    fixed = await autoFixCourse(input.course, input.verification)
  } finally {
    clearInterval(heartbeatInterval)
  }

  const hasChanges =
    JSON.stringify(fixed) !== JSON.stringify(input.course)

  if (!hasChanges && !input.verification.overallPass) {
    throw ApplicationFailure.create({
      message: 'Auto-fix returned identical course — fix had no effect',
      type: 'AutoFixFailed',
      nonRetryable: false,
    })
  }

  return fixed
}
