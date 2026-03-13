import { z } from 'zod'

export const ScreenResultSchema = z.object({
  screenId: z
    .string()
    .describe('The screen ID this result corresponds to — must match a screen.id in the lesson'),
  answeredCorrectly: z
    .boolean()
    .describe('Whether the learner answered correctly on their final attempt'),
  attempts: z
    .number()
    .int()
    .min(0)
    .describe('Total number of attempts the learner made on this screen'),
  hintsUsed: z
    .number()
    .int()
    .min(0)
    .describe('Number of progressive hints the learner revealed (0-3)'),
  answeredAt: z
    .string()
    .describe('ISO 8601 timestamp of when the learner last answered, e.g. "2026-03-13T10:30:00.000Z"'),
})

export const LessonProgressSchema = z.object({
  lessonId: z
    .string()
    .describe('The lesson ID this progress record tracks — must match a lesson.id in the course'),
  currentScreenIndex: z
    .number()
    .int()
    .min(0)
    .describe('Zero-based index of the screen the learner is currently on'),
  screenResults: z
    .record(z.string(), ScreenResultSchema)
    .describe('Map of screenId → ScreenResult for all attempted screens in this lesson'),
  startedAt: z
    .string()
    .describe('ISO 8601 timestamp of when the learner first opened this lesson'),
  completedAt: z
    .string()
    .optional()
    .describe('ISO 8601 timestamp of when the learner completed all screens. Undefined if not yet completed.'),
})

export const CourseProgressSchema = z.object({
  courseId: z
    .string()
    .describe('The course ID this progress record tracks — must match a course.id'),
  lessonProgress: z
    .record(z.string(), LessonProgressSchema)
    .describe('Map of lessonId → LessonProgress for all started lessons in this course'),
  lastAccessedAt: z
    .string()
    .describe('ISO 8601 timestamp of the most recent interaction with this course'),
})

export type ScreenResult = z.infer<typeof ScreenResultSchema>
export type LessonProgress = z.infer<typeof LessonProgressSchema>
export type CourseProgress = z.infer<typeof CourseProgressSchema>

export const ProgressGetQuerySchema = z.object({
  courseId: z
    .string()
    .min(1)
    .describe('Course identifier'),
})

const ScreenCompleteAction = z.object({
  type: z
    .literal('screen_complete'),
  screenId: z
    .string()
    .min(1)
    .describe('Screen identifier'),
  answeredCorrectly: z
    .boolean()
    .describe('Whether the answer was correct'),
  attempts: z
    .number()
    .int()
    .min(1)
    .describe('Number of attempts'),
  hintsUsed: z
    .number()
    .int()
    .min(0)
    .describe('Number of hints used'),
})

const UpdateIndexAction = z.object({
  type: z
    .literal('update_index'),
  currentScreenIndex: z
    .number()
    .int()
    .min(0)
    .describe('Current screen position'),
})

const LessonCompleteAction = z.object({
  type: z
    .literal('lesson_complete'),
})

export const ProgressPutBodySchema = z.object({
  courseId: z
    .string()
    .min(1)
    .describe('Course identifier'),
  lessonId: z
    .string()
    .min(1)
    .describe('Lesson identifier'),
  action: z
    .discriminatedUnion('type', [
      ScreenCompleteAction,
      UpdateIndexAction,
      LessonCompleteAction,
    ])
    .describe('The progress action to perform'),
})

export type ProgressGetQuery = z.infer<typeof ProgressGetQuerySchema>
export type ProgressPutBody = z.infer<typeof ProgressPutBodySchema>
