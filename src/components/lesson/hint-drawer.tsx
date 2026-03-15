'use client'

import { useState } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { Lightbulb, ChevronDown, Sparkles, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface HintDrawerProps {
  hints: string[]
  onHintUsed?: (hintIndex: number) => void
  onRequestAiHint?: () => Promise<string>
}

export function HintDrawer({ hints, onHintUsed, onRequestAiHint }: HintDrawerProps) {
  const prefersReduced = useReducedMotion() ?? false
  const [revealedCount, setRevealedCount] = useState(0)
  const [isOpen, setIsOpen] = useState(false)
  const [aiHint, setAiHint] = useState<string | null>(null)
  const [aiHintLoading, setAiHintLoading] = useState(false)

  const revealNextHint = () => {
    if (revealedCount < hints.length) {
      const nextIndex = revealedCount
      setRevealedCount((prev) => prev + 1)
      onHintUsed?.(nextIndex)
    }
  }

  const handleToggle = () => {
    if (!isOpen) {
      setIsOpen(true)
      if (revealedCount === 0) {
        revealNextHint()
      }
    } else {
      setIsOpen(false)
    }
  }

  const handleRequestAiHint = async () => {
    if (!onRequestAiHint || aiHintLoading || aiHint) return
    setAiHintLoading(true)
    try {
      const hint = await onRequestAiHint()
      setAiHint(hint)
    } catch {
      setAiHint('Try re-reading the question carefully.')
    } finally {
      setAiHintLoading(false)
    }
  }

  const allStaticRevealed = revealedCount >= hints.length

  if (hints.length === 0 && !onRequestAiHint) return null

  return (
    <div className="space-y-3">
      <Button
        variant="ghost"
        size="sm"
        onClick={handleToggle}
        className={cn(
          'gap-2 text-muted-foreground hover:text-amber-600 dark:hover:text-amber-400',
          isOpen && 'text-amber-600 dark:text-amber-400'
        )}
      >
        <Lightbulb className="h-4 w-4" />
        {isOpen ? 'Hide hints' : 'Need a hint?'}
        <ChevronDown
          className={cn(
            'h-3 w-3 transition-transform duration-200',
            isOpen && 'rotate-180'
          )}
        />
      </Button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={
              prefersReduced
                ? { duration: 0 }
                : { duration: 0.25, ease: [0.25, 0.4, 0.25, 1] }
            }
            className="overflow-hidden"
          >
            <div className="space-y-2 pb-1">
              {hints.slice(0, revealedCount).map((hint, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: prefersReduced ? 0 : -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={
                    prefersReduced
                      ? { duration: 0 }
                      : {
                          duration: 0.3,
                          delay: index === revealedCount - 1 ? 0.1 : 0,
                        }
                  }
                  className={cn(
                    'flex gap-3 rounded-lg border border-amber-500/20 bg-amber-500/10 px-4 py-3',
                    'dark:border-amber-400/15 dark:bg-amber-500/8'
                  )}
                >
                  <span className="shrink-0 text-xs font-semibold text-amber-600/70 dark:text-amber-400/70">
                    {index + 1}
                  </span>
                  <p className="text-sm leading-relaxed text-amber-900/80 dark:text-amber-100/80">
                    {hint}
                  </p>
                </motion.div>
              ))}

              {revealedCount < hints.length && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={
                    prefersReduced
                      ? { duration: 0 }
                      : { delay: 0.2 }
                  }
                >
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={revealNextHint}
                    className="mt-1 gap-1.5 text-xs text-muted-foreground"
                  >
                    Show hint {revealedCount + 1} of {hints.length}
                  </Button>
                </motion.div>
              )}

              {allStaticRevealed && onRequestAiHint && !aiHint && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={
                    prefersReduced
                      ? { duration: 0 }
                      : { delay: 0.2 }
                  }
                >
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleRequestAiHint}
                    disabled={aiHintLoading}
                    className="mt-1 gap-1.5 text-xs text-violet-600 hover:text-violet-700 dark:text-violet-400 dark:hover:text-violet-300"
                  >
                    {aiHintLoading ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Sparkles className="h-3.5 w-3.5" />
                    )}
                    {aiHintLoading ? 'Thinking...' : 'Get AI Hint'}
                  </Button>
                </motion.div>
              )}

              {aiHint && (
                <motion.div
                  initial={{ opacity: 0, x: prefersReduced ? 0 : -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={
                    prefersReduced
                      ? { duration: 0 }
                      : { duration: 0.3, delay: 0.1 }
                  }
                  className={cn(
                    'flex gap-3 rounded-lg border border-violet-500/20 bg-violet-500/10 px-4 py-3',
                    'dark:border-violet-400/15 dark:bg-violet-500/8'
                  )}
                >
                  <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-violet-500 dark:text-violet-400" />
                  <p className="text-sm leading-relaxed text-violet-900/80 dark:text-violet-100/80">
                    {aiHint}
                  </p>
                </motion.div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
