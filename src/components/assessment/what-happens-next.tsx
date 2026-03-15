'use client'

import { useState, useRef, useCallback } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type {
  WhatHappensNextPuzzle,
  AssessmentResponse,
} from '@/lib/schemas/assessment'

interface WhatHappensNextProps {
  puzzle: WhatHappensNextPuzzle
  onComplete: (response: AssessmentResponse) => void
}

export function WhatHappensNext({ puzzle, onComplete }: WhatHappensNextProps) {
  const prefersReduced = useReducedMotion() ?? false
  const startTimeRef = useRef(Date.now())
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const handleSelect = useCallback((optionId: string) => {
    setSelectedId(optionId)
  }, [])

  const handleContinue = useCallback(() => {
    if (!selectedId) return

    onComplete({
      puzzleId: puzzle.id,
      puzzleType: 'what_happens_next',
      response: { selectedOptionId: selectedId },
      responseTimeMs: Date.now() - startTimeRef.current,
      hintsUsed: 0,
      correct: selectedId === puzzle.correctId,
    })
  }, [puzzle.id, puzzle.correctId, selectedId, onComplete])

  return (
    <div className="mx-auto w-full max-w-2xl space-y-8">
      {/* ── Scenario ── */}
      <motion.div
        initial={prefersReduced ? false : { opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={
          prefersReduced
            ? { duration: 0 }
            : { duration: 0.4, ease: [0.25, 0.4, 0.25, 1] }
        }
      >
        <p className="text-base leading-relaxed text-foreground/90">
          {puzzle.scenario}
        </p>
      </motion.div>

      {/* ── Option cards ── */}
      <div className="space-y-3">
        {puzzle.options.map((option, index) => {
          const isSelected = selectedId === option.id

          return (
            <motion.button
              key={option.id}
              type="button"
              onClick={() => handleSelect(option.id)}
              initial={prefersReduced ? false : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={
                prefersReduced
                  ? { duration: 0 }
                  : {
                      duration: 0.35,
                      delay: index * 0.06,
                      ease: [0.25, 0.4, 0.25, 1],
                    }
              }
              whileHover={!prefersReduced ? { scale: 1.01 } : undefined}
              whileTap={!prefersReduced ? { scale: 0.99 } : undefined}
              className={cn(
                'group relative flex w-full items-start gap-4 rounded-xl px-4 py-3 text-left',
                'backdrop-blur-sm transition-all duration-150',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ring-offset-background',
                'cursor-pointer',
                isSelected
                  ? 'border border-primary ring-1 ring-primary/30 bg-primary/5 shadow-sm shadow-primary/10'
                  : 'border border-[var(--glass-border)] bg-[var(--glass-bg)] hover:border-primary/40'
              )}
            >
              <span className="text-sm leading-relaxed text-foreground/85">
                {option.text}
              </span>
            </motion.button>
          )
        })}
      </div>

      {/* ── Continue button ── */}
      <motion.div
        initial={prefersReduced ? false : { opacity: 0 }}
        animate={{ opacity: selectedId ? 1 : 0.4 }}
        transition={
          prefersReduced ? { duration: 0 } : { duration: 0.2 }
        }
        className="flex justify-center"
      >
        <Button
          onClick={handleContinue}
          disabled={!selectedId}
          size="lg"
          className="px-8"
        >
          Continue
        </Button>
      </motion.div>
    </div>
  )
}
