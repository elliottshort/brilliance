'use client'

import { useCallback, useEffect, useMemo, useReducer, useState } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { ArrowLeft, ArrowRight, ChevronLeft, Sparkles, Volume2, VolumeX } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { ProgressBar } from './progress-bar'
import { ScreenRenderer, type ScreenResult } from '@/components/screens/screen-renderer'
import { useProgress } from '@/lib/hooks/use-progress'
import { useSound } from '@/lib/hooks/use-sound'
import { cn } from '@/lib/utils'
import { AdaptationProvider } from './adaptation-provider'
import { AskAiDrawer } from './ask-ai-drawer'
import type { Lesson, Screen } from '@/lib/schemas/content'

function getScreenData(screen: Screen) {
  const base = { type: screen.type, title: screen.title }
  switch (screen.type) {
    case 'explanation':
      return { ...base, content: screen.content }
    case 'multiple_choice':
      return { ...base, explanation: screen.explanation }
    case 'fill_in_blank':
      return { ...base, content: screen.prompt, explanation: screen.explanation }
    case 'ordering':
      return { ...base, explanation: screen.explanation }
    case 'code_block':
      return { ...base, content: screen.starterCode, explanation: screen.explanation }
    case 'matching':
      return { ...base, explanation: screen.explanation }
    case 'categorization':
      return { ...base, explanation: screen.explanation }
    case 'hotspot':
      return { ...base, explanation: screen.explanation }
    case 'diagram_label':
      return { ...base, explanation: screen.explanation }
    case 'interactive_graph':
      return { ...base, explanation: screen.explanation }
    case 'number_line':
      return { ...base, explanation: screen.explanation }
    case 'pattern_builder':
      return { ...base, explanation: screen.explanation }
    case 'process_stepper':
      return { ...base, explanation: screen.explanation }
    case 'simulation':
      return { ...base, explanation: screen.explanation }
    case 'block_coding':
      return { ...base, explanation: screen.explanation }
  }
}

interface LessonPlayerProps {
  lesson: Lesson
  courseId: string
  nextLesson?: { id: string; title: string } | null
  learnerProfile?: Record<string, unknown> | null
}

function AnimatedCheckmark({ reduced }: { reduced: boolean }) {
  return (
    <svg
      viewBox="0 0 52 52"
      className="h-10 w-10"
      fill="none"
      stroke="currentColor"
      strokeWidth={3.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <motion.path
        d="M14 27l8 8 16-16"
        className="text-emerald-600 dark:text-emerald-400"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={
          reduced
            ? { duration: 0 }
            : { pathLength: { duration: 0.5, delay: 0.3, ease: 'easeOut' }, opacity: { duration: 0.1, delay: 0.3 } }
        }
      />
    </svg>
  )
}

const slideVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 300 : -300,
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
  },
  exit: (direction: number) => ({
    x: direction > 0 ? -300 : 300,
    opacity: 0,
  }),
}

const slideTransition = {
  x: { type: 'spring' as const, stiffness: 300, damping: 30 },
  opacity: { duration: 0.2 },
}

const slideTransitionReduced = {
  x: { duration: 0 },
  opacity: { duration: 0 },
}

