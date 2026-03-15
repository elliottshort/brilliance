'use client'

import { useState, useCallback, useMemo, useRef } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { Tag, GripHorizontal } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { FeedbackOverlay } from '@/components/lesson/feedback-overlay'
import { HintDrawer } from '@/components/lesson/hint-drawer'
import { cn } from '@/lib/utils'
import type { DiagramLabelScreen } from '@/lib/schemas/content'
import { MAX_ATTEMPTS, type ScreenResult } from './shared/screen-utils'

interface DiagramLabelScreenProps {
  screen: DiagramLabelScreen
  onComplete: (result: ScreenResult) => void
}

/** Proximity threshold — percentage distance under which a label snaps to a target */
const SNAP_THRESHOLD = 8

/**
 * Deterministic shuffle seeded from screen ID for consistent initial order.
 * Uses a simple hash-based PRNG (xorshift32 variant).
 */
function seededShuffle<T>(arr: T[], seed: string): T[] {
  const result = [...arr]
  let hash = 0
  for (let i = 0; i < seed.length; i++) {
    hash = (hash << 5) - hash + seed.charCodeAt(i)
    hash |= 0
  }

  const shuffle = (h: number) => {
    const copy = [...result]
    for (let i = copy.length - 1; i > 0; i--) {
      h ^= h << 13
      h ^= h >> 17
      h ^= h << 5
      const j = (h >>> 0) % (i + 1)
      ;[copy[i], copy[j]] = [copy[j], copy[i]]
    }
    return copy
  }

  const shuffled = shuffle(hash)

  // If by chance the shuffle produced the original order, swap the first two
  const isIdentical = shuffled.every((item, i) => item === arr[i])
  if (isIdentical && shuffled.length > 1) {
    ;[shuffled[0], shuffled[1]] = [shuffled[1], shuffled[0]]
  }

  return shuffled
}

// ─── DraggableLabel ─────────────────────────────────────────────────────

interface DraggableLabelProps {
  label: { id: string; text: string }
  index: number
  status: 'idle' | 'correct' | 'incorrect'
  disabled: boolean
  prefersReduced: boolean
  onDragEnd: (labelId: string, info: { point: { x: number; y: number } }) => void
}

function DraggableLabel({
  label,
  index,
  status,
  disabled,
  prefersReduced,
  onDragEnd,
}: DraggableLabelProps) {
  return (
    <motion.div
      drag={!disabled}
      dragSnapToOrigin
      dragElastic={0.15}
      dragMomentum={false}
      whileDrag={
        prefersReduced
          ? undefined
          : {
              scale: 1.08,
              boxShadow: 'var(--glass-shadow-outer)',
              zIndex: 50,
            }
      }
      onDragEnd={(_e, info) => {
        onDragEnd(label.id, { point: info.point })
      }}
      initial={prefersReduced ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: prefersReduced ? 0 : 0.3,
        delay: prefersReduced ? 0 : index * 0.04,
        ease: [0.25, 0.4, 0.25, 1],
      }}
      style={{ position: 'relative', zIndex: 1 }}
      className={cn(
        'flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm font-medium select-none',
        'transition-colors duration-150',
        !disabled && 'cursor-grab active:cursor-grabbing',
        disabled && 'cursor-default',
        status === 'idle' &&
          'border-[var(--glass-border)] bg-card text-foreground/85 hover:border-primary/30 hover:bg-accent/40',
        status === 'correct' &&
          'border-emerald-400 bg-emerald-50/60 text-emerald-900 dark:border-emerald-500/60 dark:bg-emerald-950/25 dark:text-emerald-100',
        status === 'incorrect' &&
          'border-red-400 bg-red-50/60 text-red-900 dark:border-red-500/60 dark:bg-red-950/25 dark:text-red-100'
      )}
      aria-label={`Draggable label: ${label.text}`}
      role="listitem"
    >
      <GripHorizontal
        className={cn(
          'h-3.5 w-3.5 shrink-0 text-muted-foreground/40',
          disabled && 'opacity-30'
        )}
      />
      {label.text}
    </motion.div>
  )
}

