'use client'

import { useState, useCallback } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { MousePointerClick } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { FeedbackOverlay } from '@/components/lesson/feedback-overlay'
import { HintDrawer } from '@/components/lesson/hint-drawer'
import { cn } from '@/lib/utils'
import type { HotspotScreen } from '@/lib/schemas/content'
import { MAX_ATTEMPTS, type ScreenResult } from './shared/screen-utils'

interface HotspotScreenProps {
  screen: HotspotScreen
  onComplete: (result: ScreenResult) => void
}

// ─── HotspotScreenRenderer ─────────────────────────────────────────────

export function HotspotScreenRenderer({
  screen,
  onComplete,
}: HotspotScreenProps) {
  const prefersReduced = useReducedMotion() ?? false

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [phase, setPhase] = useState<'selecting' | 'feedback' | 'revealed'>(
    'selecting'
  )
  const [lastAnswerCorrect, setLastAnswerCorrect] = useState(false)
  const [attempts, setAttempts] = useState(0)
  const [hintsUsed, setHintsUsed] = useState(0)
  const [hotspotStatuses, setHotspotStatuses] = useState<
    Record<string, 'idle' | 'selected' | 'correct' | 'incorrect'>
  >({})

  const handleHotspotClick = useCallback(
    (id: string) => {
      if (phase !== 'selecting') return

      setSelectedIds((prev) => {
        const next = new Set(prev)

        if (screen.selectionMode === 'single') {
          // Single mode: select only this one (toggle off if already selected)
          if (next.has(id)) {
            next.delete(id)
          } else {
            next.clear()
            next.add(id)
          }
        } else {
          // Multiple mode: toggle selection
          if (next.has(id)) {
            next.delete(id)
          } else {
            next.add(id)
          }
        }

        return next
      })

      // Reset any previous feedback statuses when user changes selection
      setHotspotStatuses({})
    },
    [phase, screen.selectionMode]
  )

  const handleHotspotKeyDown = useCallback(
    (e: React.KeyboardEvent, id: string) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        handleHotspotClick(id)
      }
    },
    [handleHotspotClick]
  )

  const handleCheckAnswer = useCallback(() => {
    if (phase !== 'selecting' || selectedIds.size === 0) return

    const newAttempts = attempts + 1
    setAttempts(newAttempts)

    const correctSet = new Set(screen.correctHotspotIds)
    const isCorrect =
      selectedIds.size === correctSet.size &&
      [...selectedIds].every((id) => correctSet.has(id))

    // Build statuses for all hotspots
    const statuses: Record<string, 'idle' | 'selected' | 'correct' | 'incorrect'> = {}
    for (const hotspot of screen.hotspots) {
      const wasSelected = selectedIds.has(hotspot.id)
      const isTarget = correctSet.has(hotspot.id)

      if (wasSelected && isTarget) {
        statuses[hotspot.id] = 'correct'
      } else if (wasSelected && !isTarget) {
        statuses[hotspot.id] = 'incorrect'
      } else if (!wasSelected && isTarget && (isCorrect || newAttempts >= MAX_ATTEMPTS)) {
        // Reveal missed correct hotspots on success or final attempt
        statuses[hotspot.id] = 'correct'
      } else {
        statuses[hotspot.id] = 'idle'
      }
    }
    setHotspotStatuses(statuses)
    setLastAnswerCorrect(isCorrect)

    if (isCorrect) {
      setPhase('feedback')
    } else if (newAttempts >= MAX_ATTEMPTS) {
      setPhase('revealed')
    } else {
      setPhase('feedback')
    }
  }, [phase, attempts, selectedIds, screen.correctHotspotIds, screen.hotspots])

  const handleRetry = useCallback(() => {
    setPhase('selecting')
    setLastAnswerCorrect(false)
    setSelectedIds(new Set())
    setHotspotStatuses({})
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
          <MousePointerClick className="h-3.5 w-3.5" />
          {screen.instruction}
        </p>
      </motion.div>

      {/* Image with hotspot overlays */}
      <motion.div
        initial={prefersReduced ? false : { opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{
          duration: prefersReduced ? 0 : 0.45,
          delay: prefersReduced ? 0 : 0.1,
          ease: [0.25, 0.4, 0.25, 1],
        }}
        className="relative rounded-xl overflow-hidden border border-[var(--glass-border)]"
      >
        {/* Base image */}
        <img
          src={screen.imageUrl}
          alt={screen.imageAlt}
          className="block w-full h-auto select-none"
          draggable={false}
        />

        {/* Hotspot regions */}
        {screen.hotspots.map((hotspot, index) => {
          const status = hotspotStatuses[hotspot.id] ?? (selectedIds.has(hotspot.id) ? 'selected' : 'idle')
          const isInteractive = phase === 'selecting'

          return (
            <motion.div
              key={hotspot.id}
              initial={prefersReduced ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{
                duration: prefersReduced ? 0 : 0.3,
                delay: prefersReduced ? 0 : 0.2 + index * 0.04,
              }}
              role="button"
              tabIndex={isInteractive ? 0 : -1}
              aria-label={`${hotspot.label}${status === 'selected' ? ' (selected)' : ''}${status === 'correct' ? ' (correct)' : ''}${status === 'incorrect' ? ' (incorrect)' : ''}`}
              aria-pressed={status === 'selected'}
              onClick={() => isInteractive && handleHotspotClick(hotspot.id)}
              onKeyDown={(e) => isInteractive && handleHotspotKeyDown(e, hotspot.id)}
              className={cn(
                'absolute border-2 rounded-lg transition-colors duration-150',
                // Idle — invisible, hover reveals
                status === 'idle' &&
                  isInteractive &&
                  'border-transparent cursor-pointer hover:border-primary/20 hover:bg-primary/5',
                status === 'idle' &&
                  !isInteractive &&
                  'border-transparent',
                // Selected
                status === 'selected' &&
                  'border-primary bg-primary/15 cursor-pointer',
                // Correct
                status === 'correct' &&
                  'border-emerald-500 bg-emerald-500/20',
                // Incorrect
                status === 'incorrect' &&
                  'border-red-500 bg-red-500/20',
                // Focus visible ring
                isInteractive &&
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 ring-offset-background'
              )}
              style={{
                left: `${hotspot.x - hotspot.width / 2}%`,
                top: `${hotspot.y - hotspot.height / 2}%`,
                width: `${hotspot.width}%`,
                height: `${hotspot.height}%`,
              }}
            />
          )
        })}
      </motion.div>

      {/* Selection count indicator for multiple mode */}
      {phase === 'selecting' && screen.selectionMode === 'multiple' && selectedIds.size > 0 && (
        <motion.p
          initial={prefersReduced ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: prefersReduced ? 0 : 0.2 }}
          className="text-sm text-muted-foreground text-center"
        >
          {selectedIds.size} region{selectedIds.size !== 1 ? 's' : ''} selected
        </motion.p>
      )}

      {/* Check Answer button */}
      {phase === 'selecting' && (
        <motion.div
          initial={prefersReduced ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: prefersReduced ? 0 : 0.2 }}
          className="flex justify-end"
        >
          <Button
            onClick={handleCheckAnswer}
            disabled={selectedIds.size === 0}
            size="lg"
            className="px-8"
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
              Here&apos;s where the correct region{screen.correctHotspotIds.length !== 1 ? 's are' : ' is'}:
            </p>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              {screen.explanation}
            </p>
          </div>
          <div className="flex justify-end">
            <Button onClick={handleRevealedContinue} size="lg" className="px-8">
              Continue
            </Button>
          </div>
        </motion.div>
      )}

      {/* Hint drawer */}
      {phase === 'selecting' && (
        <HintDrawer hints={screen.hints} onHintUsed={handleHintUsed} />
      )}
    </div>
  )
}
