import {
  proxyActivities,
  defineQuery,
  setHandler,
  executeChild,
  startChild,
  ParentClosePolicy,
} from '@temporalio/workflow'

import type {
  CourseGenerationInput,
  CourseGenerationProgress,
  LessonGenerationInput,
  CourseSkeleton,
  SkeletonLesson,
} from '../types'
import { PROGRESS_QUERY } from '../types'
import type { Course, Screen } from '../../lib/schemas/content'

import { generateLessonWorkflow } from './generate-lesson'
import { verifyCourseWorkflow } from './verify-course'

const researchActivities = proxyActivities<
  typeof import('../activities/research')
>({
  startToCloseTimeout: '2 minutes',
  heartbeatTimeout: '60 seconds',
  retry: {
    initialInterval: '5s',
    maximumInterval: '1m',
    backoffCoefficient: 2,
    maximumAttempts: 3,
  },
})

const generationActivities = proxyActivities<
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

export const getProgress = defineQuery<CourseGenerationProgress>(PROGRESS_QUERY)

export async function courseGenerationWorkflow(
  input: CourseGenerationInput,
): Promise<string> {
  let progress: CourseGenerationProgress = {
    phase: 'pending',
    percent: 0,
    preview: null,
    courseId: null,
    error: null,
    completedLessons: 0,
    totalLessons: 0,
  }

  setHandler(getProgress, () => progress)

  try {
    progress = { ...progress, phase: 'researching', percent: 5 }

    const research = await researchActivities.researchTopicActivity({
      topic: input.topic,
      interviewSummary: input.interviewSummary,
    })

    progress = { ...progress, percent: 15 }

    progress = { ...progress, phase: 'skeleton', percent: 20 }

    const skeleton: CourseSkeleton =
      await generationActivities.generateSkeletonActivity({
        courseId: input.courseId,
        topic: input.topic,
        interviewSummary: input.interviewSummary,
        researchSummary: research.summary,
      })

    progress = {
      ...progress,
      percent: 40,
      preview: {
        title: skeleton.title,
        description: skeleton.description,
        moduleCount: skeleton.modules.length,
      },
    }

    progress = { ...progress, phase: 'generating_lessons' }

    const allLessonContexts: Array<{
      moduleTitle: string
      lessonId: string
      lessonTitle: string
      lessonDescription: string
      screenCount: number
      primaryConcept: string
      weavedConcepts: string[]
      lessonIndex: number
      totalLessons: number
    }> = []

    let lessonIndex = 0
    for (const mod of skeleton.modules) {
      for (const lesson of mod.lessons) {
        allLessonContexts.push({
          moduleTitle: mod.title,
          lessonId: lesson.id,
          lessonTitle: lesson.title,
          lessonDescription: lesson.description,
          screenCount: Math.min(Math.max(lesson.screenCount, 3), 10),
          primaryConcept: lesson.primaryConcept,
          weavedConcepts: lesson.weavedConcepts,
          lessonIndex,
          totalLessons: 0,
        })
        lessonIndex++
      }
    }
    for (const ctx of allLessonContexts) {
      ctx.totalLessons = allLessonContexts.length
    }

    progress = { ...progress, totalLessons: allLessonContexts.length }

    const lessonResults = await Promise.all(
      allLessonContexts.map((lessonCtx) =>
        executeChild(generateLessonWorkflow, {
          workflowId: `lesson-${input.courseId}-${lessonCtx.lessonId}`,
          args: [
            {
              courseId: input.courseId,
              topic: input.topic,
              interviewSummary: input.interviewSummary,
              lesson: lessonCtx,
              allLessons: allLessonContexts,
            } satisfies LessonGenerationInput,
          ],
        }),
      ),
    )

    progress = {
      ...progress,
      percent: 80,
      completedLessons: allLessonContexts.length,
    }

    const screensByLesson = new Map<string, Screen[]>()
    for (const result of lessonResults) {
      screensByLesson.set(result.lessonId, result.screens)
    }

    const course: Course = {
      id: input.courseId,
      title: skeleton.title,
      description: skeleton.description,
      coverImage: skeleton.coverImage,
      modules: skeleton.modules.map((mod) => ({
        id: mod.id,
        title: mod.title,
        description: mod.description,
        lessons: mod.lessons.map((lesson: SkeletonLesson) => ({
          id: lesson.id,
          title: lesson.title,
          description: lesson.description,
          screens: screensByLesson.get(lesson.id) ?? [],
        })),
      })),
    }

    progress = { ...progress, phase: 'validating', percent: 85 }

    const validation = await persistenceActivities.validateCourseActivity({
      course,
    })

    if (!validation.valid) {
      progress = {
        ...progress,
        phase: 'failed',
        error: `Validation failed: ${validation.errors.slice(0, 3).join('; ')}`,
      }
      throw new Error(
        `Course validation failed: ${validation.errors.join('; ')}`,
      )
    }

    progress = { ...progress, phase: 'saving', percent: 90 }

    await persistenceActivities.saveCourseActivity({
      courseId: input.courseId,
      userId: input.userId,
      course,
      topic: input.topic,
    })

    await startChild(verifyCourseWorkflow, {
      workflowId: `verify-${input.courseId}`,
      args: [{ courseId: input.courseId, course }],
      parentClosePolicy: ParentClosePolicy.ABANDON,
    })

    progress = {
      ...progress,
      phase: 'complete',
      percent: 100,
      courseId: input.courseId,
    }

    return input.courseId
  } catch (err) {
    if (progress.phase !== 'failed') {
      progress = {
        ...progress,
        phase: 'failed',
        error:
          err instanceof Error
            ? err.message
            : 'An unexpected error occurred during course generation',
      }
    }
    throw err
  }
}