// ─── PlacedLabel ────────────────────────────────────────────────────────

interface PlacedLabelProps {
  label: { id: string; text: string }
  targetX: number
  targetY: number
  status: 'placed' | 'correct' | 'incorrect' | 'locked'
  disabled: boolean
  prefersReduced: boolean
  onRemove: (labelId: string) => void
}

function PlacedLabel({
  label,
  targetX,
  targetY,
  status,
  disabled,
  prefersReduced,
  onRemove,
}: PlacedLabelProps) {
  return (
    <motion.button
      type="button"
      initial={prefersReduced ? false : { scale: 0.85, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={
        prefersReduced
          ? { duration: 0 }
          : { type: 'spring', stiffness: 400, damping: 25 }
      }
      onClick={!disabled ? () => onRemove(label.id) : undefined}
      className={cn(
        'absolute -translate-x-1/2 -translate-y-1/2 rounded-lg border px-2.5 py-1 text-xs font-semibold',
        'whitespace-nowrap shadow-sm',
        'transition-colors duration-150',
        !disabled && 'cursor-pointer hover:ring-2 hover:ring-primary/30',
        disabled && 'cursor-default',
        status === 'placed' &&
          'border-primary/40 bg-primary/10 text-primary dark:border-primary/50 dark:bg-primary/15',
        status === 'correct' &&
          'border-emerald-400 bg-emerald-50/80 text-emerald-800 dark:border-emerald-500/60 dark:bg-emerald-950/40 dark:text-emerald-200',
        status === 'incorrect' &&
          'border-red-400 bg-red-50/80 text-red-800 dark:border-red-500/60 dark:bg-red-950/40 dark:text-red-200',
        status === 'locked' &&
          'border-[var(--glass-border)] bg-[var(--glass-bg-subtle)] text-muted-foreground/70'
      )}
      style={{
        left: `${targetX}%`,
        top: `${targetY}%`,
        zIndex: 10,
      }}
      aria-label={`Placed label: ${label.text}. ${!disabled ? 'Click to remove.' : ''}`}
    >
      {label.text}
    </motion.button>
  )
}

// ─── DiagramLabelScreenRenderer ─────────────────────────────────────────

export function DiagramLabelScreenRenderer({
  screen,
  onComplete,
}: DiagramLabelScreenProps) {
  const prefersReduced = useReducedMotion() ?? false
  const imageContainerRef = useRef<HTMLDivElement>(null)

  const shuffledLabels = useMemo(
    () => seededShuffle(screen.labels, screen.id),
    [screen.labels, screen.id]
  )

  // Which label ID is placed at which target label ID
  const [placements, setPlacements] = useState<Record<string, string>>({})
  const [phase, setPhase] = useState<'labeling' | 'feedback' | 'revealed'>(
    'labeling'
  )
  const [lastAnswerCorrect, setLastAnswerCorrect] = useState(false)
  const [attempts, setAttempts] = useState(0)
  const [hintsUsed, setHintsUsed] = useState(0)
  const [labelStatuses, setLabelStatuses] = useState<
    Record<string, 'idle' | 'correct' | 'incorrect'>
  >({})
  const [placedStatuses, setPlacedStatuses] = useState<
    Record<string, 'placed' | 'correct' | 'incorrect' | 'locked'>
  >({})

  /** Labels not yet placed on the diagram */
  const unplacedLabels = useMemo(() => {
    const placedLabelIds = new Set(Object.values(placements))
    return shuffledLabels.filter((l) => !placedLabelIds.has(l.id))
  }, [shuffledLabels, placements])

  /** Invert placements: labelId → targetLabelId */
  const labelToTarget = useMemo(() => {
    const map: Record<string, string> = {}
    for (const [targetId, labelId] of Object.entries(placements)) {
      map[labelId] = targetId
    }
    return map
  }, [placements])

  /** Find the closest empty target to a screen-space point, within threshold */
  const findClosestTarget = useCallback(
    (pointX: number, pointY: number) => {
      const container = imageContainerRef.current
      if (!container) return null

      const rect = container.getBoundingClientRect()
      // Convert screen point to percentage within container
      const pctX = ((pointX - rect.left) / rect.width) * 100
      const pctY = ((pointY - rect.top) / rect.height) * 100

      let closest: { id: string; dist: number } | null = null

      for (const label of screen.labels) {
        // Skip targets that already have a label placed
        if (placements[label.id]) continue

        const dx = pctX - label.targetX
        const dy = pctY - label.targetY
        const dist = Math.sqrt(dx * dx + dy * dy)

        if (dist <= SNAP_THRESHOLD && (!closest || dist < closest.dist)) {
          closest = { id: label.id, dist }
        }
      }

      return closest
    },
    [screen.labels, placements]
  )

  const handleDragEnd = useCallback(
    (labelId: string, info: { point: { x: number; y: number } }) => {
      if (phase !== 'labeling') return

      const target = findClosestTarget(info.point.x, info.point.y)
      if (target) {
        setPlacements((prev) => ({ ...prev, [target.id]: labelId }))
        setPlacedStatuses((prev) => ({ ...prev, [labelId]: 'placed' }))
        // Clear any previous label statuses on new placement
        setLabelStatuses({})
      }
    },
    [phase, findClosestTarget]
  )

  const handleRemoveLabel = useCallback(
    (labelId: string) => {
      if (phase !== 'labeling') return

      const targetId = labelToTarget[labelId]
      if (targetId) {
        setPlacements((prev) => {
          const next = { ...prev }
          delete next[targetId]
          return next
        })
        setPlacedStatuses((prev) => {
          const next = { ...prev }
          delete next[labelId]
          return next
        })
        setLabelStatuses({})
      }
    },
    [phase, labelToTarget]
  )

  const handleCheckAnswer = useCallback(() => {
    if (phase !== 'labeling') return

    const newAttempts = attempts + 1
    setAttempts(newAttempts)

    // Check: each target should have its own label placed on it
    const isCorrect = screen.labels.every(
      (label) => placements[label.id] === label.id
    )

    // Calculate per-label statuses
    const newLabelStatuses: Record<string, 'idle' | 'correct' | 'incorrect'> =
      {}
    const newPlacedStatuses: Record<
      string,
      'placed' | 'correct' | 'incorrect' | 'locked'
    > = {}

    for (const label of screen.labels) {
      const placedLabelId = placements[label.id]
      if (placedLabelId) {
        const correct = placedLabelId === label.id
        newLabelStatuses[placedLabelId] = correct ? 'correct' : 'incorrect'
        newPlacedStatuses[placedLabelId] = correct ? 'correct' : 'incorrect'
      }
    }

    // Unplaced labels are incorrect
    for (const label of screen.labels) {
      if (!placements[label.id]) {
        // This target has no label — mark nothing, but any unplaced label is "idle"
      }
      if (!newLabelStatuses[label.id]) {
        newLabelStatuses[label.id] = 'idle'
      }
    }

    setLabelStatuses(newLabelStatuses)
    setPlacedStatuses(newPlacedStatuses)
    setLastAnswerCorrect(isCorrect)

    if (isCorrect) {
      setPhase('feedback')
    } else if (newAttempts >= MAX_ATTEMPTS) {
      // Reveal: snap all labels to correct positions
      const correctPlacements: Record<string, string> = {}
      const lockedStatuses: Record<string, 'locked'> = {}
      for (const label of screen.labels) {
        correctPlacements[label.id] = label.id
        lockedStatuses[label.id] = 'locked'
      }
      setPlacements(correctPlacements)
      setPlacedStatuses(lockedStatuses)
      setLabelStatuses({})
      setPhase('revealed')
    } else {
      setPhase('feedback')
    }
  }, [phase, attempts, placements, screen.labels])

  const handleRetry = useCallback(() => {
    setPhase('labeling')
    setLastAnswerCorrect(false)
    setLabelStatuses({})
    setPlacedStatuses((prev) => {
      const reset: Record<string, 'placed' | 'correct' | 'incorrect' | 'locked'> = {}
      for (const labelId of Object.keys(prev)) {
        reset[labelId] = 'placed'
      }
      return reset
    })
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

  const isDragDisabled = phase !== 'labeling'
  const allPlaced = unplacedLabels.length === 0

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
          <Tag className="h-3.5 w-3.5" />
          {screen.instruction}
        </p>
      </motion.div>

      {/* Diagram image with target markers */}
      <motion.div
        ref={imageContainerRef}
        initial={prefersReduced ? false : { opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{
          duration: prefersReduced ? 0 : 0.4,
          delay: prefersReduced ? 0 : 0.1,
          ease: [0.25, 0.4, 0.25, 1],
        }}
        className="relative rounded-xl overflow-hidden border border-[var(--glass-border)] bg-[var(--glass-bg-subtle)]"
      >
        {/* Diagram image */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={screen.imageUrl}
          alt={screen.imageAlt}
          className="block w-full h-auto"
          draggable={false}
        />

        {/* Target position markers */}
        {screen.labels.map((label) => {
          const placedLabelId = placements[label.id]
          const isEmpty = !placedLabelId
          const placedLabel = placedLabelId
            ? screen.labels.find((l) => l.id === placedLabelId)
            : null

          return (
            <div key={`target-${label.id}`}>
              {/* Target marker circle */}
              <motion.div
                initial={prefersReduced ? false : { scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{
                  duration: prefersReduced ? 0 : 0.3,
                  delay: prefersReduced ? 0 : 0.2,
                  type: 'spring',
                  stiffness: 300,
                  damping: 20,
                }}
                className={cn(
                  'absolute w-8 h-8 -translate-x-1/2 -translate-y-1/2 rounded-full',
                  'transition-all duration-200',
                  isEmpty &&
                    'border-2 border-dashed border-primary/40 bg-primary/5',
                  !isEmpty &&
                    'border-2 border-solid border-primary/60 bg-primary/10'
                )}
                style={{
                  left: `${label.targetX}%`,
                  top: `${label.targetY}%`,
                  zIndex: 5,
                }}
                aria-hidden="true"
              />

              {/* Placed label at target position */}
              {placedLabel && (
                <PlacedLabel
                  label={placedLabel}
                  targetX={label.targetX}
                  targetY={label.targetY > 12 ? label.targetY - 6 : label.targetY + 6}
                  status={placedStatuses[placedLabelId] ?? 'placed'}
                  disabled={isDragDisabled}
                  prefersReduced={prefersReduced}
                  onRemove={handleRemoveLabel}
                />
              )}
            </div>
          )
        })}
      </motion.div>

      {/* Unplaced labels tray */}
      {unplacedLabels.length > 0 && (
        <motion.div
          initial={prefersReduced ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            duration: prefersReduced ? 0 : 0.3,
            delay: prefersReduced ? 0 : 0.15,
          }}
          className="space-y-3"
        >
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground/60">
            Drag labels to the diagram
          </p>
          <div
            className="flex flex-wrap gap-2"
            role="list"
            aria-label="Available labels"
          >
            {unplacedLabels.map((label, index) => (
              <DraggableLabel
                key={label.id}
                label={label}
                index={index}
                status={labelStatuses[label.id] ?? 'idle'}
                disabled={isDragDisabled}
                prefersReduced={prefersReduced}
                onDragEnd={handleDragEnd}
              />
            ))}
          </div>
        </motion.div>
      )}

      {/* "All placed" indicator + check button */}
      {phase === 'labeling' && allPlaced && (
        <motion.div
          initial={prefersReduced ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: prefersReduced ? 0 : 0.2 }}
          className="space-y-3"
        >
          <p className="text-xs font-medium text-muted-foreground/60">
            All labels placed — check your answer or click labels on the diagram to
            remove them.
          </p>
        </motion.div>
      )}

      {/* Check Answer button */}
      {phase === 'labeling' && (
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
            disabled={!allPlaced}
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
              Here&apos;s the correct placement:
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
      {phase === 'labeling' && (
        <HintDrawer hints={screen.hints} onHintUsed={handleHintUsed} />
      )}
    </div>
  )
}
