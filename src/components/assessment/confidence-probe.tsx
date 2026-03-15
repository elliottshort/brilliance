'use client'

import { useState, useRef, useCallback, useMemo } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type {
  ConfidenceProbePuzzle,
  AssessmentResponse,
} from '@/lib/schemas/assessment'

interface ConfidenceProbeProps {
  puzzle: ConfidenceProbePuzzle
  onComplete: (response: AssessmentResponse) => void
}

type ConfidenceBand = {
  label: string
  style: string
}

const CONFIDENCE_BANDS: ConfidenceBand[] = [
  { label: 'Definitely False', style: 'text-destructive' },
  { label: 'Probably False', style: 'text-destructive/70' },
  { label: 'Not Sure', style: 'text-muted-foreground' },
  { label: 'Probably True', style: 'text-success/70' },
  { label: 'Definitely True', style: 'text-success' },
]

function getConfidenceBand(value: number): ConfidenceBand {
  if (value <= 20) return CONFIDENCE_BANDS[0]
  if (value <= 40) return CONFIDENCE_BANDS[1]
  if (value <= 60) return CONFIDENCE_BANDS[2]
  if (value <= 80) return CONFIDENCE_BANDS[3]
  return CONFIDENCE_BANDS[4]
}

export function ConfidenceProbe({ puzzle, onComplete }: ConfidenceProbeProps) {
  const prefersReduced = useReducedMotion() ?? false
  const [confidence, setConfidence] = useState(50)
  const startTimeRef = useRef(Date.now())

  const band = useMemo(() => getConfidenceBand(confidence), [confidence])

  const handleLockIn = useCallback(() => {
    onComplete({
      puzzleId: puzzle.id,
      puzzleType: 'confidence_probe',
      response: { confidence },
      responseTimeMs: Date.now() - startTimeRef.current,
      hintsUsed: 0,
      correct: null,
    })
  }, [confidence, puzzle.id, onComplete])

  return (
    <div className="mx-auto w-full max-w-[500px] space-y-10 py-8">
      {puzzle.topicContext && (
        <motion.p
          className="text-center text-xs tracking-widest uppercase text-muted-foreground/60 select-none"
          initial={prefersReduced ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={
            prefersReduced ? { duration: 0 } : { duration: 0.8, delay: 0.1 }
          }
        >
          {puzzle.topicContext}
        </motion.p>
      )}

      <motion.div
        className="text-center px-4"
        initial={prefersReduced ? false : { opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={
          prefersReduced
            ? { duration: 0 }
            : { duration: 0.6, ease: [0.25, 0.4, 0.25, 1] }
        }
      >
        <p className="text-lg font-medium text-foreground leading-relaxed">
          &ldquo;{puzzle.statement}&rdquo;
        </p>
      </motion.div>

      <motion.div
        className="space-y-5"
        initial={prefersReduced ? false : { opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={
          prefersReduced
            ? { duration: 0 }
            : { duration: 0.5, delay: 0.3, ease: [0.25, 0.4, 0.25, 1] }
        }
      >
        <div className="relative h-6 flex items-center">
          <div
            className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-2.5 rounded-full border border-[var(--glass-border)] overflow-hidden"
            style={{
              background: 'var(--glass-bg-subtle)',
              backdropFilter:
                'blur(var(--glass-blur-light)) saturate(var(--glass-saturation))',
              WebkitBackdropFilter:
                'blur(var(--glass-blur-light)) saturate(var(--glass-saturation))',
              boxShadow: 'var(--glass-shadow-inner)',
            }}
          >
            <div
              className="absolute inset-y-0 left-0 rounded-full bg-primary/25 transition-[width] duration-100 ease-out"
              style={{ width: `${confidence}%` }}
            />
          </div>

          <input
            type="range"
            min={0}
            max={100}
            step={1}
            value={confidence}
            onChange={(e) => setConfidence(Number(e.target.value))}
            className={cn(
              'relative z-10 h-6 w-full cursor-pointer appearance-none bg-transparent',
              '[&::-webkit-slider-runnable-track]:bg-transparent [&::-webkit-slider-runnable-track]:h-2.5',
              '[&::-webkit-slider-thumb]:appearance-none',
              '[&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:w-5',
              '[&::-webkit-slider-thumb]:rounded-full',
              '[&::-webkit-slider-thumb]:bg-primary',
              '[&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-primary-foreground/40',
              '[&::-webkit-slider-thumb]:shadow-[0_1px_6px_var(--ring,oklch(0_0_0/0.12))]',
              '[&::-webkit-slider-thumb]:transition-shadow [&::-webkit-slider-thumb]:duration-200',
              '[&::-webkit-slider-thumb]:hover:shadow-[0_2px_10px_var(--ring,oklch(0_0_0/0.2))]',
              '[&::-moz-range-track]:bg-transparent [&::-moz-range-track]:h-2.5',
              '[&::-moz-range-thumb]:appearance-none [&::-moz-range-thumb]:border-none',
              '[&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:w-5',
              '[&::-moz-range-thumb]:rounded-full',
              '[&::-moz-range-thumb]:bg-primary',
              '[&::-moz-range-thumb]:shadow-[0_1px_6px_oklch(0_0_0/0.12)]',
              'focus-visible:outline-none',
              '[&::-webkit-slider-thumb]:focus-visible:ring-2 [&::-webkit-slider-thumb]:focus-visible:ring-ring [&::-webkit-slider-thumb]:focus-visible:ring-offset-2 [&::-webkit-slider-thumb]:focus-visible:ring-offset-background'
            )}
            aria-label={`Confidence level for: ${puzzle.statement}`}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={confidence}
            aria-valuetext={band.label}
          />
        </div>

        <div className="flex justify-between text-[11px] text-muted-foreground/40 select-none font-medium tracking-wide">
          <span>False</span>
          <span>True</span>
        </div>

        <div
          className="flex justify-center min-h-[1.5rem]"
          aria-live="polite"
          aria-atomic
        >
          <span
            className={cn(
              'text-sm font-medium tracking-wide transition-colors duration-300 ease-out',
              band.style
            )}
          >
            {band.label}
          </span>
        </div>
      </motion.div>

      <motion.div
        className="flex justify-center"
        initial={prefersReduced ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={
          prefersReduced ? { duration: 0 } : { duration: 0.5, delay: 0.5 }
        }
      >
        <Button onClick={handleLockIn} size="lg">
          Lock In
        </Button>
      </motion.div>
    </div>
  )
}
