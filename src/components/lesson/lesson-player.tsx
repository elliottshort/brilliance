'use client'

import { useCallback, useEffect, useMemo, useReducer } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { ArrowLeft, Sparkles } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ProgressBar } from './progress-bar'
import { ScreenRenderer, type ScreenResult } from '@/components/screens/screen-renderer'
import { useProgress } from '@/lib/hooks/use-progress'
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
  }
}

interface LessonPlayerProps {
  lesson: Lesson
  courseId: string
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

export function LessonPlayer({ lesson, courseId }: LessonPlayerProps) {
  const prefersReduced = useReducedMotion() ?? false

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

  const totalScreens = lesson.screens.length
  const currentScreen = lesson.screens[state.currentIndex]
  const screenData = useMemo(() => getScreenData(currentScreen), [currentScreen])

  const handleScreenComplete = useCallback(
    (result?: ScreenResult) => {
      if (result) {
        markScreenComplete(lesson.id, result.screenId, result)
        dispatch({ type: 'SCREEN_COMPLETE', result })
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

  if (progressLoading || !state.initialized) {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-3xl items-center justify-center">
        <p className="text-sm text-muted-foreground">Loading...</p>
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
      <div className="mx-auto flex min-h-[60vh] max-w-2xl flex-col items-center justify-center px-4">
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
          className="text-3xl font-bold tracking-tight text-foreground"
        >
          Lesson Complete!
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
          className="mt-8"
        >
          <Button asChild size="lg" className="gap-2">
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
      <div className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-6">
        <ProgressBar
          current={state.currentIndex + 1}
          total={totalScreens}
          className="mb-8"
        />

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
            />
          </motion.div>
        </AnimatePresence>
      </div>

      <AskAiDrawer
        courseId={courseId}
        lessonId={lesson.id}
        screenId={currentScreen.id}
        screenData={screenData}
      />
    </AdaptationProvider>
  )
}
