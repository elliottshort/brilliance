'use client'

import { useState, useCallback, useRef } from 'react'
import { motion } from 'framer-motion'
import { PenLine, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { FeedbackOverlay } from '@/components/lesson/feedback-overlay'
import { HintDrawer } from '@/components/lesson/hint-drawer'
import type { FillInBlankScreen as FillInBlankScreenData } from '@/lib/schemas/content'
import type { ScreenResult } from '@/lib/schemas/progress'

interface FillInBlankScreenProps {
  screen: FillInBlankScreenData
  onComplete: (result: ScreenResult) => void
}

const MAX_ATTEMPTS = 3

const contentReveal = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.15,
    },
  },
}

const itemReveal = {
  hidden: { opacity: 0, y: 8 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: [0.25, 0.4, 0.25, 1] as const },
  },
}

function parsePromptParts(prompt: string): string[] {
  return prompt.split('{{blank}}')
}

function checkBlank(
  userInput: string,
  acceptedAnswers: string[],
  caseSensitive: boolean
): boolean {
  const trimmed = userInput.trim()
  if (trimmed.length === 0) return false
  return acceptedAnswers.some((answer) => {
    if (caseSensitive) return trimmed === answer
    return trimmed.toLowerCase() === answer.toLowerCase()
  })
}

/** Estimate input width from longest accepted answer, clamped to a sane range. */
function blankWidth(acceptedAnswers: string[]): number {
  const longest = Math.max(...acceptedAnswers.map((a) => a.length))
  return Math.min(Math.max(longest + 2, 6), 24)
}

