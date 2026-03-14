import { heartbeat, ApplicationFailure } from '@temporalio/activity'
import { getClaudeClient } from '../../lib/claude/client'
import { generateSkeleton, generateLessonScreens } from '../../lib/claude/generate-course'
import type { LessonContext } from '../../lib/claude/generate-course'
import type { Screen } from '../../lib/schemas/content'
import type { CourseSkeleton, LessonGenerationInput, LessonGenerationResult } from '../types'

export async function generateSkeletonActivity(input: {
  courseId: string
  topic: string
  interviewSummary: string
  researchSummary: string
}): Promise<CourseSkeleton> {
  heartbeat('Generating course skeleton...')

  const client = getClaudeClient()
  if (!client) {
    throw ApplicationFailure.create({
      message: 'Anthropic API key not configured',
      type: 'ConfigurationError',
      nonRetryable: true,
    })
  }

  const heartbeatInterval = setInterval(() => {
    heartbeat('Still generating skeleton...')
  }, 20_000)

  let skeleton: CourseSkeleton | null
  try {
    skeleton = await generateSkeleton(
      client,
      input.courseId,
      input.topic,
      input.interviewSummary,
      input.researchSummary,
    )
  } finally {
    clearInterval(heartbeatInterval)
  }

  if (!skeleton) {
    throw ApplicationFailure.create({
      message: 'Failed to generate course skeleton — extractToolInput returned null',
      type: 'LLMExtractionFailed',
      nonRetryable: false,
    })
  }

  return skeleton
}

export async function generateLessonScreensActivity(
  input: LessonGenerationInput,
): Promise<LessonGenerationResult> {
  heartbeat({ lesson: input.lesson.lessonTitle })

  const client = getClaudeClient()
  if (!client) {
    throw ApplicationFailure.create({
      message: 'Anthropic API key not configured',
      type: 'ConfigurationError',
      nonRetryable: true,
    })
  }

  const lessonContext: LessonContext = {
    moduleTitle: input.lesson.moduleTitle,
    lessonId: input.lesson.lessonId,
    lessonTitle: input.lesson.lessonTitle,
    lessonDescription: input.lesson.lessonDescription,
    screenCount: input.lesson.screenCount,
    primaryConcept: input.lesson.primaryConcept,
    weavedConcepts: input.lesson.weavedConcepts,
    lessonIndex: input.lesson.lessonIndex,
    totalLessons: input.lesson.totalLessons,
  }

  const allLessonContexts: LessonContext[] = input.allLessons.map((l) => ({
    moduleTitle: l.moduleTitle,
    lessonId: l.lessonId,
    lessonTitle: l.lessonTitle,
    lessonDescription: l.lessonDescription,
    screenCount: l.screenCount,
    primaryConcept: l.primaryConcept,
    weavedConcepts: l.weavedConcepts,
    lessonIndex: l.lessonIndex,
    totalLessons: l.totalLessons,
  }))

  const heartbeatInterval = setInterval(() => {
    heartbeat({ lesson: input.lesson.lessonTitle, status: 'generating' })
  }, 20_000)

  let screens: Screen[]
  try {
    screens = await generateLessonScreens(
      client,
      input.topic,
      input.interviewSummary,
      lessonContext,
      allLessonContexts,
    )
  } finally {
    clearInterval(heartbeatInterval)
  }

  if (screens.length === 0) {
    throw ApplicationFailure.create({
      message: `Failed to generate screens for lesson "${input.lesson.lessonTitle}" — extractToolInput returned empty`,
      type: 'LLMExtractionFailed',
      nonRetryable: false,
    })
  }

  return {
    lessonId: input.lesson.lessonId,
    screens,
  }
}
