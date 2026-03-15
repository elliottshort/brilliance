'use client'

import { useState, useCallback, useMemo, useRef } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { Layers } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { FeedbackOverlay } from '@/components/lesson/feedback-overlay'
import { HintDrawer } from '@/components/lesson/hint-drawer'
import { cn } from '@/lib/utils'
import type { CategorizationScreen } from '@/lib/schemas/content'

interface ScreenResult {
  screenId: string
  answeredCorrectly: boolean
  attempts: number
  hintsUsed: number
  answeredAt: string
}

interface CategorizationScreenProps {
  screen: CategorizationScreen
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

// ─── DraggableItem ──────────────────────────────────────────────────────

type ItemStatus = 'idle' | 'correct' | 'incorrect' | 'locked'

interface DraggableItemProps {
  item: { id: string; text: string; categoryId: string }
  status: ItemStatus
  disabled: boolean
  selected: boolean
  prefersReduced: boolean
  index: number
  onDragEnd: (itemId: string, point: { x: number; y: number }) => void
  onSelect: (itemId: string) => void
  onKeyDown: (itemId: string, e: React.KeyboardEvent) => void
}

function DraggableItem({
  item,
  status,
  disabled,
  selected,
  prefersReduced,
  index,
  onDragEnd,
  onSelect,
  onKeyDown,
}: DraggableItemProps) {
  return (
    <motion.div
      drag={!disabled}
      dragSnapToOrigin
      onDragEnd={(_, info) => onDragEnd(item.id, info.point)}
      initial={prefersReduced ? false : { opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{
        duration: prefersReduced ? 0 : 0.25,
        delay: prefersReduced ? 0 : index * 0.03,
        ease: [0.25, 0.4, 0.25, 1],
      }}
      whileDrag={
        prefersReduced
          ? undefined
          : {
              scale: 1.05,
              boxShadow: 'var(--glass-shadow-outer)',
              zIndex: 50,
            }
      }
      style={{ position: 'relative' }}
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-label={`${item.text}${selected ? ', selected' : ''}`}
      onClick={() => !disabled && onSelect(item.id)}
      onKeyDown={(e) => !disabled && onKeyDown(item.id, e)}
      className={cn(
        'rounded-lg border bg-card px-3 py-2 text-sm select-none touch-none',
        'transition-colors duration-150',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 ring-offset-background',
        // Cursor
        !disabled && 'cursor-grab active:cursor-grabbing',
        disabled && 'cursor-default',
        // Idle
        status === 'idle' &&
          !selected &&
          'border-[var(--glass-border)] text-foreground/85 hover:border-primary/30 hover:bg-accent/40',
        // Selected (keyboard/click selection)
        selected &&
          status === 'idle' &&
          'border-primary/60 bg-primary/10 text-foreground',
        // Correct placement
        status === 'correct' &&
          'border-emerald-400 bg-emerald-50/60 text-emerald-900 dark:border-emerald-500/60 dark:bg-emerald-950/25 dark:text-emerald-100',
        // Incorrect placement
        status === 'incorrect' &&
          'border-red-400 bg-red-50/60 text-red-900 dark:border-red-500/60 dark:bg-red-950/25 dark:text-red-100',
        // Locked (after reveal)
        status === 'locked' &&
          'border-[var(--glass-border)] bg-[var(--glass-bg-subtle)] text-muted-foreground/70 cursor-default'
      )}
    >
      {item.text}
    </motion.div>
  )
}

// ─── CategorizationScreenRenderer ───────────────────────────────────────

export function CategorizationScreenRenderer({
  screen,
  onComplete,
}: CategorizationScreenProps) {
  const prefersReduced = useReducedMotion() ?? false

  const shuffledItems = useMemo(
    () => seededShuffle([...screen.items], screen.id),
    [screen.items, screen.id]
  )

  // placements: itemId → categoryId (null = unsorted)
  const [placements, setPlacements] = useState<Record<string, string | null>>(
    () => {
      const initial: Record<string, string | null> = {}
      screen.items.forEach((item) => {
        initial[item.id] = null
      })
      return initial
    }
  )

  const [phase, setPhase] = useState<'sorting' | 'feedback' | 'revealed'>(
    'sorting'
  )
  const [lastAnswerCorrect, setLastAnswerCorrect] = useState(false)
  const [attempts, setAttempts] = useState(0)
  const [hintsUsed, setHintsUsed] = useState(0)
  const [itemStatuses, setItemStatuses] = useState<Record<string, ItemStatus>>(
    {}
  )
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null)
  const [announcement, setAnnouncement] = useState('')

  // Refs for bucket hit-testing during drag
  const bucketRefs = useRef<Record<string, HTMLDivElement | null>>({})

  // ─── Derived data ──────────────────────────────────────────────────

  const unsortedItems = useMemo(
    () => shuffledItems.filter((item) => placements[item.id] === null),
    [shuffledItems, placements]
  )

  const getBucketItems = useCallback(
    (categoryId: string) =>
      shuffledItems.filter((item) => placements[item.id] === categoryId),
    [shuffledItems, placements]
  )

  const allSorted = useMemo(
    () => Object.values(placements).every((v) => v !== null),
    [placements]
  )

  const bucketGridCols =
    screen.categories.length === 3
      ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
      : 'grid-cols-1 sm:grid-cols-2'

  // ─── Drag handler ─────────────────────────────────────────────────

  const handleDragEnd = useCallback(
    (itemId: string, point: { x: number; y: number }) => {
      if (phase !== 'sorting') return

      // Check if pointer is over any bucket
      for (const [categoryId, ref] of Object.entries(bucketRefs.current)) {
        if (!ref) continue
        const rect = ref.getBoundingClientRect()
        if (
          point.x >= rect.left &&
          point.x <= rect.right &&
          point.y >= rect.top &&
          point.y <= rect.bottom
        ) {
          // Skip if already in this bucket
          if (placements[itemId] === categoryId) return

          setPlacements((prev) => ({ ...prev, [itemId]: categoryId }))
          setItemStatuses({})
          setSelectedItemId(null)

          const category = screen.categories.find((c) => c.id === categoryId)
          const item = screen.items.find((i) => i.id === itemId)
          setAnnouncement(`Placed ${item?.text} in ${category?.label}`)
          return
        }
      }

      // Not over any bucket → return to unsorted
      if (placements[itemId] !== null) {
        setPlacements((prev) => ({ ...prev, [itemId]: null }))
        setItemStatuses({})
        const item = screen.items.find((i) => i.id === itemId)
        setAnnouncement(`Returned ${item?.text} to unsorted`)
      }
    },
    [phase, placements, screen.categories, screen.items]
  )

  // ─── Click / keyboard handlers (accessibility) ────────────────────

  const handleItemSelect = useCallback(
    (itemId: string) => {
      if (phase !== 'sorting') return
      setSelectedItemId((prev) => (prev === itemId ? null : itemId))
    },
    [phase]
  )

  const handleItemKeyDown = useCallback(
    (itemId: string, e: React.KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        handleItemSelect(itemId)
      }
    },
    [handleItemSelect]
  )

