'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Lightbulb, ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface HintDrawerProps {
  hints: string[]
  onHintUsed?: (hintIndex: number) => void
}

export function HintDrawer({ hints, onHintUsed }: HintDrawerProps) {
  const [revealedCount, setRevealedCount] = useState(0)
  const [isOpen, setIsOpen] = useState(false)

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

  if (hints.length === 0) return null

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
            transition={{ duration: 0.25, ease: [0.25, 0.4, 0.25, 1] }}
            className="overflow-hidden"
          >
            <div className="space-y-2 pb-1">
              {hints.slice(0, revealedCount).map((hint, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{
                    duration: 0.3,
                    delay: index === revealedCount - 1 ? 0.1 : 0,
                  }}
                  className={cn(
                    'flex gap-3 rounded-lg border border-amber-200/60 bg-amber-50/50 px-4 py-3',
                    'dark:border-amber-800/30 dark:bg-amber-950/20'
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
                  transition={{ delay: 0.2 }}
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
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
