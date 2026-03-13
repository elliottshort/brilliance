'use client'

import type { ScreenResult } from '@/components/screens/screen-renderer'

export interface AdaptationContext {
  courseId: string
  lessonId: string
  screenId: string
  screenData: {
    type: string
    title: string
    explanation?: string
    hints?: string[]
  }
  userAnswer?: string
  correctAnswer?: string
  attemptCount?: number
}

export interface DifficultyRecommendation {
  recommendation: 'continue' | 'review' | 'skip'
  message: string
  targetLessonId?: string
}

export async function requestHint(context: AdaptationContext): Promise<string> {
  const staticHint =
    context.screenData.hints?.[0] ?? 'Try re-reading the question carefully.'

  try {
    const res = await fetch('/api/adapt/hint', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        courseId: context.courseId,
        lessonId: context.lessonId,
        screenId: context.screenId,
        userAnswer: context.userAnswer ?? '',
        screenData: {
          type: context.screenData.type,
          title: context.screenData.title,
          explanation: context.screenData.explanation,
          hints: context.screenData.hints,
        },
      }),
    })

    if (!res.ok) return staticHint

    const data = (await res.json()) as { hint?: string }
    return data.hint ?? staticHint
  } catch {
    return staticHint
  }
}

export async function requestExplanation(
  context: AdaptationContext,
): Promise<string> {
  const staticExplanation =
    context.screenData.explanation ?? 'Review the material and try again.'

  try {
    const res = await fetch('/api/adapt/explain', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        courseId: context.courseId,
        lessonId: context.lessonId,
        screenId: context.screenId,
        userAnswer: context.userAnswer ?? '',
        correctAnswer: context.correctAnswer ?? '',
        screenData: {
          type: context.screenData.type,
          title: context.screenData.title,
          explanation: context.screenData.explanation,
        },
      }),
    })

    if (!res.ok) return staticExplanation

    const data = (await res.json()) as { explanation?: string }
    return data.explanation ?? staticExplanation
  } catch {
    return staticExplanation
  }
}

const FALLBACK_RECOMMENDATION: DifficultyRecommendation = {
  recommendation: 'continue',
  message: 'Keep going!',
}

export async function assessDifficulty(
  courseId: string,
  lessonId: string,
  recentResults: ScreenResult[],
): Promise<DifficultyRecommendation> {
  if (recentResults.length === 0) return FALLBACK_RECOMMENDATION

  try {
    const res = await fetch('/api/adapt/difficulty', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ courseId, lessonId, recentResults }),
    })

    if (!res.ok) return FALLBACK_RECOMMENDATION

    const data = (await res.json()) as Partial<DifficultyRecommendation>
    return {
      recommendation: data.recommendation ?? 'continue',
      message: data.message ?? 'Keep going!',
      targetLessonId: data.targetLessonId,
    }
  } catch {
    return FALLBACK_RECOMMENDATION
  }
}
