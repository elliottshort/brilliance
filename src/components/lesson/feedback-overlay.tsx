'use client'

import { useEffect } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { CheckCircle2, XCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useSound } from '@/lib/hooks/use-sound'

interface FeedbackOverlayProps {
  isCorrect: boolean
  explanation: string
  onContinue: () => void
  onRetry?: () => void
}

const shakeVariants = {
  initial: { x: 0 },
  shake: {
    x: [0, -10, 10, -10, 10, 0],
    transition: { duration: 0.5, ease: 'easeInOut' as const },
  },
}

const pulseVariants = {
  initial: { scale: 1 },
  pulse: {
    scale: [1, 1.2, 1],
    transition: { duration: 0.6, ease: 'easeOut' as const },
  },
}

const PARTICLES = Array.from({ length: 8 }, (_, i) => ({
  angle: i * 45,
  delay: [0, 0.025, 0.05, 0.015, 0.04, 0.01, 0.055, 0.035][i],
  distance: 20 + (i % 3) * 5,
}))

export function FeedbackOverlay({
  isCorrect,
  explanation,
  onContinue,
  onRetry,
}: FeedbackOverlayProps) {
  const prefersReduced = useReducedMotion() ?? false
  const { playCorrect, playIncorrect } = useSound()

  useEffect(() => {
    if (isCorrect) {
      playCorrect()
    } else {
      playIncorrect()
    }
  }, [isCorrect, playCorrect, playIncorrect])

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{
          opacity: 1,
          y: 0,
          ...(!prefersReduced && isCorrect ? { scale: [1, 1.02, 1] } : {}),
        }}
        exit={{ opacity: 0, y: 20 }}
        transition={
          prefersReduced
            ? { duration: 0 }
            : {
                duration: 0.3,
                ease: [0.25, 0.4, 0.25, 1],
                ...(isCorrect
                  ? { scale: { duration: 0.3, ease: 'easeOut' } }
                  : {}),
              }
        }
        className={cn(
          'rounded-xl border p-6',
          isCorrect
            ? 'border-emerald-500/20 bg-emerald-500/10 dark:border-emerald-400/15 dark:bg-emerald-500/8'
            : 'border-red-500/20 bg-red-500/10 dark:border-red-400/15 dark:bg-red-500/8'
        )}
      >
        <motion.div
          variants={!prefersReduced && !isCorrect ? shakeVariants : undefined}
          initial="initial"
          animate={!prefersReduced && !isCorrect ? 'shake' : undefined}
        >
          <div className="flex items-start gap-4">
            <div className="relative shrink-0 pt-0.5">
              <motion.div
                variants={!prefersReduced && isCorrect ? pulseVariants : undefined}
                initial="initial"
                animate={!prefersReduced && isCorrect ? 'pulse' : undefined}
              >
                {isCorrect ? (
                  <CheckCircle2 className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                ) : (
                  <XCircle className="h-6 w-6 text-red-600 dark:text-red-400" />
                )}
              </motion.div>

              {!prefersReduced && isCorrect && (
                <motion.div
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: [0.5, 1.8, 2.2], opacity: [0.5, 0.2, 0] }}
                  transition={{ duration: 0.8, delay: 0.1, ease: 'easeOut' }}
                  className="pointer-events-none absolute -inset-1.5 rounded-full border border-emerald-400/60 dark:border-emerald-500/60"
                />
              )}

              {!prefersReduced &&
                isCorrect &&
                PARTICLES.map((p, i) => {
                  const rad = (p.angle * Math.PI) / 180
                  return (
                    <motion.span
                      key={i}
                      initial={{ scale: 0, x: 0, y: 0, opacity: 1 }}
                      animate={{
                        scale: [0, 1, 0.6],
                        x: Math.cos(rad) * p.distance,
                        y: Math.sin(rad) * p.distance,
                        opacity: [1, 0.7, 0],
                      }}
                      transition={{
                        duration: 0.4,
                        delay: 0.15 + p.delay,
                        ease: 'easeOut',
                      }}
                      className="pointer-events-none absolute left-1/2 top-1/2 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-emerald-400/70"
                    />
                  )
                })}
            </div>

            <div className="flex-1 space-y-2">
              <motion.h3
                initial={{ opacity: 0, x: -4 }}
                animate={{ opacity: 1, x: 0 }}
                transition={
                  prefersReduced
                    ? { duration: 0 }
                    : { delay: 0.15, duration: 0.3 }
                }
                className={cn(
                  'text-lg font-semibold tracking-tight',
                  isCorrect
                    ? 'text-emerald-900 dark:text-emerald-100'
                    : 'text-red-900 dark:text-red-100'
                )}
              >
                {isCorrect ? 'Correct!' : 'Not quite!'}
              </motion.h3>
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={
                  prefersReduced
                    ? { duration: 0 }
                    : { delay: 0.3, duration: 0.3 }
                }
                className={cn(
                  'text-sm leading-relaxed',
                  isCorrect
                    ? 'text-emerald-800/80 dark:text-emerald-200/80'
                    : 'text-red-800/80 dark:text-red-200/80'
                )}
              >
                {explanation}
              </motion.p>
            </div>
          </div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={
              prefersReduced
                ? { duration: 0 }
                : { delay: 0.4, duration: 0.25 }
            }
            className="mt-5 flex justify-end"
          >
            {isCorrect ? (
              <Button onClick={onContinue} size="sm" className="gap-1.5">
                Continue
              </Button>
            ) : onRetry ? (
              <Button
                onClick={onRetry}
                variant="outline"
                size="sm"
                className={cn(
                  'gap-1.5',
                  'border-red-200 text-red-700 hover:bg-red-100',
                  'dark:border-red-800 dark:text-red-300 dark:hover:bg-red-950'
                )}
              >
                Try Again
              </Button>
            ) : (
              <Button onClick={onContinue} size="sm" className="gap-1.5">
                Continue
              </Button>
            )}
          </motion.div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