export function LessonPlayer({ lesson, courseId, nextLesson, learnerProfile }: LessonPlayerProps) {
  const prefersReduced = useReducedMotion() ?? false
  const { playComplete, soundEnabled, toggleSound } = useSound()
  const [consecutiveFailures, setConsecutiveFailures] = useState(0)

  const {
    loading: progressLoading,
    markScreenComplete,
    getLessonProgress,
    updateCurrentScreenIndex,
    markLessonComplete,
  } = useProgress(courseId)

  type PlayerState = {
    currentIndex: number
    isComplete: boolean
    direction: number
    results: ScreenResult[]
    initialized: boolean
  }

  type PlayerAction =
    | { type: 'RESTORE'; index: number; results: ScreenResult[] }
    | { type: 'INIT' }
    | { type: 'SCREEN_COMPLETE'; result: ScreenResult }
    | { type: 'ADVANCE'; nextIndex: number }
    | { type: 'BACK' }
    | { type: 'COMPLETE' }

  const [state, dispatch] = useReducer(
    (prev: PlayerState, action: PlayerAction): PlayerState => {
      switch (action.type) {
        case 'RESTORE':
          return { ...prev, currentIndex: action.index, results: action.results }
        case 'INIT':
          return { ...prev, initialized: true }
        case 'SCREEN_COMPLETE': {
          const idx = prev.results.findIndex((r) => r.screenId === action.result.screenId)
          const results = idx >= 0
            ? prev.results.map((r, i) => (i === idx ? action.result : r))
            : [...prev.results, action.result]
          return { ...prev, results }
        }
        case 'ADVANCE':
          return { ...prev, direction: 1, currentIndex: action.nextIndex }
        case 'BACK':
          if (prev.currentIndex <= 0) return prev
          return { ...prev, direction: -1, currentIndex: prev.currentIndex - 1 }
        case 'COMPLETE':
          return { ...prev, isComplete: true }
      }
    },
    { currentIndex: 0, isComplete: false, direction: 1, results: [], initialized: false }
  )

  useEffect(() => {
    if (progressLoading || state.initialized) return
    const saved = getLessonProgress(lesson.id)
    if (saved) {
      const idx = saved.currentScreenIndex
      const prior = Object.values(saved.screenResults) as ScreenResult[]
      if (idx < lesson.screens.length) {
        dispatch({ type: 'RESTORE', index: idx, results: prior })
      } else {
        dispatch({ type: 'RESTORE', index: 0, results: prior })
      }
    }
    dispatch({ type: 'INIT' })
  }, [progressLoading, state.initialized, getLessonProgress, lesson.id, lesson.screens.length])

  useEffect(() => {
    if (state.isComplete) {
      playComplete()
    }
  }, [state.isComplete, playComplete])

  const totalScreens = lesson.screens.length
  const currentScreen = lesson.screens[state.currentIndex]
  const screenData = useMemo(() => getScreenData(currentScreen), [currentScreen])
  const isReadOnly = !!state.results.find((r) => r.screenId === currentScreen.id)
  const currentResult = state.results.find((r) => r.screenId === currentScreen.id)
  const screenAttempts = currentResult
    ? { attempts: currentResult.attempts, hintsUsed: currentResult.hintsUsed }
    : undefined

  const handleScreenComplete = useCallback(
    (result?: ScreenResult) => {
      if (result) {
        markScreenComplete(lesson.id, result.screenId, result)
        dispatch({ type: 'SCREEN_COMPLETE', result })

        if (result.answeredCorrectly) {
          setConsecutiveFailures(0)
        } else {
          setConsecutiveFailures((prev) => prev + 1)
        }
      }

      if (state.currentIndex >= totalScreens - 1) {
        markLessonComplete(lesson.id)
        dispatch({ type: 'COMPLETE' })
        return
      }

      const nextIndex = state.currentIndex + 1
      dispatch({ type: 'ADVANCE', nextIndex })
      updateCurrentScreenIndex(lesson.id, nextIndex)
    },
    [
      state.currentIndex,
      totalScreens,
      lesson.id,
      markScreenComplete,
      updateCurrentScreenIndex,
      markLessonComplete,
    ]
  )

  const handleBack = useCallback(() => {
    if (state.currentIndex <= 0) return
    setConsecutiveFailures(0)
    dispatch({ type: 'BACK' })
    updateCurrentScreenIndex(lesson.id, state.currentIndex - 1)
  }, [state.currentIndex, lesson.id, updateCurrentScreenIndex])

  if (progressLoading || !state.initialized) {
    return (
      <div className="mx-auto max-w-3xl px-4 pt-10">
        {/* Progress bar skeleton */}
        <Skeleton className="h-2 w-full rounded-full" />
        {/* Screen content skeleton */}
        <div className="mt-8 rounded-2xl border border-[var(--glass-border)] bg-card p-8">
          <Skeleton className="h-7 w-3/5" />           {/* Title */}
          <Skeleton className="mt-4 h-4 w-full" />      {/* Content line 1 */}
          <Skeleton className="mt-3 h-4 w-4/5" />       {/* Content line 2 */}
          <Skeleton className="mt-3 h-4 w-3/4" />       {/* Content line 3 */}
          <Skeleton className="mt-8 h-10 w-32" />        {/* Button */}
        </div>
      </div>
    )
  }

  const interactiveResults = state.results.filter((r) => r.attempts > 0)
  const correctCount = interactiveResults.filter(
    (r) => r.answeredCorrectly
  ).length
  const totalHints = state.results.reduce((sum, r) => sum + r.hintsUsed, 0)

  if (state.isComplete) {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-2xl flex-col items-center justify-center px-4 sm:px-6">
        <div className="relative mb-6">
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={
              prefersReduced
                ? { duration: 0 }
                : { type: 'spring', stiffness: 200, damping: 12, delay: 0.1 }
            }
            className={cn(
              'flex h-20 w-20 items-center justify-center rounded-full',
              'bg-emerald-100 dark:bg-emerald-950/40'
            )}
          >
            <AnimatedCheckmark reduced={prefersReduced} />
          </motion.div>

          {!prefersReduced && (
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: [0.8, 1.6, 1.8], opacity: [0.4, 0.15, 0] }}
              transition={{ duration: 1.2, delay: 0.5, ease: 'easeOut' }}
              className="pointer-events-none absolute inset-0 rounded-full border-2 border-emerald-400 dark:border-emerald-500"
            />
          )}
        </div>

        <motion.h2
          initial={{ opacity: 0, scale: 0.7 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={
            prefersReduced
              ? { duration: 0 }
              : { type: 'spring', stiffness: 300, damping: 15, delay: 0.35 }
          }
          className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl"
        >
          {nextLesson ? 'Lesson Complete!' : 'Course Complete!'}
        </motion.h2>

        <motion.p
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={prefersReduced ? { duration: 0 } : { delay: 0.5, duration: 0.4 }}
          className="mt-2 text-center text-muted-foreground"
        >
          You finished <span className="font-medium text-foreground">{lesson.title}</span>
        </motion.p>

        {interactiveResults.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={prefersReduced ? { duration: 0 } : { delay: 0.65, duration: 0.4 }}
            className={cn(
              'mt-8 w-full max-w-sm rounded-xl border border-[var(--glass-border)]',
              'bg-[var(--glass-bg)] p-5 backdrop-blur-sm'
            )}
          >
            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
              <Sparkles className="h-4 w-4 text-amber-500" />
              Results
            </div>
            <div className="mt-4 grid grid-cols-2 gap-4">
              <div>
                <p className="text-2xl font-bold text-foreground">
                  {correctCount}/{interactiveResults.length}
                </p>
                <p className="text-xs text-muted-foreground">Correct answers</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">
                  {totalHints}
                </p>
                <p className="text-xs text-muted-foreground">
                  Hint{totalHints !== 1 ? 's' : ''} used
                </p>
              </div>
            </div>
          </motion.div>
        )}

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={prefersReduced ? { duration: 0 } : { delay: 0.85 }}
          className="mt-8 flex flex-col items-center gap-3 sm:flex-row"
        >
          {nextLesson && (
            <Button asChild size="lg" className="gap-2">
              <Link href={`/courses/${courseId}/lessons/${nextLesson.id}`}>
                Next Lesson: {nextLesson.title}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          )}
          <Button asChild size="lg" variant="outline" className="gap-2">
            <Link href={`/courses/${courseId}`}>
              <ArrowLeft className="h-4 w-4" />
              Back to Course
            </Link>
          </Button>
        </motion.div>
      </div>
    )
  }

  return (
    <AdaptationProvider courseId={courseId} lessonId={lesson.id}>
      <div className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-6 lg:max-w-4xl">
        <div className="mb-8 flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            className={cn('h-8 w-8 shrink-0', state.currentIndex === 0 && 'invisible')}
            onClick={handleBack}
            aria-label="Go back"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <ProgressBar
            current={state.currentIndex + 1}
            total={totalScreens}
            className="flex-1"
          />
          <button
            type="button"
            onClick={toggleSound}
            aria-label={soundEnabled ? 'Mute sounds' : 'Unmute sounds'}
            className="shrink-0 rounded-md p-1.5 text-muted-foreground/60 transition-colors hover:bg-muted hover:text-muted-foreground"
          >
            {soundEnabled ? (
              <Volume2 className="h-4 w-4" />
            ) : (
              <VolumeX className="h-4 w-4" />
            )}
          </button>
        </div>

        <AnimatePresence mode="wait" custom={state.direction}>
          <motion.div
            key={currentScreen.id}
            custom={state.direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={prefersReduced ? slideTransitionReduced : slideTransition}
          >
            <ScreenRenderer
              screen={currentScreen}
              onComplete={handleScreenComplete}
              readOnly={isReadOnly}
              courseId={courseId}
              lessonId={lesson.id}
            />
            {isReadOnly && (
              <div className="flex justify-center mt-4">
                <Button
                  onClick={() => {
                    setConsecutiveFailures(0)
                    if (state.currentIndex >= totalScreens - 1) {
                      dispatch({ type: 'COMPLETE' })
                    } else {
                      const nextIndex = state.currentIndex + 1
                      dispatch({ type: 'ADVANCE', nextIndex })
                      updateCurrentScreenIndex(lesson.id, nextIndex)
                    }
                  }}
                >
                  Continue →
                </Button>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      <AskAiDrawer
        courseId={courseId}
        lessonId={lesson.id}
        screenId={currentScreen.id}
        screenData={screenData}
        learnerProfile={learnerProfile}
        screenAttempts={screenAttempts}
        consecutiveFailures={consecutiveFailures}
      />
    </AdaptationProvider>
  )
}