  const handleBucketClick = useCallback(
    (categoryId: string) => {
      if (phase !== 'sorting' || !selectedItemId) return

      setPlacements((prev) => ({ ...prev, [selectedItemId]: categoryId }))
      setItemStatuses({})

      const category = screen.categories.find((c) => c.id === categoryId)
      const item = screen.items.find((i) => i.id === selectedItemId)
      setAnnouncement(`Placed ${item?.text} in ${category?.label}`)
      setSelectedItemId(null)
    },
    [phase, selectedItemId, screen.categories, screen.items]
  )

  const handleBucketKeyDown = useCallback(
    (categoryId: string, e: React.KeyboardEvent) => {
      if ((e.key === 'Enter' || e.key === ' ') && selectedItemId) {
        e.preventDefault()
        handleBucketClick(categoryId)
      }
    },
    [selectedItemId, handleBucketClick]
  )

  const handleUnsortedClick = useCallback(() => {
    if (phase !== 'sorting' || !selectedItemId) return

    // If the selected item is already unsorted, just deselect
    if (placements[selectedItemId] === null) {
      setSelectedItemId(null)
      return
    }

    setPlacements((prev) => ({ ...prev, [selectedItemId]: null }))
    setItemStatuses({})

    const item = screen.items.find((i) => i.id === selectedItemId)
    setAnnouncement(`Returned ${item?.text} to unsorted`)
    setSelectedItemId(null)
  }, [phase, selectedItemId, placements, screen.items])

  // ─── Answer checking ──────────────────────────────────────────────

  const handleCheckAnswer = useCallback(() => {
    if (phase !== 'sorting') return

    const newAttempts = attempts + 1
    setAttempts(newAttempts)

    const isCorrect = screen.items.every(
      (item) => placements[item.id] === item.categoryId
    )

    const statuses: Record<string, ItemStatus> = {}
    screen.items.forEach((item) => {
      statuses[item.id] =
        placements[item.id] === item.categoryId ? 'correct' : 'incorrect'
    })
    setItemStatuses(statuses)
    setLastAnswerCorrect(isCorrect)
    setSelectedItemId(null)

    if (isCorrect) {
      setPhase('feedback')
    } else if (newAttempts >= MAX_ATTEMPTS) {
      // Reveal correct placements
      const correctPlacements: Record<string, string> = {}
      const lockedStatuses: Record<string, ItemStatus> = {}
      screen.items.forEach((item) => {
        correctPlacements[item.id] = item.categoryId
        lockedStatuses[item.id] = 'locked'
      })
      setPlacements(correctPlacements)
      setItemStatuses(lockedStatuses)
      setPhase('revealed')
    } else {
      setPhase('feedback')
    }
  }, [phase, attempts, placements, screen.items])

