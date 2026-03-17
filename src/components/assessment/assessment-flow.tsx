'use client'

import { useReducer, useCallback, useEffect, useRef } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { Loader2, AlertCircle, RefreshCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import {
  assessmentReducer,
  createInitialState,
  getCurrentPuzzle,
} from '@/lib/assessment/state-machine'
import { fetchPuzzles } from '@/lib/assessment/api'
import { ConceptSort } from './concept-sort'
import { ConfidenceProbe } from './confidence-probe'
import { WhatHappensNext } from './what-happens-next'
import { AssessmentScreen } from './assessment-screen'
import { ProfileReveal } from './profile-reveal'
import type { AssessmentResponse, LearnerProfile, AssessmentPuzzle } from '@/lib/schemas/assessment'
import type { Screen } from '@/lib/schemas/content'

interface PuzzleResponse {
  puzzles: AssessmentPuzzle[]
}

interface AssessmentFlowProps {
  topic: string
  onComplete: (profile: LearnerProfile) => void
  onError?: (error: string) => void
  prefetchedAct1?: Promise<PuzzleResponse> | null
  prefetchedAct2?: Promise<PuzzleResponse> | null
}

const slideVariants = {
  enter: { x: 300, opacity: 0 },
  center: { x: 0, opacity: 1 },
  exit: { x: -300, opacity: 0 },
}

const slideTransition = {
  x: { type: 'spring' as const, stiffness: 300, damping: 30 },
  opacity: { duration: 0.2 },
}

const slideTransitionReduced = {
  x: { duration: 0 },
  opacity: { duration: 0 },
}

export function AssessmentFlow({
  topic,
  onComplete,
  onError,
  prefetchedAct1,
  prefetchedAct2,
}: AssessmentFlowProps) {
  const prefersReduced = useReducedMotion() ?? false
  const [state, dispatch] = useReducer(assessmentReducer, createInitialState(topic))
  const hasGeneratedRef = useRef(false)

  useEffect(() => {
    if (state.phase === 'generating_puzzles' && !hasGeneratedRef.current) {
      hasGeneratedRef.current = true
      generatePuzzles()
    }
  }, [state.phase])

  useEffect(() => {
    if (state.phase === 'generating_profile') {
      generateProfile()
    }
  }, [state.phase])

  async function generatePuzzles() {
    const act1Promise = prefetchedAct1 ?? fetchPuzzles(state.topic, 1)
    const act2Promise = prefetchedAct2 ?? fetchPuzzles(state.topic, 2)

    act2Promise
      .then((data) => dispatch({ type: 'ACT2_PUZZLES_RECEIVED', puzzles: data.puzzles }))
      .catch((err) => console.error('Act 2 puzzle generation failed:', err))

    try {
      const act1Data = await act1Promise
      dispatch({ type: 'ACT1_PUZZLES_RECEIVED', puzzles: act1Data.puzzles })
    } catch (err) {
      dispatch({
        type: 'SET_ERROR',
        error: err instanceof Error ? err.message : 'Failed to generate assessment',
      })
    }
  }

  async function generateProfile() {
    try {
      const res = await fetch('/api/courses/generate/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: state.topic,
          puzzles: state.puzzles,
          responses: state.responses,
        }),
      })
      if (!res.ok) throw new Error('Failed to generate profile')
      const data = await res.json()
      dispatch({ type: 'PROFILE_GENERATED', profile: data.profile })
    } catch (err) {
      dispatch({
        type: 'SET_ERROR',
        error: err instanceof Error ? err.message : 'Failed to generate profile',
      })
    }
  }

  const handlePuzzleComplete = useCallback((response: AssessmentResponse) => {
    dispatch({ type: 'RECORD_RESPONSE', response })
    dispatch({ type: 'NEXT_PUZZLE' })
  }, [])

  const handleProfileContinue = useCallback(() => {
    if (state.profile) {
      dispatch({ type: 'COMPLETE' })
      onComplete(state.profile)
    }
  }, [state.profile, onComplete])

  const handleRetry = useCallback(() => {
    hasGeneratedRef.current = false
    dispatch({ type: 'RETRY' })
  }, [])

  const currentPuzzle = getCurrentPuzzle(state)
  const totalPuzzles = state.puzzles.length
  const progressText =
    totalPuzzles > 0
      ? `${Math.min(state.currentPuzzleIndex + 1, totalPuzzles)} of ${totalPuzzles}`
      : ''

  function renderContent() {
    switch (state.phase) {
      case 'generating_puzzles':
        return (
          <div
            key="loading-puzzles"
            className="flex flex-col items-center justify-center gap-4 py-16"
          >
            <Loader2 className="h-8 w-8 animate-spin text-primary/60" />
            <p className="text-sm text-muted-foreground">Preparing your experience...</p>
          </div>
        )

      case 'act1':
      case 'act2':
        if (!currentPuzzle) return null
        switch (currentPuzzle.type) {
          case 'concept_sort':
            return (
              <ConceptSort
                key={currentPuzzle.id}
                puzzle={currentPuzzle}
                onComplete={handlePuzzleComplete}
              />
            )
          case 'confidence_probe':
            return (
              <ConfidenceProbe
                key={currentPuzzle.id}
                puzzle={currentPuzzle}
                onComplete={handlePuzzleComplete}
              />
            )
          case 'what_happens_next':
            return (
              <WhatHappensNext
                key={currentPuzzle.id}
                puzzle={currentPuzzle}
                onComplete={handlePuzzleComplete}
              />
            )
          case 'multiple_choice':
          case 'fill_in_blank':
          case 'ordering':
          case 'code_block':
            return (
              <AssessmentScreen
                key={currentPuzzle.id}
                screen={currentPuzzle as unknown as Screen}
                onComplete={handlePuzzleComplete}
              />
            )
          default:
            return null
        }

      case 'awaiting_act2':
        return (
          <div
            key="loading-act2"
            className="flex flex-col items-center justify-center gap-4 py-16"
          >
            <Loader2 className="h-8 w-8 animate-spin text-primary/60" />
            <p className="text-sm text-muted-foreground">Preparing the next set of challenges...</p>
          </div>
        )

      case 'generating_profile':
        return (
          <div
            key="loading-profile"
            className="flex flex-col items-center justify-center gap-4 py-16"
          >
            <Loader2 className="h-8 w-8 animate-spin text-primary/60" />
            <p className="text-sm text-muted-foreground">Understanding how you think...</p>
          </div>
        )

      case 'act3':
        if (!state.profile) return null
        return (
          <ProfileReveal
            key="profile"
            profile={state.profile}
            onContinue={handleProfileContinue}
          />
        )

      case 'error':
        return (
          <div
            key="error"
            className="flex flex-col items-center justify-center gap-4 py-16"
          >
            <AlertCircle className="h-8 w-8 text-destructive/60" />
            <p className="text-sm text-muted-foreground text-center max-w-xs">
              {state.error || 'Something went wrong'}
            </p>
            <Button variant="outline" onClick={handleRetry} className="gap-2">
              <RefreshCcw className="h-4 w-4" />
              Try Again
            </Button>
          </div>
        )

      default:
        return null
    }
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-6">
      {(state.phase === 'act1' || state.phase === 'act2') && totalPuzzles > 0 && (
        <div className="mb-6 flex items-center justify-center">
          <span className="text-xs text-muted-foreground">{progressText}</span>
          <div className="ml-3 flex gap-1">
            {state.puzzles.map((_, i) => (
              <div
                key={i}
                className={cn(
                  'h-1.5 w-1.5 rounded-full transition-colors',
                  i < state.currentPuzzleIndex
                    ? 'bg-primary'
                    : i === state.currentPuzzleIndex
                      ? 'bg-primary'
                      : 'bg-muted-foreground/20'
                )}
              />
            ))}
          </div>
        </div>
      )}

      <AnimatePresence mode="wait" custom={1}>
        <motion.div
          key={
            state.phase === 'act1' || state.phase === 'act2'
              ? currentPuzzle?.id
              : state.phase
          }
          variants={slideVariants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={prefersReduced ? slideTransitionReduced : slideTransition}
        >
          {renderContent()}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