export function FillInBlankScreen({ screen, onComplete }: FillInBlankScreenProps) {
  const [userAnswers, setUserAnswers] = useState<Record<number, string>>({})
  const [blankResults, setBlankResults] = useState<Record<number, boolean | null>>({})
  const [attempts, setAttempts] = useState(0)
  const [hintsUsed, setHintsUsed] = useState(0)
  const [showFeedback, setShowFeedback] = useState(false)
  const [isCorrect, setIsCorrect] = useState(false)
  const [isLocked, setIsLocked] = useState(false)
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])

  const parts = parsePromptParts(screen.prompt)
  const blanksCount = screen.blanks.length

  const handleInputChange = useCallback((index: number, value: string) => {
    setUserAnswers((prev) => ({ ...prev, [index]: value }))
    setBlankResults((prev) => ({ ...prev, [index]: null }))
    setShowFeedback(false)
  }, [])

  const handleCheck = useCallback(() => {
    const results: Record<number, boolean> = {}
    let allCorrect = true

    screen.blanks.forEach((blank, index) => {
      const userInput = userAnswers[index] || ''
      const correct = checkBlank(userInput, blank.acceptedAnswers, blank.caseSensitive)
      results[index] = correct
      if (!correct) allCorrect = false
    })

    setBlankResults(results)
    const newAttempts = attempts + 1
    setAttempts(newAttempts)

    if (allCorrect) {
      setIsCorrect(true)
      setShowFeedback(true)
      setIsLocked(true)
    } else if (newAttempts >= MAX_ATTEMPTS) {
      const corrected: Record<number, string> = {}
      screen.blanks.forEach((blank, index) => {
        if (!results[index]) {
          corrected[index] = blank.acceptedAnswers[0]
        }
      })
      setUserAnswers((prev) => ({ ...prev, ...corrected }))
      setIsCorrect(false)
      setShowFeedback(true)
      setIsLocked(true)
    } else {
      setIsCorrect(false)
      setShowFeedback(true)
    }
  }, [userAnswers, screen.blanks, attempts])

  const handleRetry = useCallback(() => {
    setShowFeedback(false)
    const firstWrongIndex = Object.entries(blankResults).find(
      ([, v]) => v === false
    )?.[0]
    if (firstWrongIndex !== undefined) {
      inputRefs.current[Number(firstWrongIndex)]?.focus()
    }
  }, [blankResults])

  const handleContinue = useCallback(() => {
    onComplete({
      screenId: screen.id,
      answeredCorrectly: isCorrect,
      attempts,
      hintsUsed,
      answeredAt: new Date().toISOString(),
    })
  }, [screen.id, isCorrect, attempts, hintsUsed, onComplete])

  const handleHintUsed = useCallback((hintIndex: number) => {
    setHintsUsed(hintIndex + 1)
  }, [])

  const allFilled = screen.blanks.every(
    (_, i) => (userAnswers[i] || '').trim().length > 0
  )

  return (
    <motion.div
      variants={contentReveal}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      <motion.div variants={itemReveal} className="flex items-center gap-3">
        <div
          className={cn(
            'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg',
            'bg-primary/10 text-primary'
          )}
        >
          <PenLine className="h-[18px] w-[18px]" />
        </div>
        <h2 className="text-2xl font-bold tracking-tight text-foreground">
          {screen.title}
        </h2>
      </motion.div>

      <motion.div
        variants={itemReveal}
        className={cn(
          'rounded-xl border border-border/60 bg-card/50 px-6 py-5',
          'text-[0.9375rem] leading-[2.4] text-foreground/90'
        )}
      >
        <div className="flex flex-wrap items-baseline gap-y-1">
          {parts.map((part, index) => (
            <span key={index}>
              <span className="whitespace-pre-wrap">{part}</span>

              {index < blanksCount && (
                <span className="relative mx-1 inline-flex items-baseline align-baseline">
                  <input
                    ref={(el) => {
                      inputRefs.current[index] = el
                    }}
                    type="text"
                    value={userAnswers[index] || ''}
                    onChange={(e) => handleInputChange(index, e.target.value)}
                    disabled={isLocked}
                    aria-label={`Blank ${index + 1}`}
                    style={{ width: `${blankWidth(screen.blanks[index].acceptedAnswers)}ch` }}
                    className={cn(
                      'inline-block border-b-2 bg-transparent',
                      'px-1.5 py-0.5 text-center font-mono text-[0.875rem]',
                      'outline-none transition-all duration-200',
                      blankResults[index] == null && [
                        'border-border text-foreground',
                        'focus:border-primary',
                      ],
                      blankResults[index] === true && [
                        'border-emerald-500 text-emerald-700 dark:text-emerald-300',
                        'bg-emerald-50/50 dark:bg-emerald-950/20',
                      ],
                      blankResults[index] === false && [
                        'border-red-500 text-red-700 dark:text-red-300',
                        'bg-red-50/50 dark:bg-red-950/20',
                      ],
                      isLocked && 'cursor-default opacity-80'
                    )}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && allFilled && !isLocked) {
                        handleCheck()
                      } else if (
                        e.key === 'Tab' &&
                        !e.shiftKey &&
                        index < blanksCount - 1
                      ) {
                        e.preventDefault()
                        inputRefs.current[index + 1]?.focus()
                      }
                    }}
                  />

                  {blankResults[index] !== null &&
                    blankResults[index] !== undefined && (
                      <motion.span
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{
                          type: 'spring',
                          stiffness: 500,
                          damping: 25,
                        }}
                        className={cn(
                          'absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center',
                          'rounded-full text-white shadow-sm',
                          blankResults[index] ? 'bg-emerald-500' : 'bg-red-500'
                        )}
                      >
                        {blankResults[index] ? (
                          <Check className="h-2.5 w-2.5" strokeWidth={3} />
                        ) : (
                          <span className="text-[10px] font-bold leading-none">
                            ×
                          </span>
                        )}
                      </motion.span>
                    )}
                </span>
              )}
            </span>
          ))}
        </div>
      </motion.div>

      <motion.div variants={itemReveal}>
        <HintDrawer hints={screen.hints} onHintUsed={handleHintUsed} />
      </motion.div>

      {!isLocked && (
        <motion.div variants={itemReveal} className="flex justify-end">
          <Button
            onClick={handleCheck}
            disabled={!allFilled}
            size="lg"
            className="gap-2"
          >
            <Check className="h-4 w-4" />
            Check Answer{blanksCount > 1 ? 's' : ''}
          </Button>
        </motion.div>
      )}

      {showFeedback && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: [0.25, 0.4, 0.25, 1] }}
        >
          <FeedbackOverlay
            isCorrect={isCorrect}
            explanation={screen.explanation}
            onContinue={handleContinue}
            onRetry={isLocked ? undefined : handleRetry}
          />
        </motion.div>
      )}
    </motion.div>
  )
}
