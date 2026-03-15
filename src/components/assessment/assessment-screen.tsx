'use client'

import { useRef } from 'react'
import { ScreenRenderer, type ScreenResult } from '@/components/screens/screen-renderer'
import type { Screen } from '@/lib/schemas/content'
import type { AssessmentResponse } from '@/lib/schemas/assessment'

interface AssessmentScreenProps {
  screen: Screen
  onComplete: (response: AssessmentResponse) => void
}

export function AssessmentScreen({ screen, onComplete }: AssessmentScreenProps) {
  const startTimeRef = useRef(Date.now())

  const handleComplete = (result?: ScreenResult) => {
    onComplete({
      puzzleId: screen.id,
      puzzleType: screen.type,
      response: result ? {
        answeredCorrectly: result.answeredCorrectly,
        attempts: result.attempts,
      } : {},
      responseTimeMs: Date.now() - startTimeRef.current,
      hintsUsed: result?.hintsUsed ?? 0,
      correct: result?.answeredCorrectly ?? null,
    })
  }

  return (
    <ScreenRenderer
      screen={screen}
      onComplete={handleComplete}
    />
  )
}
