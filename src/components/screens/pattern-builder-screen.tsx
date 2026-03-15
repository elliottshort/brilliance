'use client'

import { useState, useCallback, useMemo } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { Puzzle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { FeedbackOverlay } from '@/components/lesson/feedback-overlay'
import { HintDrawer } from '@/components/lesson/hint-drawer'
import { cn } from '@/lib/utils'
import type { PatternBuilderScreen } from '@/lib/schemas/content'
import { MAX_ATTEMPTS, type ScreenResult } from './shared/screen-utils'

/**
 * Deterministic shuffle seeded from screen ID for consistent option order.
 * Uses a simple hash-based PRNG (xorshift32 variant).
 */
function seededShuffle<T>(arr: T[], seed: string): T[] {
  const result = [...arr]
  let hash = 0
  for (let i = 0; i < seed.length; i++) {
    hash = (hash << 5) - hash + seed.charCodeAt(i)
    hash |= 0
  }
  for (let i = result.length - 1; i > 0; i--) {
    hash ^= hash << 13
    hash ^= hash >> 17
    hash ^= hash << 5
    const j = (hash >>> 0) % (i + 1)
    ;[result[i], result[j]] = [result[j], result[i]]
  }
  return result
}

// ─── Slot fill state ────────────────────────────────────────────────────

type SlotFill = { optionId: string; value: string } | null

// ─── PatternBuilderScreenRenderer ───────────────────────────────────────

export function PatternBuilderScreenRenderer({
  screen,
  onComplete,
}: {
  screen: PatternBuilderScreen
  onComplete: (result: ScreenResult) => void
}) {
  const prefersReduced = useReducedMotion() ?? false

  // Shuffle options deterministically
  const shuffledOptions = useMemo(
    () => seededShuffle(screen.options, screen.id),
    [screen.options, screen.id]
  )

  // Hidden position indices
  const hiddenPositions = useMemo(
    () => screen.sequence.filter((s) => !s.revealed).map((s) => s.position),
    [screen.sequence]
  )

  // State: position → { optionId, value } | null
  const [filledSlots, setFilledSlots] = useState<Record<number, SlotFill>>(
    () => {
      const init: Record<number, SlotFill> = {}
      for (const pos of hiddenPositions) {
        init[pos] = null
      }
      return init
    }
  )

  const [selectedSlot, setSelectedSlot] = useState<number | null>(null)
  const [phase, setPhase] = useState<'building' | 'feedback' | 'revealed'>(
    'building'
  )
  const [lastAnswerCorrect, setLastAnswerCorrect] = useState(false)
  const [attempts, setAttempts] = useState(0)
  const [hintsUsed, setHintsUsed] = useState(0)
  const [slotStatuses, setSlotStatuses] = useState<
    Record<number, 'correct' | 'incorrect'>
  >({})

  // Track which option IDs have been placed
  const usedOptionIds = useMemo(() => {
    const ids = new Set<string>()
    for (const fill of Object.values(filledSlots)) {
      if (fill) ids.add(fill.optionId)
    }
    return ids
  }, [filledSlots])

  const allSlotsFilled = useMemo(
    () => hiddenPositions.every((pos) => filledSlots[pos] !== null),
    [hiddenPositions, filledSlots]
  )

  // ─── Handlers ───────────────────────────────────────────────────────

  const handleSlotClick = useCallback(
    (position: number) => {
      if (phase !== 'building') return

      if (selectedSlot === position) {
        // Deselect
        setSelectedSlot(null)
      } else if (filledSlots[position] !== null) {
        // Clear a filled slot and select it
        setFilledSlots((prev) => ({ ...prev, [position]: null }))
        setSelectedSlot(position)
      } else {
        // Select empty slot
        setSelectedSlot(position)
      }
    },
    [phase, selectedSlot, filledSlots]
  )

  const handleOptionClick = useCallback(
    (option: { id: string; value: string }) => {
      if (phase !== 'building' || selectedSlot === null) return

      setFilledSlots((prev) => ({
        ...prev,
        [selectedSlot]: { optionId: option.id, value: option.value },
      }))

      // Auto-advance to next empty slot
      const nextEmpty = hiddenPositions.find(
        (pos) => pos !== selectedSlot && filledSlots[pos] === null
      )
      setSelectedSlot(nextEmpty ?? null)
    },
    [phase, selectedSlot, hiddenPositions, filledSlots]
  )

  const handleCheckAnswer = useCallback(() => {
    if (phase !== 'building' || !allSlotsFilled) return

    const newAttempts = attempts + 1
    setAttempts(newAttempts)

    const statuses: Record<number, 'correct' | 'incorrect'> = {}
    let allCorrect = true

    for (const item of screen.sequence) {
      if (!item.revealed) {
        const fill = filledSlots[item.position]
        if (fill && fill.value === item.value) {
          statuses[item.position] = 'correct'
        } else {
          statuses[item.position] = 'incorrect'
          allCorrect = false
        }
      }
    }

    setSlotStatuses(statuses)
    setLastAnswerCorrect(allCorrect)

    if (allCorrect) {
      setPhase('feedback')
    } else if (newAttempts >= MAX_ATTEMPTS) {
      // Reveal correct answers
      const correctFills: Record<number, SlotFill> = {}
      for (const item of screen.sequence) {
        if (!item.revealed) {
          correctFills[item.position] = {
            optionId: `_revealed_${item.position}`,
            value: item.value,
          }
        }
      }
      setFilledSlots(correctFills)
      setPhase('revealed')
    } else {
      setPhase('feedback')
    }
  }, [phase, allSlotsFilled, attempts, screen.sequence, filledSlots])

  const handleRetry = useCallback(() => {
    setPhase('building')
    setLastAnswerCorrect(false)
    setSlotStatuses({})
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

  // ─── Rendering helpers ─────────────────────────────────────────────

  const renderValue = (value: string, size: 'slot' | 'option' = 'slot') => {
    switch (screen.patternType) {
      case 'numeric':
        return (
          <span
            className={cn(
              'font-bold tabular-nums',
              size === 'slot' ? 'text-xl' : 'text-lg'
            )}
          >
            {value}
          </span>
        )
      case 'visual':
        return screen.visualAssets?.[value] ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={screen.visualAssets[value]}
            alt={value}
            className={cn(
              'object-contain',
              size === 'slot' ? 'h-10 w-10' : 'h-8 w-8'
            )}
          />
        ) : (
          <span className="text-lg font-medium">{value}</span>
        )
      case 'text':
      default:
        return (
          <span
            className={cn(
              'font-semibold leading-tight',
              size === 'slot' ? 'text-sm' : 'text-sm'
            )}
          >
            {value}
          </span>
        )
    }
  }

  // ─── Render ─────────────────────────────────────────────────────────

  return (
    <div className="mx-auto w-full max-w-2xl space-y-8">
      {/* Instruction heading */}
      <motion.div
        initial={prefersReduced ? false : { opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{
          duration: prefersReduced ? 0 : 0.4,
          ease: [0.25, 0.4, 0.25, 1],
        }}
      >
        <h2 className="text-2xl font-bold tracking-tight text-foreground">
          {screen.title}
        </h2>
        <p className="mt-2 flex items-center gap-1.5 text-sm text-muted-foreground">
          <Puzzle className="h-3.5 w-3.5" />
          {screen.instruction}
        </p>
      </motion.div>

      {/* Sequence row */}
      <motion.div
        initial={prefersReduced ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{
          duration: prefersReduced ? 0 : 0.35,
          delay: prefersReduced ? 0 : 0.15,
        }}
        className="flex gap-2 justify-center flex-wrap sm:gap-3"
      >
        {screen.sequence.map((item, index) => {
          const isRevealed = item.revealed
          const isHidden = !isRevealed
          const fill = isHidden ? filledSlots[item.position] : null
          const isFilled = isHidden && fill !== null
          const isSelected = isHidden && selectedSlot === item.position
          const status = slotStatuses[item.position]

          return (
            <motion.button
              key={item.position}
              initial={prefersReduced ? false : { opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{
                duration: prefersReduced ? 0 : 0.3,
                delay: prefersReduced ? 0 : index * 0.06,
                ease: [0.25, 0.4, 0.25, 1],
              }}
              onClick={
                isHidden ? () => handleSlotClick(item.position) : undefined
              }
              disabled={phase !== 'building' || isRevealed}
              type="button"
              className={cn(
                'w-12 h-12 flex items-center justify-center rounded-xl border-2 text-lg font-bold sm:w-16 sm:h-16',
                'transition-all duration-150',
                // Revealed items
                isRevealed &&
                  'border-[var(--glass-border)] bg-[var(--glass-bg-subtle)] text-foreground/85 cursor-default',
                // Hidden: empty slot
                isHidden &&
                  !isFilled &&
                  !isSelected &&
                  !status &&
                  'border-dashed border-primary/40 text-primary/40 cursor-pointer hover:border-primary/60 hover:bg-primary/5',
                // Hidden: filled slot
                isHidden &&
                  isFilled &&
                  !status &&
                  'border-solid border-primary bg-primary/5 text-foreground cursor-pointer hover:bg-primary/10',
                // Selected slot
                isSelected &&
                  'ring-2 ring-primary ring-offset-2 ring-offset-background',
                // Correct
                status === 'correct' &&
                  'border-emerald-400 bg-emerald-50/60 text-emerald-900 dark:border-emerald-500/60 dark:bg-emerald-950/25 dark:text-emerald-100',
                // Incorrect
                status === 'incorrect' &&
                  'border-red-400 bg-red-50/60 text-red-900 dark:border-red-500/60 dark:bg-red-950/25 dark:text-red-100',
                // Disabled in non-building phases
                phase !== 'building' && isHidden && 'cursor-default'
              )}
              aria-label={
                isRevealed
                  ? `Position ${item.position}: ${item.value}`
                  : isFilled
                    ? `Position ${item.position}: filled with ${fill!.value}, click to clear`
                    : `Position ${item.position}: empty, click to select`
              }
            >
              {isRevealed ? (
                renderValue(item.value)
              ) : isFilled ? (
                renderValue(fill!.value)
              ) : (
                <span className="text-xl">?</span>
              )}
            </motion.button>
          )
        })}
      </motion.div>

      {/* Options */}
      {phase === 'building' && (
        <motion.div
          initial={prefersReduced ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            duration: prefersReduced ? 0 : 0.3,
            delay: prefersReduced ? 0 : 0.3,
          }}
          className="space-y-3"
        >
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground/60">
            Options
          </p>
          <div className="flex gap-2 flex-wrap justify-center">
            {shuffledOptions.map((option, index) => {
              const isUsed = usedOptionIds.has(option.id)
              return (
                <motion.button
                  key={option.id}
                  initial={prefersReduced ? false : { opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    duration: prefersReduced ? 0 : 0.25,
                    delay: prefersReduced ? 0 : 0.35 + index * 0.04,
                  }}
                  onClick={() => handleOptionClick(option)}
                  disabled={isUsed || selectedSlot === null}
                  type="button"
                  className={cn(
                    'rounded-lg border bg-card px-4 py-2 cursor-pointer',
                    'transition-all duration-150',
                    !isUsed &&
                      selectedSlot !== null &&
                      'hover:border-primary/40 hover:bg-accent/40 active:scale-[0.97]',
                    isUsed && 'opacity-30 cursor-default',
                    selectedSlot === null && !isUsed && 'opacity-60 cursor-default'
                  )}
                  aria-label={`Option: ${option.value}${isUsed ? ' (used)' : ''}`}
                >
                  {renderValue(option.value, 'option')}
                </motion.button>
              )
            })}
          </div>
          {selectedSlot === null && !allSlotsFilled && (
            <p className="text-center text-xs text-muted-foreground/50">
              Tap an empty slot to select it, then choose an option
            </p>
          )}
        </motion.div>
      )}

      {/* Check Answer button */}
      {phase === 'building' && (
        <motion.div
          initial={prefersReduced ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: prefersReduced ? 0 : 0.2 }}
          className="flex justify-end"
        >
          <Button
            onClick={handleCheckAnswer}
            size="lg"
            className="px-8"
            disabled={!allSlotsFilled}
          >
            Check Answer
          </Button>
        </motion.div>
      )}

      {/* Feedback overlay — correct or incorrect with retries */}
      {phase === 'feedback' && (
        <FeedbackOverlay
          isCorrect={lastAnswerCorrect}
          explanation={screen.explanation}
          onContinue={handleContinue}
          onRetry={handleRetry}
        />
      )}

      {/* Revealed state — after max attempts */}
      {phase === 'revealed' && (
        <motion.div
          initial={prefersReduced ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            duration: prefersReduced ? 0 : 0.3,
            ease: [0.25, 0.4, 0.25, 1],
          }}
          className="space-y-4"
        >
          <div className="rounded-xl border border-[var(--glass-border)] bg-[var(--glass-bg-subtle)] p-5">
            <p className="text-sm font-medium text-muted-foreground">
              Here&apos;s the complete pattern:
            </p>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              {screen.explanation}
            </p>
          </div>
          <div className="flex justify-end">
            <Button
              onClick={handleRevealedContinue}
              size="lg"
              className="px-8"
            >
              Continue
            </Button>
          </div>
        </motion.div>
      )}

      {/* Hint drawer */}
      {phase === 'building' && (
        <HintDrawer hints={screen.hints} onHintUsed={handleHintUsed} />
      )}
    </div>
  )
}
