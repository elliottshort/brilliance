import type { Course, Screen } from '../lib/schemas/content'

export const PROGRESS_QUERY = 'getProgress'

export type GenerationPhase =
  | 'pending'
  | 'researching'
  | 'skeleton'
  | 'generating_lessons'
  | 'validating'
  | 'saving'
  | 'verifying'
  | 'complete'
  | 'failed'

export interface CourseGenerationProgress {
  phase: GenerationPhase
  percent: number
  preview: {
    title: string
    description: string
    moduleCount: number
  } | null
  courseId: string | null
  error: string | null
  completedLessons: number
  totalLessons: number
}

export interface CourseGenerationInput {
  courseId: string
  topic: string
  interviewSummary: string
  userId: string
}

export interface LessonGenerationInput {
  courseId: string
  topic: string
  interviewSummary: string
  lesson: {
    moduleTitle: string
    lessonId: string
    lessonTitle: string
    lessonDescription: string
    screenCount: number
    primaryConcept: string
    weavedConcepts: string[]
    lessonIndex: number
    totalLessons: number
  }
  allLessons: Array<{
    moduleTitle: string
    lessonId: string
    lessonTitle: string
    lessonDescription: string
    screenCount: number
    primaryConcept: string
    weavedConcepts: string[]
    lessonIndex: number
    totalLessons: number
  }>
}

export interface LessonGenerationResult {
  lessonId: string
  screens: Screen[]
}

export interface VerificationInput {
  courseId: string
  course: Course
}

export interface SkeletonModule {
  id: string
  title: string
  description: string
  lessons: SkeletonLesson[]
}

export interface SkeletonLesson {
  id: string
  title: string
  description: string
  screenCount: number
  primaryConcept: string
  weavedConcepts: string[]
}

export interface CourseSkeleton {
  title: string
  description: string
  coverImage?: string
  modules: SkeletonModule[]
}

export interface ResearchSummary {
  summary: string
  keyConcepts: string[]
  commonMisconceptions: string[]
  prerequisites: string[]
  teachingApproaches: string[]
}

export interface ValidationResult {
  valid: boolean
  errors: string[]
}
