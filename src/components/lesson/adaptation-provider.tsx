'use client'

import { createContext, useContext, useState, useCallback, useMemo } from 'react'
import type { ReactNode } from 'react'
import {
  requestHint as engineRequestHint,
  requestExplanation as engineRequestExplanation,
  assessDifficulty as engineAssessDifficulty,
  type AdaptationContext,
  type DifficultyRecommendation,
} from '@/lib/adaptation/engine'
import type { ScreenResult } from '@/components/screens/screen-renderer'

interface AdaptationValue {
  requestHint: (context: AdaptationContext) => Promise<string>
  requestExplanation: (context: AdaptationContext) => Promise<string>
  assessDifficulty: (recentResults: ScreenResult[]) => Promise<DifficultyRecommendation>
  isLoading: boolean
}

const AdaptationContext = createContext<AdaptationValue | null>(null)

interface AdaptationProviderProps {
  courseId: string
  lessonId: string
  children: ReactNode
}

export function AdaptationProvider({
  courseId,
  lessonId,
  children,
}: AdaptationProviderProps) {
  const [loadingCount, setLoadingCount] = useState(0)

  const withLoading = useCallback(
    async <T,>(fn: () => Promise<T>): Promise<T> => {
      setLoadingCount((c) => c + 1)
      try {
        return await fn()
      } finally {
        setLoadingCount((c) => c - 1)
      }
    },
    [],
  )

  const requestHint = useCallback(
    (context: AdaptationContext) =>
      withLoading(() => engineRequestHint(context)),
    [withLoading],
  )

  const requestExplanation = useCallback(
    (context: AdaptationContext) =>
      withLoading(() => engineRequestExplanation(context)),
    [withLoading],
  )

  const assessDifficulty = useCallback(
    (recentResults: ScreenResult[]) =>
      withLoading(() =>
        engineAssessDifficulty(courseId, lessonId, recentResults),
      ),
    [withLoading, courseId, lessonId],
  )

  const value = useMemo<AdaptationValue>(
    () => ({
      requestHint,
      requestExplanation,
      assessDifficulty,
      isLoading: loadingCount > 0,
    }),
    [requestHint, requestExplanation, assessDifficulty, loadingCount],
  )

  return (
    <AdaptationContext.Provider value={value}>
      {children}
    </AdaptationContext.Provider>
  )
}

export function useAdaptation(): AdaptationValue {
  const ctx = useContext(AdaptationContext)
  if (!ctx) {
    throw new Error('useAdaptation must be used within an AdaptationProvider')
  }
  return ctx
}
