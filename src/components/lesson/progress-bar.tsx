'use client'

import { motion, useReducedMotion } from 'framer-motion'
import { cn } from '@/lib/utils'

interface ProgressBarProps {
  current: number
  total: number
  className?: string
}

export function ProgressBar({ current, total, className }: ProgressBarProps) {
  const prefersReduced = useReducedMotion() ?? false
  const progress = total > 0 ? Math.min((current / total) * 100, 100) : 0

  return (
    <div className={cn('space-y-1.5', className)}>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--glass-bg-subtle)]">
        <motion.div
          className="h-full rounded-full bg-primary"
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={
            prefersReduced
              ? { duration: 0 }
              : {
                  type: 'spring',
                  stiffness: 120,
                  damping: 20,
                  mass: 0.8,
                }
          }
        />
      </div>
      <p className="text-xs font-medium text-muted-foreground">
        {current} of {total}
      </p>
    </div>
  )
}
