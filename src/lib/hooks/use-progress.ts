'use client'

import { useCallback } from 'react'
import { useStickyState } from './use-sticky-state'

type ScreenResult = {
  screenId: string
  answeredCorrectly: boolean
  attempts: number
  hintsUsed: number
  answeredAt: string
}

type LessonProgress = {
  lessonId: string
  currentScreenIndex: number
  screenResults: Record<string, ScreenResult>
  startedAt: string
  completedAt?: string
}

type CourseProgress = {
  courseId: string
  lessonProgress: Record<string, LessonProgress>
  lastAccessedAt: string
}

function makeInitialProgress(courseId: string): CourseProgress {
  return {
    courseId,
    lessonProgress: {},
    lastAccessedAt: new Date().toISOString(),
  }
}

export function useProgress(courseId: string) {
  const storageKey = `brilliance-progress-${courseId}`
  const [progress, setProgress] = useStickyState<CourseProgress>(
    storageKey,
    makeInitialProgress(courseId)
  )

  const markScreenComplete = useCallback(
    (lessonId: string, screenId: string, result: ScreenResult) => {
      setProgress((prev) => {
        const existingLesson = prev.lessonProgress[lessonId]
        const updatedLesson: LessonProgress = existingLesson
          ? {
              ...existingLesson,
              screenResults: {
                ...existingLesson.screenResults,
                [screenId]: result,
              },
            }
          : {
              lessonId,
              currentScreenIndex: 0,
              screenResults: { [screenId]: result },
              startedAt: new Date().toISOString(),
            }

        return {
          ...prev,
          lastAccessedAt: new Date().toISOString(),
          lessonProgress: {
            ...prev.lessonProgress,
            [lessonId]: updatedLesson,
          },
        }
      })
    },
    [setProgress]
  )

  const getScreenResult = useCallback(
    (lessonId: string, screenId: string): ScreenResult | null => {
      return progress.lessonProgress[lessonId]?.screenResults[screenId] ?? null
    },
    [progress]
  )

  const getLessonProgress = useCallback(
    (lessonId: string): LessonProgress | null => {
      return progress.lessonProgress[lessonId] ?? null
    },
    [progress]
  )

  const getCourseCompletionPercent = useCallback(
    (totalScreens: number): number => {
      if (totalScreens === 0) return 0
      const completedScreens = Object.values(progress.lessonProgress).reduce(
        (sum, lesson) => sum + Object.keys(lesson.screenResults).length,
        0
      )
      return Math.min(100, Math.round((completedScreens / totalScreens) * 100))
    },
    [progress]
  )

  const updateCurrentScreenIndex = useCallback(
    (lessonId: string, screenIndex: number) => {
      setProgress((prev) => {
        const existing = prev.lessonProgress[lessonId]
        return {
          ...prev,
          lastAccessedAt: new Date().toISOString(),
          lessonProgress: {
            ...prev.lessonProgress,
            [lessonId]: existing
              ? { ...existing, currentScreenIndex: screenIndex }
              : {
                  lessonId,
                  currentScreenIndex: screenIndex,
                  screenResults: {},
                  startedAt: new Date().toISOString(),
                },
          },
        }
      })
    },
    [setProgress]
  )

  const markLessonComplete = useCallback(
    (lessonId: string) => {
      setProgress((prev) => {
        const existing = prev.lessonProgress[lessonId]
        if (!existing) return prev
        return {
          ...prev,
          lastAccessedAt: new Date().toISOString(),
          lessonProgress: {
            ...prev.lessonProgress,
            [lessonId]: {
              ...existing,
              completedAt: new Date().toISOString(),
            },
          },
        }
      })
    },
    [setProgress]
  )

  const resetProgress = useCallback(() => {
    setProgress(makeInitialProgress(courseId))
  }, [courseId, setProgress])

  return {
    progress,
    markScreenComplete,
    getScreenResult,
    getLessonProgress,
    getCourseCompletionPercent,
    updateCurrentScreenIndex,
    markLessonComplete,
    resetProgress,
  }
}
