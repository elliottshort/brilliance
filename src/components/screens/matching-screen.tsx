'use client'

import { useState, useCallback, useMemo, useRef, useEffect } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { FeedbackOverlay } from '@/components/lesson/feedback-overlay'
import { HintDrawer } from '@/components/lesson/hint-drawer'
import { cn } from '@/lib/utils'
import type { MatchingScreen } from '@/lib/schemas/content'

interface ScreenResult {
  screenId: string
  answeredCorrectly: boolean
  attempts: number
  hintsUsed: number
  answeredAt: string
}

interface MatchingScreenProps {
  screen: MatchingScreen
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

// ─── Line data for SVG rendering ────────────────────────────────────────

interface LineData {
  id: string
  x1: number
  y1: number
  x2: number
  y2: number
  status: 'connected' | 'correct' | 'incorrect' | 'locked'
}

type ItemStatus = 'idle' | 'selected' | 'connected' | 'correct' | 'incorrect' | 'locked'

// ─── MatchingScreenRenderer ─────────────────────────────────────────────

export function MatchingScreenRenderer({
  screen,
  onComplete,
}: MatchingScreenProps) {
  const prefersReduced = useReducedMotion() ?? false
  const containerRef = useRef<HTMLDivElement>(null)
  const leftRefs = useRef<Record<string, HTMLButtonElement | null>>({})
  const rightRefs = useRef<Record<string, HTMLButtonElement | null>>({})

  const shuffledRightIds = useMemo(
    () => seededShuffle(screen.pairs.map((p) => p.id), screen.id),
    [screen.pairs, screen.id]
  )

  const pairById = useMemo(
    () => new Map(screen.pairs.map((p) => [p.id, p])),
    [screen.pairs]
  )

  // ─── State ──────────────────────────────────────────────────────────

  const [selectedLeft, setSelectedLeft] = useState<string | null>(null)
  const [connections, setConnections] = useState<Record<string, string>>({})
  const [phase, setPhase] = useState<'matching' | 'feedback' | 'revealed'>(
    'matching'
  )
  const [lastAnswerCorrect, setLastAnswerCorrect] = useState(false)
  const [attempts, setAttempts] = useState(0)
  const [hintsUsed, setHintsUsed] = useState(0)
  const [connectionStatuses, setConnectionStatuses] = useState<
    Record<string, 'connected' | 'correct' | 'incorrect' | 'locked'>
  >({})
  const [linePositions, setLinePositions] = useState<LineData[]>([])
  const [announcement, setAnnouncement] = useState('')

  const reverseConnections = useMemo(
    () =>
      Object.fromEntries(
        Object.entries(connections).map(([left, right]) => [right, left])
      ),
    [connections]
  )

  const allConnected = Object.keys(connections).length === screen.pairs.length

  // ─── SVG line calculation ───────────────────────────────────────────

  const recalculateLines = useCallback(() => {
    if (!containerRef.current) return
    const containerRect = containerRef.current.getBoundingClientRect()

    const lines: LineData[] = []
    for (const [leftId, rightId] of Object.entries(connections)) {
      const leftEl = leftRefs.current[leftId]
      const rightEl = rightRefs.current[rightId]
      if (!leftEl || !rightEl) continue

      const leftRect = leftEl.getBoundingClientRect()
      const rightRect = rightEl.getBoundingClientRect()

      lines.push({
        id: `${leftId}-${rightId}`,
        x1: leftRect.right - containerRect.left,
        y1: leftRect.top + leftRect.height / 2 - containerRect.top,
        x2: rightRect.left - containerRect.left,
        y2: rightRect.top + rightRect.height / 2 - containerRect.top,
        status: connectionStatuses[leftId] ?? 'connected',
      })
    }

    setLinePositions(lines)
  }, [connections, connectionStatuses])

  useEffect(() => {
    requestAnimationFrame(recalculateLines)
  }, [recalculateLines])

  useEffect(() => {
    const handler = () => requestAnimationFrame(recalculateLines)
    window.addEventListener('resize', handler)
    return () => window.removeEventListener('resize', handler)
  }, [recalculateLines])

  // ─── Interaction handlers ───────────────────────────────────────────

  const handleLeftClick = useCallback(
    (pairId: string) => {
      if (phase !== 'matching') return

      if (connections[pairId]) {
        const rightId = connections[pairId]
        const leftText = pairById.get(pairId)?.left ?? ''
        const rightText = pairById.get(rightId)?.right ?? ''
        setConnections((prev) => {
          const next = { ...prev }
          delete next[pairId]
          return next
        })
        setConnectionStatuses((prev) => {
          const next = { ...prev }
          delete next[pairId]
          return next
        })
        setAnnouncement(`Disconnected ${leftText} from ${rightText}`)
        return
      }

      setSelectedLeft((prev) => (prev === pairId ? null : pairId))
    },
    [phase, connections, pairById]
  )

  const handleRightClick = useCallback(
    (pairId: string) => {
      if (phase !== 'matching') return

      if (selectedLeft) {
        const leftText = pairById.get(selectedLeft)?.left ?? ''
        const rightText = pairById.get(pairId)?.right ?? ''

        setConnections((prev) => {
          const next = { ...prev }
          for (const [left, right] of Object.entries(next)) {
            if (right === pairId) delete next[left]
          }
          delete next[selectedLeft]
          next[selectedLeft] = pairId
          return next
        })
        setConnectionStatuses({})
        setAnnouncement(`Connected ${leftText} with ${rightText}`)
        setSelectedLeft(null)
      } else {
        const connectedLeft = reverseConnections[pairId]
        if (connectedLeft) {
          const leftText = pairById.get(connectedLeft)?.left ?? ''
          const rightText = pairById.get(pairId)?.right ?? ''
          setConnections((prev) => {
            const next = { ...prev }
            delete next[connectedLeft]
            return next
          })
          setConnectionStatuses((prev) => {
            const next = { ...prev }
            delete next[connectedLeft]
            return next
          })
          setAnnouncement(`Disconnected ${leftText} from ${rightText}`)
        }
      }
    },
    [phase, selectedLeft, reverseConnections, pairById]
  )

  // ─── Answer checking ───────────────────────────────────────────────

  const handleCheckAnswer = useCallback(() => {
    if (phase !== 'matching') return

    const newAttempts = attempts + 1
    setAttempts(newAttempts)

    const isCorrect = screen.pairs.every(
      (pair) => connections[pair.id] === pair.id
    )

    const statuses: Record<string, 'correct' | 'incorrect'> = {}
    for (const [leftId, rightId] of Object.entries(connections)) {
      statuses[leftId] = leftId === rightId ? 'correct' : 'incorrect'
    }
    setConnectionStatuses(statuses)
    setLastAnswerCorrect(isCorrect)
    setSelectedLeft(null)

    if (isCorrect) {
      setPhase('feedback')
    } else if (newAttempts >= MAX_ATTEMPTS) {
      const correctConnections: Record<string, string> = {}
      const lockedStatuses: Record<string, 'locked'> = {}
      screen.pairs.forEach((pair) => {
        correctConnections[pair.id] = pair.id
        lockedStatuses[pair.id] = 'locked'
      })
      setConnections(correctConnections)
      setConnectionStatuses(lockedStatuses)
      setPhase('revealed')
    } else {
      setPhase('feedback')
    }
  }, [phase, attempts, connections, screen.pairs])

  const handleRetry = useCallback(() => {
    setPhase('matching')
    setLastAnswerCorrect(false)
    setConnectionStatuses({})
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

  // ─── Item status derivation ─────────────────────────────────────────

  const getLeftItemStatus = useCallback(
    (pairId: string): ItemStatus => {
      if (selectedLeft === pairId) return 'selected'
      if (connections[pairId]) {
        return connectionStatuses[pairId] ?? 'connected'
      }
      return 'idle'
    },
    [selectedLeft, connections, connectionStatuses]
  )

  const getRightItemStatus = useCallback(
    (pairId: string): ItemStatus => {
      const connectedLeft = reverseConnections[pairId]
      if (connectedLeft) {
        return connectionStatuses[connectedLeft] ?? 'connected'
      }
      return 'idle'
    },
    [reverseConnections, connectionStatuses]
  )

  // ─── SVG line styling ──────────────────────────────────────────────

  const getLineStroke = (status: LineData['status']) => {
    switch (status) {
      case 'correct':
        return 'var(--color-emerald-500)'
      case 'incorrect':
        return 'var(--color-red-400)'
      case 'locked':
        return 'var(--color-emerald-500)'
      default:
        return 'hsl(var(--primary))'
    }
  }

  const isInteractive = phase === 'matching'

  // ─── Render ─────────────────────────────────────────────────────────

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
        {screen.instruction && (
          <p className="mt-2 text-sm text-muted-foreground">
            {screen.instruction}
          </p>
        )}
      </motion.div>

      {/* Matching area — two columns with SVG overlay */}
      <div
        ref={containerRef}
        className="relative"
        role="application"
        aria-label="Match items from the left column to the right column"
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-8">
          {/* Left column */}
          <div className="space-y-2" role="list" aria-label="Left column items">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground/60 sm:hidden">Terms</p>
            {screen.pairs.map((pair, index) => {
              const status = getLeftItemStatus(pair.id)
              return (
                <motion.div
                  key={pair.id}
                  initial={prefersReduced ? false : { opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{
                    duration: prefersReduced ? 0 : 0.35,
                    delay: prefersReduced ? 0 : index * 0.05,
                    ease: [0.25, 0.4, 0.25, 1],
                  }}
                  role="listitem"
                >
                  <button
                    ref={(el) => {
                      leftRefs.current[pair.id] = el
                    }}
                    onClick={() => handleLeftClick(pair.id)}
                    disabled={!isInteractive}
                    aria-label={`Select ${pair.left} to match`}
                    aria-pressed={status === 'selected'}
                    className={cn(
                      'w-full cursor-pointer rounded-xl border-2 px-4 py-3.5 text-left text-sm font-medium leading-relaxed',
                      'transition-colors duration-150',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 ring-offset-background',
                      status === 'idle' &&
                        'border-[var(--glass-border)] bg-card text-foreground/85 hover:border-primary/30 hover:bg-accent/40',
                      status === 'selected' &&
                        'border-primary/60 bg-primary/10 text-foreground',
                      status === 'connected' &&
                        'border-emerald-400 bg-emerald-50/60 text-emerald-900 dark:border-emerald-500/60 dark:bg-emerald-950/25 dark:text-emerald-100',
                      status === 'correct' &&
                        'border-emerald-400 bg-emerald-50/60 text-emerald-900 dark:border-emerald-500/60 dark:bg-emerald-950/25 dark:text-emerald-100',
                      status === 'incorrect' &&
                        'border-red-400 bg-red-50/60 text-red-900 dark:border-red-500/60 dark:bg-red-950/25 dark:text-red-100',
                      status === 'locked' &&
                        'cursor-default border-[var(--glass-border)] bg-[var(--glass-bg-subtle)] text-muted-foreground/70',
                      !isInteractive && status !== 'locked' && 'cursor-default'
                    )}
                  >
                    {pair.left}
                  </button>
                </motion.div>
              )
            })}
          </div>

          {/* Right column */}
          <div
            className="space-y-2"
            role="list"
            aria-label="Right column items"
          >
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground/60 sm:hidden">Definitions</p>
            {shuffledRightIds.map((pairId, index) => {
              const pair = pairById.get(pairId)!
              const status = getRightItemStatus(pairId)
              return (
                <motion.div
                  key={pairId}
                  initial={prefersReduced ? false : { opacity: 0, x: 12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{
                    duration: prefersReduced ? 0 : 0.35,
                    delay: prefersReduced ? 0 : index * 0.05,
                    ease: [0.25, 0.4, 0.25, 1],
                  }}
                  role="listitem"
                >
                  <button
                    ref={(el) => {
                      rightRefs.current[pairId] = el
                    }}
                    onClick={() => handleRightClick(pairId)}
                    disabled={!isInteractive}
                    aria-label={`Select ${pair.right} to match`}
                    className={cn(
                      'w-full cursor-pointer rounded-xl border-2 px-4 py-3.5 text-left text-sm font-medium leading-relaxed',
                      'transition-colors duration-150',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 ring-offset-background',
                      status === 'idle' &&
                        'border-[var(--glass-border)] bg-card text-foreground/85',
                      status === 'idle' &&
                        selectedLeft &&
                        'hover:border-primary/30 hover:bg-accent/40',
                      status === 'connected' &&
                        'border-emerald-400 bg-emerald-50/60 text-emerald-900 dark:border-emerald-500/60 dark:bg-emerald-950/25 dark:text-emerald-100',
                      status === 'correct' &&
                        'border-emerald-400 bg-emerald-50/60 text-emerald-900 dark:border-emerald-500/60 dark:bg-emerald-950/25 dark:text-emerald-100',
                      status === 'incorrect' &&
                        'border-red-400 bg-red-50/60 text-red-900 dark:border-red-500/60 dark:bg-red-950/25 dark:text-red-100',
                      status === 'locked' &&
                        'cursor-default border-[var(--glass-border)] bg-[var(--glass-bg-subtle)] text-muted-foreground/70',
                      !isInteractive && status !== 'locked' && 'cursor-default'
                    )}
                  >
                    {pair.right}
                  </button>
                </motion.div>
              )
            })}
          </div>
        </div>

        {/* SVG connection lines overlay — hidden on mobile (single-column) */}
        <svg
          className="pointer-events-none absolute inset-0 hidden h-full w-full overflow-visible sm:block"
          aria-hidden="true"
        >
          <AnimatePresence>
            {linePositions.map((line) => {
              const dx = (line.x2 - line.x1) * 0.4
              return (
                <motion.path
                  key={line.id}
                  d={`M ${line.x1} ${line.y1} C ${line.x1 + dx} ${line.y1}, ${line.x2 - dx} ${line.y2}, ${line.x2} ${line.y2}`}
                  stroke={getLineStroke(line.status)}
                  strokeWidth={2}
                  fill="none"
                  strokeLinecap="round"
                  initial={
                    prefersReduced ? false : { pathLength: 0, opacity: 0 }
                  }
                  animate={{ pathLength: 1, opacity: 1 }}
                  exit={prefersReduced ? undefined : { opacity: 0 }}
                  transition={{
                    duration: prefersReduced ? 0 : 0.3,
                    ease: [0.25, 0.4, 0.25, 1],
                  }}
                />
              )
            })}
          </AnimatePresence>
        </svg>
      </div>

      {/* Check Answer button */}
      {phase === 'matching' && (
        <motion.div
          initial={prefersReduced ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: prefersReduced ? 0 : 0.2 }}
          className="flex justify-end"
        >
          <Button
            onClick={handleCheckAnswer}
            disabled={!allConnected}
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
              Here&apos;s the correct matching:
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
      {phase === 'matching' && (
        <HintDrawer hints={screen.hints} onHintUsed={handleHintUsed} />
      )}
    </div>
  )
}
