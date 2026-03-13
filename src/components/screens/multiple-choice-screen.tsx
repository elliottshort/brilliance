'use client'

import { useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import { CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { FeedbackOverlay } from '@/components/lesson/feedback-overlay'
import { HintDrawer } from '@/components/lesson/hint-drawer'
import { cn } from '@/lib/utils'
import type { MultipleChoiceScreen } from '@/lib/schemas/content'

interface ScreenResult {
  screenId: string
  answeredCorrectly: boolean
  attempts: number
  hintsUsed: number
  answeredAt: string
}

interface MultipleChoiceScreenProps {
  screen: MultipleChoiceScreen
  onComplete: (result: ScreenResult) => void
}

const MAX_ATTEMPTS = 3

export function MultipleChoiceScreenRenderer({
  screen,
  onComplete,
}: MultipleChoiceScreenProps) {
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null)
  const [phase, setPhase] = useState<'selecting' | 'feedback' | 'revealed'>(
    'selecting'
  )
  const [lastAnswerCorrect, setLastAnswerCorrect] = useState(false)
  const [attempts, setAttempts] = useState(0)
  const [hintsUsed, setHintsUsed] = useState(0)

  const correctOption = screen.options.find((opt) => opt.isCorrect)

  const handleOptionSelect = useCallback(
    (optionId: string) => {
      if (phase !== 'selecting') return
      setSelectedOptionId(optionId)
    },
    [phase]
  )

  const handleCheckAnswer = useCallback(() => {
    if (!selectedOptionId || phase !== 'selecting') return

    const newAttempts = attempts + 1
    setAttempts(newAttempts)

    const selected = screen.options.find((opt) => opt.id === selectedOptionId)
    const isCorrect = selected?.isCorrect ?? false
    setLastAnswerCorrect(isCorrect)

    if (isCorrect) {
      setPhase('feedback')
    } else if (newAttempts >= MAX_ATTEMPTS) {
      setPhase('revealed')
    } else {
      setPhase('feedback')
    }
  }, [selectedOptionId, phase, attempts, screen.options])

  const handleRetry = useCallback(() => {
    setSelectedOptionId(null)
    setPhase('selecting')
    setLastAnswerCorrect(false)
  }, [])

  const handleContinue = useCallback(() => {
    onComplete({
      screenId: screen.id,
      answeredCorrectly: lastAnswerCorrect,
      attempts,
      hintsUsed,
      answeredAt: new Date().toISOString(),
    })
  }, [screen.id, lastAnswerCorrect, attempts, hintsUsed, onComplete])

  const handleRevealedContinue = useCallback(() => {
    onComplete({
      screenId: screen.id,
      answeredCorrectly: false,
      attempts,
      hintsUsed,
      answeredAt: new Date().toISOString(),
    })
  }, [screen.id, attempts, hintsUsed, onComplete])

  const handleHintUsed = useCallback((_hintIndex: number) => {
    setHintsUsed((prev) => prev + 1)
  }, [])

  const getOptionState = (optionId: string) => {
    if (phase === 'revealed') {
      if (optionId === correctOption?.id) return 'correct'
      if (optionId === selectedOptionId) return 'incorrect'
      return 'disabled'
    }
    if (phase === 'feedback') {
      if (optionId === selectedOptionId) {
        return lastAnswerCorrect ? 'correct' : 'incorrect'
      }
      return 'disabled'
    }
    if (optionId === selectedOptionId) return 'selected'
    return 'idle'
  }

  return (
    <div className="mx-auto w-full max-w-2xl space-y-8">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.25, 0.4, 0.25, 1] }}
      >
        <h2 className="text-2xl font-bold tracking-tight text-foreground">
          {screen.title}
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Select the correct answer
        </p>
      </motion.div>

      <div className="space-y-3">
        {screen.options.map((option, index) => {
          const state = getOptionState(option.id)
          const isInteractive = phase === 'selecting'
          const label = String.fromCharCode(65 + index)

          return (
            <motion.button
              key={option.id}
              type="button"
              disabled={!isInteractive}
              onClick={() => handleOptionSelect(option.id)}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.35,
                delay: index * 0.06,
                ease: [0.25, 0.4, 0.25, 1],
              }}
              whileHover={isInteractive ? { scale: 1.01 } : undefined}
              whileTap={isInteractive ? { scale: 0.99 } : undefined}
              className={cn(
                'group relative flex w-full items-center gap-4 rounded-xl border-2 px-5 py-4 text-left transition-colors duration-150',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ring-offset-background',
                state === 'idle' &&
                  'border-border/60 bg-card hover:border-primary/40 hover:bg-accent/50',
                state === 'selected' &&
                  'border-primary bg-primary/5 shadow-sm shadow-primary/10',
                state === 'correct' &&
                  'border-emerald-500 bg-emerald-50/60 dark:border-emerald-400 dark:bg-emerald-950/30',
                state === 'incorrect' &&
                  'border-red-400 bg-red-50/60 dark:border-red-500 dark:bg-red-950/30',
                state === 'disabled' && 'border-border/30 bg-muted/30 opacity-50',
                !isInteractive && 'cursor-default'
              )}
            >
              <span
                className={cn(
                  'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-sm font-semibold transition-colors duration-150',
                  state === 'idle' &&
                    'bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary',
                  state === 'selected' && 'bg-primary text-primary-foreground',
                  state === 'correct' &&
                    'bg-emerald-500 text-white dark:bg-emerald-500',
                  state === 'incorrect' &&
                    'bg-red-400 text-white dark:bg-red-500',
                  state === 'disabled' && 'bg-muted/60 text-muted-foreground/50'
                )}
              >
                {state === 'correct' ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : (
                  label
                )}
              </span>

              <span
                className={cn(
                  'flex-1 text-sm font-medium leading-relaxed',
                  state === 'idle' && 'text-foreground/80',
                  state === 'selected' && 'text-foreground',
                  state === 'correct' &&
                    'text-emerald-900 dark:text-emerald-100',
                  state === 'incorrect' && 'text-red-900 dark:text-red-100',
                  state === 'disabled' && 'text-muted-foreground/60'
                )}
              >
                {option.text}
              </span>
            </motion.button>
          )
        })}
      </div>

      {phase === 'selecting' && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: selectedOptionId ? 1 : 0.4 }}
          transition={{ duration: 0.2 }}
          className="flex justify-end"
        >
          <Button
            onClick={handleCheckAnswer}
            disabled={!selectedOptionId}
            size="lg"
            className="px-8"
          >
            Check Answer
          </Button>
        </motion.div>
      )}

      {phase === 'feedback' && (
        <FeedbackOverlay
          isCorrect={lastAnswerCorrect}
          explanation={screen.explanation}
          onContinue={handleContinue}
          onRetry={handleRetry}
        />
      )}

      {phase === 'revealed' && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: [0.25, 0.4, 0.25, 1] }}
          className="space-y-4"
        >
          <div className="rounded-xl border border-border/60 bg-muted/30 p-5">
            <p className="text-sm font-medium text-muted-foreground">
              The correct answer is:
            </p>
            <p className="mt-1 text-base font-semibold text-foreground">
              {correctOption?.text}
            </p>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              {screen.explanation}
            </p>
          </div>
          <div className="flex justify-end">
            <Button onClick={handleRevealedContinue} size="lg" className="px-8">
              Continue
            </Button>
          </div>
        </motion.div>
      )}

      {phase === 'selecting' && (
        <HintDrawer hints={screen.hints} onHintUsed={handleHintUsed} />
      )}
    </div>
  )
}
