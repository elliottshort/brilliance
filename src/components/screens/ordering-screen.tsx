'use client'

import { useState, useCallback, useMemo } from 'react'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
  sortableKeyboardCoordinates,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { motion } from 'framer-motion'
import { GripVertical, ArrowUpDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { FeedbackOverlay } from '@/components/lesson/feedback-overlay'
import { HintDrawer } from '@/components/lesson/hint-drawer'
import { cn } from '@/lib/utils'
import type { OrderingScreen } from '@/lib/schemas/content'

interface ScreenResult {
  screenId: string
  answeredCorrectly: boolean
  attempts: number
  hintsUsed: number
  answeredAt: string
}

interface OrderingScreenProps {
  screen: OrderingScreen
  onComplete: (result: ScreenResult) => void
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

// ─── SortableItem ───────────────────────────────────────────────────────

interface SortableItemProps {
  id: string
  text: string
  index: number
  status: 'idle' | 'correct' | 'incorrect' | 'locked'
  disabled: boolean
}

function SortableItem({ id, text, index, status, disabled }: SortableItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id, disabled })

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : undefined,
  }

  return (
    <motion.div
      ref={setNodeRef}
      style={style}
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{
        duration: 0.35,
        delay: index * 0.05,
        ease: [0.25, 0.4, 0.25, 1],
      }}
      className={cn(
        'group flex items-center gap-3 rounded-xl border-2 bg-card px-4 py-3.5 select-none',
        'transition-colors duration-150',
        // Idle
        status === 'idle' &&
          'border-border/60 hover:border-primary/30 hover:bg-accent/40',
        // Correct position
        status === 'correct' &&
          'border-emerald-400 bg-emerald-50/60 dark:border-emerald-500/60 dark:bg-emerald-950/25',
        // Incorrect position
        status === 'incorrect' &&
          'border-red-400 bg-red-50/60 dark:border-red-500/60 dark:bg-red-950/25',
        // Locked (after reveal)
        status === 'locked' &&
          'border-border/40 bg-muted/20',
        // Dragging
        isDragging && 'shadow-lg shadow-primary/10 border-primary/50 bg-card z-50',
        disabled && 'cursor-default'
      )}
    >
      {/* Drag handle */}
      <span
        {...attributes}
        {...listeners}
        className={cn(
          'flex shrink-0 cursor-grab items-center rounded-lg p-2 text-muted-foreground/50',
          'transition-colors duration-150',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 ring-offset-background',
          !disabled && 'hover:text-foreground/70 hover:bg-muted/50 active:cursor-grabbing',
          isDragging && 'cursor-grabbing text-primary',
          disabled && 'cursor-default opacity-30'
        )}
        aria-label={`Drag to reorder: ${text}`}
      >
        <GripVertical className="h-5 w-5" />
      </span>

      {/* Position indicator */}
      <span
        className={cn(
          'flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-bold',
          'transition-colors duration-150',
          status === 'idle' && 'bg-muted text-muted-foreground',
          status === 'correct' &&
            'bg-emerald-500 text-white dark:bg-emerald-600',
          status === 'incorrect' &&
            'bg-red-400 text-white dark:bg-red-500',
          status === 'locked' && 'bg-muted/60 text-muted-foreground/50'
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
        {text}
      </span>
    </motion.div>
  )
}

// ─── OrderingScreenRenderer ─────────────────────────────────────────────

export function OrderingScreenRenderer({
  screen,
  onComplete,
}: OrderingScreenProps) {
  const initialOrder = useMemo(
    () => seededShuffle(screen.items.map((item) => item.id), screen.id),
    [screen.items, screen.id]
  )

  const [orderedIds, setOrderedIds] = useState<string[]>(initialOrder)
  const [phase, setPhase] = useState<'ordering' | 'feedback' | 'revealed'>(
    'ordering'
  )
  const [lastAnswerCorrect, setLastAnswerCorrect] = useState(false)
  const [attempts, setAttempts] = useState(0)
  const [hintsUsed, setHintsUsed] = useState(0)
  const [itemStatuses, setItemStatuses] = useState<
    Record<string, 'idle' | 'correct' | 'incorrect' | 'locked'>
  >({})

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 4 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const itemMap = useMemo(() => {
    const map: Record<string, string> = {}
    for (const item of screen.items) {
      map[item.id] = item.text
    }
    return map
  }, [screen.items])

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event
      if (over && active.id !== over.id) {
        setOrderedIds((prev) => {
          const oldIndex = prev.indexOf(active.id as string)
          const newIndex = prev.indexOf(over.id as string)
          return arrayMove(prev, oldIndex, newIndex)
        })
        setItemStatuses({})
      }
    },
    []
  )

  const handleCheckAnswer = useCallback(() => {
    if (phase !== 'ordering') return

    const newAttempts = attempts + 1
    setAttempts(newAttempts)

    const isCorrect = orderedIds.every(
      (id, index) => id === screen.correctOrder[index]
    )

    const statuses: Record<string, 'idle' | 'correct' | 'incorrect' | 'locked'> = {}
    orderedIds.forEach((id, index) => {
      statuses[id] = id === screen.correctOrder[index] ? 'correct' : 'incorrect'
    })
    setItemStatuses(statuses)
    setLastAnswerCorrect(isCorrect)

    if (isCorrect) {
      setPhase('feedback')
    } else if (newAttempts >= MAX_ATTEMPTS) {
      setOrderedIds([...screen.correctOrder])
      const lockedStatuses: Record<string, 'locked'> = {}
      screen.correctOrder.forEach((id) => {
        lockedStatuses[id] = 'locked'
      })
      setItemStatuses(lockedStatuses)
      setPhase('revealed')
    } else {
      setPhase('feedback')
    }
  }, [phase, attempts, orderedIds, screen.correctOrder])

  const handleRetry = useCallback(() => {
    setPhase('ordering')
    setLastAnswerCorrect(false)
    setItemStatuses({})
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
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.25, 0.4, 0.25, 1] }}
      >
        <h2 className="text-2xl font-bold tracking-tight text-foreground">
          {screen.title}
        </h2>
        <p className="mt-2 flex items-center gap-1.5 text-sm text-muted-foreground">
          <ArrowUpDown className="h-3.5 w-3.5" />
          Drag items into the correct order
        </p>
      </motion.div>

      {/* Sortable item list */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={orderedIds}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-2">
            {orderedIds.map((id, index) => (
              <SortableItem
                key={id}
                id={id}
                text={itemMap[id]}
                index={index}
                status={itemStatuses[id] ?? 'idle'}
                disabled={isDragDisabled}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {/* Check Answer button */}
      {phase === 'ordering' && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.2 }}
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
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: [0.25, 0.4, 0.25, 1] }}
          className="space-y-4"
        >
          <div className="rounded-xl border border-border/60 bg-muted/30 p-5">
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

      {/* Hint drawer */}
      {phase === 'ordering' && (
        <HintDrawer hints={screen.hints} onHintUsed={handleHintUsed} />
      )}
    </div>
  )
}
