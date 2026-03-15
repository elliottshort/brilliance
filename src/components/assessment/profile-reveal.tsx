'use client'

import { motion, useReducedMotion } from 'framer-motion'
import { Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { LearnerProfileRadar } from './learner-profile-radar'
import type { LearnerProfile } from '@/lib/schemas/assessment'
import { cn } from '@/lib/utils'

interface ProfileRevealProps {
  profile: LearnerProfile
  onContinue: () => void
}

const springTransition = {
  type: 'spring' as const,
  stiffness: 300,
  damping: 30,
}

export function ProfileReveal({ profile, onContinue }: ProfileRevealProps) {
  const prefersReduced = useReducedMotion()

  const paragraphs = profile.narrative
    .split(/\n\n?/)
    .map((p) => p.trim())
    .filter(Boolean)

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-[600px] flex-col items-center justify-center px-4 py-12">
      <div
        className={cn(
          'w-full rounded-2xl border border-[var(--glass-border)] p-8',
          'bg-[var(--glass-bg)] backdrop-blur-sm',
        )}
      >
        <motion.h2
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={
            prefersReduced
              ? { duration: 0 }
              : { ...springTransition, delay: 0.0 }
          }
          className="text-center text-2xl font-bold tracking-tight text-foreground"
        >
          Here&rsquo;s what I noticed
        </motion.h2>

        <motion.div
          initial={{ opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={
            prefersReduced
              ? { duration: 0 }
              : { ...springTransition, delay: 0.3 }
          }
          className="mt-8"
        >
          <LearnerProfileRadar
            dimensions={profile.dimensions}
            className="mx-auto"
          />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={
            prefersReduced
              ? { duration: 0 }
              : { ...springTransition, delay: 0.6 }
          }
          className="mt-8 space-y-3"
        >
          {paragraphs.map((text, i) => (
            <p
              key={i}
              className="text-base leading-relaxed text-muted-foreground"
            >
              {text}
            </p>
          ))}
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={
            prefersReduced ? { duration: 0 } : { delay: 0.9, duration: 0.4 }
          }
          className="mt-8 flex justify-center"
        >
          <Button size="lg" className="gap-2" onClick={onContinue}>
            <Sparkles className="h-4 w-4" />
            Build My Course
          </Button>
        </motion.div>
      </div>
    </div>
  )
}
