'use client'

import { useState, useCallback, useMemo, useRef } from 'react'
import {
  motion,
  Reorder,
  useDragControls,
  useReducedMotion,
} from 'framer-motion'
import { GripVertical, ArrowUpDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { FeedbackOverlay } from '@/components/lesson/feedback-overlay'
import { HintDrawer } from '@/components/lesson/hint-drawer'
import { cn } from '@/lib/utils'
import type { ProcessStepperScreen } from '@/lib/schemas/content'

interface ScreenResult {
  screenId: string
  answeredCorrectly: boolean
  attempts: number
  hintsUsed: number
  answeredAt: string
}

const MAX_ATTEMPTS = 3

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

  // Ensure the shuffle is never in correct order — keep re-seeding if needed
  const shuffle = (h: number) => {
    const copy = [...result]
    for (let i = copy.length - 1; i > 0; i--) {
      h ^= h << 13
      h ^= h >> 17
      h ^= h << 5
      const j = ((h >>> 0) % (i + 1))
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

// ─── ReorderItem ────────────────────────────────────────────────────────

interface ReorderItemProps {
  item: { id: string; text: string; justification?: string }
  index: number
  status: 'idle' | 'correct' | 'incorrect' | 'locked'
  disabled: boolean
  groupRef: React.RefObject<HTMLDivElement | null>
  prefersReduced: boolean
  showJustification: boolean
  justificationPrompt: string
  justificationValue: string
  justificationStatus: 'idle' | 'correct' | 'incorrect'
  onJustificationChange: (id: string, value: string) => void
}

function ReorderItem({
  item,
  index,
  status,
  disabled,
  groupRef,
  prefersReduced,
  showJustification,
  justificationPrompt,
  justificationValue,
  justificationStatus,
  onJustificationChange,
}: ReorderItemProps) {
  const controls = useDragControls()

  return (
    <Reorder.Item
      value={item}
      as="div"
      dragListener={false}
      dragControls={controls}
      dragConstraints={groupRef}
      dragElastic={0.065}
      layout="position"
      initial={prefersReduced ? false : { opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{
        duration: prefersReduced ? 0 : 0.35,
        delay: prefersReduced ? 0 : index * 0.05,
        ease: [0.25, 0.4, 0.25, 1],
        layout: prefersReduced
          ? { duration: 0 }
          : { type: 'spring', stiffness: 400, damping: 30 },
      }}
      whileDrag={
        prefersReduced
          ? undefined
          : {
              scale: 1.03,
              boxShadow: 'var(--glass-shadow-outer)',
              zIndex: 50,
            }
      }
      style={{ position: 'relative' }}
      className={cn(
        'group flex flex-col gap-2 rounded-xl border-2 bg-card px-4 py-3.5 select-none',
        'transition-colors duration-150',
        // Idle
        status === 'idle' &&
          'border-[var(--glass-border)] hover:border-primary/30 hover:bg-accent/40',
        // Correct position
        status === 'correct' &&
          'border-emerald-400 bg-emerald-50/60 dark:border-emerald-500/60 dark:bg-emerald-950/25',
        // Incorrect position
        status === 'incorrect' &&
          'border-red-400 bg-red-50/60 dark:border-red-500/60 dark:bg-red-950/25',
        // Locked (after reveal)
        status === 'locked' && 'border-[var(--glass-border)] bg-[var(--glass-bg-subtle)]',
        disabled && 'cursor-default'
      )}
    >
      {/* Main row: drag handle + position badge + text */}
      <div className="flex items-center gap-3">
        {/* Drag handle */}
        <span
          onPointerDown={disabled ? undefined : (e) => controls.start(e)}
          className={cn(
            'flex shrink-0 items-center rounded-lg p-2 text-muted-foreground/50 touch-none',
            'transition-colors duration-150',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 ring-offset-background',
            !disabled &&
              'cursor-grab hover:text-foreground/70 hover:bg-[var(--glass-bg-subtle)] active:cursor-grabbing',
            disabled && 'cursor-default opacity-30'
          )}
          aria-label={`Drag to reorder: ${item.text}`}
        >
          <GripVertical className="h-5 w-5" />
        </span>

        {/* Position indicator */}
        <span
          className={cn(
            'flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-bold',
            'transition-colors duration-150',
            status === 'idle' && 'bg-[var(--glass-bg-subtle)] text-muted-foreground',
            status === 'correct' &&
              'bg-emerald-500 text-white dark:bg-emerald-600',
            status === 'incorrect' &&
              'bg-red-400 text-white dark:bg-red-500',
            status === 'locked' && 'bg-[var(--glass-bg-subtle)] text-muted-foreground/50'
          )}
        >
          {index + 1}
        </span>

        {/* Item text */}
        <span
          className={cn(
            'flex-1 text-sm font-medium leading-relaxed',
            status === 'idle' && 'text-foreground/85',
            status === 'correct' && 'text-emerald-900 dark:text-emerald-100',
            status === 'incorrect' && 'text-red-900 dark:text-red-100',
            status === 'locked' && 'text-muted-foreground/70'
          )}
        >
          {item.text}
        </span>
      </div>

      {/* Justification input — shown in justifying & revealed phases */}
      {showJustification && (
        <div className="pl-0 sm:pl-[5.5rem]">
          <input
            type="text"
            value={justificationValue}
            onChange={(e) => onJustificationChange(item.id, e.target.value)}
            placeholder={justificationPrompt}
            disabled={status === 'locked'}
            className={cn(
              'w-full rounded-lg border border-[var(--glass-border)] bg-card px-3 py-2 text-sm placeholder:text-muted-foreground/50',
              'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1 ring-offset-background',
              'transition-colors duration-150',
              'disabled:cursor-default disabled:opacity-60',
              justificationStatus === 'correct' &&
                'border-emerald-400 bg-emerald-50/30 dark:border-emerald-500/60 dark:bg-emerald-950/15',
              justificationStatus === 'incorrect' &&
                'border-red-400 bg-red-50/30 dark:border-red-500/60 dark:bg-red-950/15',
            )}
          />
        </div>
      )}
    </Reorder.Item>
  )
}

// ─── ProcessStepperScreenRenderer ───────────────────────────────────────

export function ProcessStepperScreenRenderer({
  screen,
  onComplete,
}: {
  screen: ProcessStepperScreen
  onComplete: (result: ScreenResult) => void
}) {
  const prefersReduced = useReducedMotion() ?? false
  const groupRef = useRef<HTMLDivElement>(null)

  /** Steps array is already in correct order per schema */
  const correctOrder = useMemo(() => screen.steps.map((s) => s.id), [screen.steps])

  const initialOrder = useMemo(
    () => seededShuffle(screen.steps.map((step) => step.id), screen.id),
    [screen.steps, screen.id]
  )

  const [orderedIds, setOrderedIds] = useState<string[]>(initialOrder)
  const [phase, setPhase] = useState<'ordering' | 'justifying' | 'feedback' | 'revealed'>(
    'ordering'
  )
  const [lastAnswerCorrect, setLastAnswerCorrect] = useState(false)
  const [attempts, setAttempts] = useState(0)
  const [hintsUsed, setHintsUsed] = useState(0)
  const [itemStatuses, setItemStatuses] = useState<
    Record<string, 'idle' | 'correct' | 'incorrect' | 'locked'>
  >({})
  const [justifications, setJustifications] = useState<Record<string, string>>({})
  const [justificationStatuses, setJustificationStatuses] = useState<
    Record<string, 'idle' | 'correct' | 'incorrect'>
  >({})

  /** Derived ordered step objects — Reorder.Group needs value objects, not bare IDs */
  const orderedSteps = useMemo(
    () => orderedIds.map((id) => screen.steps.find((s) => s.id === id)!),
    [orderedIds, screen.steps]
  )

  const handleJustificationChange = useCallback((id: string, value: string) => {
    setJustifications((prev) => ({ ...prev, [id]: value }))
    setJustificationStatuses((prev) => ({ ...prev, [id]: 'idle' }))
  }, [])

  const handleCheckAnswer = useCallback(() => {
    if (phase !== 'ordering' && phase !== 'justifying') return

    const newAttempts = attempts + 1
    setAttempts(newAttempts)

    // Check ordering
    const orderCorrect = orderedIds.every(
      (id, index) => id === correctOrder[index]
    )

    const statuses: Record<string, 'idle' | 'correct' | 'incorrect' | 'locked'> = {}
    orderedIds.forEach((id, index) => {
      statuses[id] = id === correctOrder[index] ? 'correct' : 'incorrect'
    })
    setItemStatuses(statuses)

    // Check justifications if required
    let justificationsCorrect = true
    if (screen.requireJustification) {
      const justStatuses: Record<string, 'idle' | 'correct' | 'incorrect'> = {}
      for (const step of screen.steps) {
        if (step.justification) {
          const userJust = (justifications[step.id] ?? '').toLowerCase()
          const expected = step.justification.toLowerCase()
          const isMatch = userJust.includes(expected)
          justStatuses[step.id] = isMatch ? 'correct' : 'incorrect'
          if (!isMatch) justificationsCorrect = false
        } else {
          justStatuses[step.id] = 'correct'
        }
      }
      setJustificationStatuses(justStatuses)
    }

    const isCorrect = orderCorrect && justificationsCorrect
    setLastAnswerCorrect(isCorrect)

    if (isCorrect) {
      setPhase('feedback')
    } else if (newAttempts >= MAX_ATTEMPTS) {
      setOrderedIds([...correctOrder])
      const lockedStatuses: Record<string, 'locked'> = {}
      correctOrder.forEach((id) => {
        lockedStatuses[id] = 'locked'
      })
      setItemStatuses(lockedStatuses)
      setPhase('revealed')
    } else {
      setPhase('feedback')
    }
  }, [phase, attempts, orderedIds, correctOrder, screen.requireJustification, screen.steps, justifications])

  const handleRetry = useCallback(() => {
    setPhase('ordering')
    setLastAnswerCorrect(false)
    setItemStatuses({})
    setJustificationStatuses({})
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

  const isDragDisabled = phase !== 'ordering'

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
          <ArrowUpDown className="h-3.5 w-3.5" />
          {phase === 'justifying'
            ? (screen.justificationPrompt ?? 'Explain why each step belongs in this position')
            : 'Drag steps into the correct order'}
        </p>
      </motion.div>

      {/* Reorderable step list */}
      <Reorder.Group
        ref={groupRef}
        axis="y"
        values={orderedSteps}
        onReorder={(newItems) => {
          if (phase === 'ordering') {
            setOrderedIds(newItems.map((item) => item.id))
            setItemStatuses({})
          }
        }}
        as="div"
        className="space-y-2"
      >
        {orderedSteps.map((step, index) => (
          <ReorderItem
            key={step.id}
            item={step}
            index={index}
            status={itemStatuses[step.id] ?? 'idle'}
            disabled={isDragDisabled}
            groupRef={groupRef}
            prefersReduced={prefersReduced}
            showJustification={
              (phase === 'justifying') ||
              (phase === 'revealed' && screen.requireJustification)
            }
            justificationPrompt={screen.justificationPrompt ?? 'Why does this step come here?'}
            justificationValue={
              phase === 'revealed'
                ? (step.justification ?? '')
                : (justifications[step.id] ?? '')
            }
            justificationStatus={justificationStatuses[step.id] ?? 'idle'}
            onJustificationChange={handleJustificationChange}
          />
        ))}
      </Reorder.Group>

      {/* Ordering phase: Continue (if justification needed) or Check Answer */}
      {phase === 'ordering' && (
        <motion.div
          initial={prefersReduced ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: prefersReduced ? 0 : 0.2 }}
          className="flex justify-end"
        >
          <Button
            onClick={
              screen.requireJustification
                ? () => setPhase('justifying')
                : handleCheckAnswer
            }
            size="lg"
            className="px-8"
          >
            {screen.requireJustification ? 'Continue' : 'Check Answer'}
          </Button>
        </motion.div>
      )}

      {/* Justifying phase: Check Answer */}
      {phase === 'justifying' && (
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
              Here&apos;s the correct order:
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

      {/* Hint drawer — available in ordering and justifying phases */}
      {(phase === 'ordering' || phase === 'justifying') && (
        <HintDrawer hints={screen.hints} onHintUsed={handleHintUsed} />
      )}
    </div>
  )
}
