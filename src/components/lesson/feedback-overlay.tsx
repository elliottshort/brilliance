'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle2, XCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

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

export function FeedbackOverlay({
  isCorrect,
  explanation,
  onContinue,
  onRetry,
}: FeedbackOverlayProps) {
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
        transition={{ duration: 0.3, ease: [0.25, 0.4, 0.25, 1] }}
        className={cn(
          'rounded-xl border p-6',
          isCorrect
            ? 'border-emerald-200 bg-emerald-50/80 dark:border-emerald-800/50 dark:bg-emerald-950/30'
            : 'border-red-200 bg-red-50/80 dark:border-red-800/50 dark:bg-red-950/30'
        )}
      >
        <motion.div
          variants={isCorrect ? undefined : shakeVariants}
          initial="initial"
          animate={isCorrect ? undefined : 'shake'}
        >
          <div className="flex items-start gap-4">
            <motion.div
              variants={isCorrect ? pulseVariants : undefined}
              initial="initial"
              animate={isCorrect ? 'pulse' : undefined}
              className="shrink-0 pt-0.5"
            >
              {isCorrect ? (
                <CheckCircle2 className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
              ) : (
                <XCircle className="h-6 w-6 text-red-600 dark:text-red-400" />
              )}
            </motion.div>

            <div className="flex-1 space-y-2">
              <h3
                className={cn(
                  'text-lg font-semibold tracking-tight',
                  isCorrect
                    ? 'text-emerald-900 dark:text-emerald-100'
                    : 'text-red-900 dark:text-red-100'
                )}
              >
                {isCorrect ? 'Correct!' : 'Not quite!'}
              </h3>
              <p
                className={cn(
                  'text-sm leading-relaxed',
                  isCorrect
                    ? 'text-emerald-800/80 dark:text-emerald-200/80'
                    : 'text-red-800/80 dark:text-red-200/80'
                )}
              >
                {explanation}
              </p>
            </div>
          </div>

          <div className="mt-5 flex justify-end">
            {isCorrect ? (
              <Button onClick={onContinue} size="sm" className="gap-1.5">
                Continue
              </Button>
            ) : (
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
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
