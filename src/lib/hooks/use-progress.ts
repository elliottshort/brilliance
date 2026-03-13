'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { useSession } from 'next-auth/react'
import { toast } from 'sonner'

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
  const { status } = useSession()
  const [progress, setProgress] = useState<CourseProgress>(makeInitialProgress(courseId))
  const [loading, setLoading] = useState(true)
  const progressRef = useRef(progress)
  progressRef.current = progress

  useEffect(() => {
    if (status === 'loading') return

    if (status === 'unauthenticated') {
      setLoading(false)
      return
    }

    let cancelled = false
    async function fetchProgress() {
      try {
        const res = await fetch(`/api/progress?courseId=${encodeURIComponent(courseId)}`)
        if (cancelled) return

        if (res.ok) {
          const data = await res.json()
          setProgress(data)
        } else if (res.status === 401) {
          toast.error('Session expired. Please sign in again to track progress.')
        }
      } catch {
        toast.error('Could not load progress')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    fetchProgress()
    return () => { cancelled = true }
  }, [courseId, status])

  const markScreenComplete = useCallback(
    async (lessonId: string, screenId: string, result: ScreenResult) => {
      const prev = progressRef.current

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

      try {
        const res = await fetch('/api/progress', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            courseId,
            lessonId,
            action: {
              type: 'screen_complete',
              screenId,
              answeredCorrectly: result.answeredCorrectly,
              attempts: result.attempts,
              hintsUsed: result.hintsUsed,
            },
          }),
        })
        if (!res.ok) {
          setProgress(prev)
          toast.error('Failed to save progress')
        }
      } catch {
        setProgress(prev)
        toast.error('Failed to save progress')
      }
    },
    [courseId]
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

      // Fire-and-forget — do NOT block UI
      fetch('/api/progress', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          courseId,
          lessonId,
          action: {
            type: 'update_index',
            currentScreenIndex: screenIndex,
          },
        }),
      })
    },
    [courseId]
  )

  const markLessonComplete = useCallback(
    async (lessonId: string) => {
      const prev = progressRef.current

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

      try {
        const res = await fetch('/api/progress', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            courseId,
            lessonId,
            action: { type: 'lesson_complete' },
          }),
        })
        if (!res.ok) {
          setProgress(prev)
          toast.error('Failed to save progress')
        }
      } catch {
        setProgress(prev)
        toast.error('Failed to save progress')
      }
    },
    [courseId]
  )

  const resetProgress = useCallback(() => {
    setProgress(makeInitialProgress(courseId))
  }, [courseId])

  return {
    progress,
    loading,
    markScreenComplete,
    getScreenResult,
    getLessonProgress,
    getCourseCompletionPercent,
    updateCurrentScreenIndex,
    markLessonComplete,
    resetProgress,
  }
}