  const handleRetry = useCallback(() => {
    setPhase('sorting')
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

  const isInteractive = phase === 'sorting'

  // ─── Render ────────────────────────────────────────────────────────

  return (
    <div className="mx-auto w-full max-w-2xl space-y-8">
      {/* Screen reader announcements */}
      <div aria-live="polite" aria-atomic="true" className="sr-only">
        {announcement}
      </div>

      {/* Title + instruction */}
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
          <Layers className="h-3.5 w-3.5" />
          {screen.instruction ?? 'Drag items into the correct category'}
        </p>
      </motion.div>

      {/* Category buckets */}
      <div
        className={cn('grid gap-4', bucketGridCols)}
        role="application"
        aria-label="Category buckets for sorting items"
      >
        {screen.categories.map((category, catIndex) => {
          const items = getBucketItems(category.id)
          return (
            <motion.div
              key={category.id}
              initial={prefersReduced ? false : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: prefersReduced ? 0 : 0.35,
                delay: prefersReduced ? 0 : catIndex * 0.08,
                ease: [0.25, 0.4, 0.25, 1],
              }}
            >
              <div
                ref={(el) => {
                  bucketRefs.current[category.id] = el
                }}
                role="group"
                aria-label={`${category.label} bucket — ${items.length} item${items.length !== 1 ? 's' : ''}`}
                tabIndex={isInteractive && selectedItemId ? 0 : -1}
                onClick={() => handleBucketClick(category.id)}
                onKeyDown={(e) => handleBucketKeyDown(category.id, e)}
                className={cn(
                  'rounded-xl border-2 border-dashed border-[var(--glass-border)] bg-[var(--glass-bg-subtle)] p-4 min-h-[120px]',
                  'transition-colors duration-150',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 ring-offset-background',
                  isInteractive &&
                    selectedItemId &&
                    'hover:border-primary/40 hover:bg-primary/5 cursor-pointer'
                )}
              >
                <span className="text-sm font-semibold text-foreground/80 mb-2 block">
                  {category.label}
                </span>

                <div className="space-y-1.5">
                  {items.map((item, idx) => (
                    <DraggableItem
                      key={item.id}
                      item={item}
                      status={itemStatuses[item.id] ?? 'idle'}
                      disabled={!isInteractive}
                      selected={selectedItemId === item.id}
                      prefersReduced={prefersReduced}
                      index={idx}
                      onDragEnd={handleDragEnd}
                      onSelect={handleItemSelect}
                      onKeyDown={handleItemKeyDown}
                    />
                  ))}
                </div>

                {items.length === 0 && isInteractive && (
                  <p className="text-xs text-muted-foreground/50 italic mt-2">
                    Drop items here
                  </p>
                )}
              </div>
            </motion.div>
          )
        })}
      </div>

      {/* Unsorted items */}
      {unsortedItems.length > 0 && (
        <motion.div
          initial={prefersReduced ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: prefersReduced ? 0 : 0.3 }}
        >
          <p className="text-xs font-medium text-muted-foreground/60 mb-2 uppercase tracking-wider">
            Unsorted
          </p>
          <div
            className={cn(
              'flex flex-wrap gap-2 rounded-xl border border-dashed border-[var(--glass-border)] bg-[var(--glass-bg-subtle)]/50 p-3 min-h-[56px]',
              'transition-colors duration-150',
              isInteractive &&
                selectedItemId &&
                placements[selectedItemId] !== null &&
                'hover:border-primary/40 hover:bg-primary/5 cursor-pointer'
            )}
            role="list"
            aria-label="Unsorted items"
            onClick={handleUnsortedClick}
          >
            {unsortedItems.map((item, idx) => (
              <DraggableItem
                key={item.id}
                item={item}
                status={itemStatuses[item.id] ?? 'idle'}
                disabled={!isInteractive}
                selected={selectedItemId === item.id}
                prefersReduced={prefersReduced}
                index={idx}
                onDragEnd={handleDragEnd}
                onSelect={handleItemSelect}
                onKeyDown={handleItemKeyDown}
              />
            ))}
          </div>
        </motion.div>
      )}

      {/* Check Answer button */}
      {phase === 'sorting' && (
        <motion.div
          initial={prefersReduced ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: prefersReduced ? 0 : 0.2 }}
          className="flex justify-end"
        >
          <Button
            onClick={handleCheckAnswer}
            disabled={!allSorted}
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
              Here&apos;s the correct sorting:
            </p>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              {screen.explanation}
            </p>
          </div>
          <div className="flex justify-end">
            <Button
              onClick={handleRevealedContinue}
              size="lg"
              className="px-8"
            >
              Continue
            </Button>
          </div>
        </motion.div>
      )}

      {/* Hint drawer */}
      {phase === 'sorting' && (
        <HintDrawer hints={screen.hints} onHintUsed={handleHintUsed} />
      )}
    </div>
  )
}
