'use client'

import { useState, useCallback, useMemo, useRef } from 'react'
import {
  motion,
  Reorder,
  useDragControls,
  useReducedMotion,
} from 'framer-motion'
import { GripVertical, Play, Code2, Puzzle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { FeedbackOverlay } from '@/components/lesson/feedback-overlay'
import { HintDrawer } from '@/components/lesson/hint-drawer'
import { cn } from '@/lib/utils'
import type { BlockCodingScreen } from '@/lib/schemas/content'
import { MAX_ATTEMPTS, type ScreenResult } from './shared/screen-utils'

/** Color-coding map for block types */
const BLOCK_TYPE_STYLES = {
  action: {
    bg: 'bg-blue-100 border-blue-300 dark:bg-blue-950/40 dark:border-blue-700',
    badge: 'bg-blue-200/80 text-blue-700 dark:bg-blue-800/60 dark:text-blue-300',
    indicator: 'bg-blue-500',
  },
  condition: {
    bg: 'bg-amber-100 border-amber-300 dark:bg-amber-950/40 dark:border-amber-700',
    badge: 'bg-amber-200/80 text-amber-700 dark:bg-amber-800/60 dark:text-amber-300',
    indicator: 'bg-amber-500',
  },
  loop: {
    bg: 'bg-green-100 border-green-300 dark:bg-green-950/40 dark:border-green-700',
    badge: 'bg-green-200/80 text-green-700 dark:bg-green-800/60 dark:text-green-300',
    indicator: 'bg-green-500',
  },
  variable: {
    bg: 'bg-purple-100 border-purple-300 dark:bg-purple-950/40 dark:border-purple-700',
    badge: 'bg-purple-200/80 text-purple-700 dark:bg-purple-800/60 dark:text-purple-300',
    indicator: 'bg-purple-500',
  },
} as const

// ─── ToolboxBlock ───────────────────────────────────────────────────────

interface ToolboxBlockProps {
  block: { id: string; text: string; type: 'action' | 'condition' | 'loop' | 'variable' }
  disabled: boolean
  used: boolean
  index: number
  prefersReduced: boolean
  onAdd: (blockId: string) => void
}

function ToolboxBlock({ block, disabled, used, index, prefersReduced, onAdd }: ToolboxBlockProps) {
  const styles = BLOCK_TYPE_STYLES[block.type]

  return (
    <motion.button
      initial={prefersReduced ? false : { opacity: 0, x: -12 }}
      animate={{ opacity: used ? 0.4 : 1, x: 0 }}
      transition={{
        duration: prefersReduced ? 0 : 0.3,
        delay: prefersReduced ? 0 : index * 0.04,
        ease: [0.25, 0.4, 0.25, 1],
      }}
      whileHover={!disabled && !used ? { scale: 1.02 } : undefined}
      whileTap={!disabled && !used ? { scale: 0.97 } : undefined}
      onClick={() => !disabled && !used && onAdd(block.id)}
      disabled={disabled || used}
      className={cn(
        'group flex w-full items-center gap-2.5 rounded-lg border-2 px-3 py-2.5 text-left text-sm font-medium select-none',
        'transition-all duration-150',
        styles.bg,
        used && 'opacity-40 cursor-not-allowed',
        !used && !disabled && 'cursor-pointer hover:shadow-sm',
        disabled && !used && 'cursor-not-allowed'
      )}
    >
      <span className={cn('h-2 w-2 shrink-0 rounded-full', styles.indicator)} />
      <span className="flex-1 leading-snug">{block.text}</span>
      <span className={cn(
        'shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide',
        styles.badge
      )}>
        {block.type}
      </span>
    </motion.button>
  )
}

// ─── ProgramBlock (reorderable) ─────────────────────────────────────────

interface ProgramBlockProps {
  block: { id: string; text: string; type: 'action' | 'condition' | 'loop' | 'variable' }
  index: number
  status: 'idle' | 'correct' | 'incorrect' | 'locked'
  disabled: boolean
  groupRef: React.RefObject<HTMLDivElement | null>
  prefersReduced: boolean
  onRemove: (blockId: string) => void
}

function ProgramBlock({
  block,
  index,
  status,
  disabled,
  groupRef,
  prefersReduced,
  onRemove,
}: ProgramBlockProps) {
  const controls = useDragControls()
  const styles = BLOCK_TYPE_STYLES[block.type]

  return (
    <Reorder.Item
      value={block}
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
        'group flex items-center gap-2.5 rounded-xl border-2 px-3 py-3 select-none',
        'transition-colors duration-150',
        // Type-based coloring in idle state
        status === 'idle' && styles.bg,
        status === 'idle' && 'hover:shadow-sm',
        // Correct
        status === 'correct' &&
          'border-emerald-400 bg-emerald-50/60 dark:border-emerald-500/60 dark:bg-emerald-950/25',
        // Incorrect
        status === 'incorrect' &&
          'border-red-400 bg-red-50/60 dark:border-red-500/60 dark:bg-red-950/25',
        // Locked (after reveal)
        status === 'locked' && 'border-[var(--glass-border)] bg-[var(--glass-bg-subtle)]',
        disabled && 'cursor-default'
      )}
    >
      {/* Drag handle */}
      <span
        onPointerDown={disabled ? undefined : (e) => controls.start(e)}
        className={cn(
          'flex shrink-0 items-center rounded-lg p-1.5 text-muted-foreground/50 touch-none',
          'transition-colors duration-150',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 ring-offset-background',
          !disabled &&
            'cursor-grab hover:text-foreground/70 hover:bg-black/5 dark:hover:bg-white/5 active:cursor-grabbing',
          disabled && 'cursor-default opacity-30'
        )}
        aria-label={`Drag to reorder: ${block.text}`}
      >
        <GripVertical className="h-4 w-4" />
      </span>

      {/* Step number */}
      <span
        className={cn(
          'flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-[11px] font-bold',
          'transition-colors duration-150',
          status === 'idle' && 'bg-black/8 text-foreground/60 dark:bg-white/10',
          status === 'correct' &&
            'bg-emerald-500 text-white dark:bg-emerald-600',
          status === 'incorrect' &&
            'bg-red-400 text-white dark:bg-red-500',
          status === 'locked' && 'bg-[var(--glass-bg-subtle)] text-muted-foreground/50'
        )}
      >
        {index + 1}
      </span>

      {/* Block text */}
      <span
        className={cn(
          'flex-1 text-sm font-medium leading-snug',
          status === 'idle' && 'text-foreground/85',
          status === 'correct' && 'text-emerald-900 dark:text-emerald-100',
          status === 'incorrect' && 'text-red-900 dark:text-red-100',
          status === 'locked' && 'text-muted-foreground/70'
        )}
      >
        {block.text}
      </span>

      {/* Type badge */}
      <span className={cn(
        'shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide',
        status === 'idle' && styles.badge,
        status !== 'idle' && 'bg-black/5 text-muted-foreground/60 dark:bg-white/5'
      )}>
        {block.type}
      </span>

      {/* Remove button */}
      {!disabled && status === 'idle' && (
        <button
          onClick={() => onRemove(block.id)}
          className={cn(
            'shrink-0 rounded-md p-1 text-muted-foreground/40',
            'transition-colors duration-150',
            'hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
          )}
          aria-label={`Remove ${block.text} from program`}
        >
          <svg className="h-3.5 w-3.5" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M3 3l8 8M11 3l-8 8" />
          </svg>
        </button>
      )}
    </Reorder.Item>
  )
}

// ─── BlockCodingScreenRenderer ──────────────────────────────────────────

export function BlockCodingScreenRenderer({
  screen,
  onComplete,
}: {
  screen: BlockCodingScreen
  onComplete: (result: ScreenResult) => void
}) {
  const prefersReduced = useReducedMotion() ?? false
  const groupRef = useRef<HTMLDivElement>(null)

  // Track which block IDs are in the user's program sequence
  const [programIds, setProgramIds] = useState<string[]>([])
  const [phase, setPhase] = useState<'building' | 'feedback' | 'revealed'>('building')
  const [lastAnswerCorrect, setLastAnswerCorrect] = useState(false)
  const [attempts, setAttempts] = useState(0)
  const [hintsUsed, setHintsUsed] = useState(0)
  const [blockStatuses, setBlockStatuses] = useState<
    Record<string, 'idle' | 'correct' | 'incorrect' | 'locked'>
  >({})

  /** Set of block IDs currently in the program area */
  const usedBlockIds = useMemo(() => new Set(programIds), [programIds])

  /** Block objects in program order */
  const programBlocks = useMemo(
    () => programIds.map((id) => screen.availableBlocks.find((b) => b.id === id)!),
    [programIds, screen.availableBlocks]
  )

  /** Whether adding more blocks is allowed */
  const canAddMore = screen.maxBlocks ? programIds.length < screen.maxBlocks : true

  // ── Handlers ──────────────────────────────────────────────────────────

  const handleAddBlock = useCallback(
    (blockId: string) => {
      if (phase !== 'building' || usedBlockIds.has(blockId) || !canAddMore) return
      setProgramIds((prev) => [...prev, blockId])
      setBlockStatuses({})
    },
    [phase, usedBlockIds, canAddMore]
  )

  const handleRemoveBlock = useCallback(
    (blockId: string) => {
      if (phase !== 'building') return
      setProgramIds((prev) => prev.filter((id) => id !== blockId))
      setBlockStatuses({})
    },
    [phase]
  )

  const handleReorder = useCallback(
    (newBlocks: typeof programBlocks) => {
      setProgramIds(newBlocks.map((b) => b.id))
      setBlockStatuses({})
    },
    []
  )

  const handleRun = useCallback(() => {
    if (phase !== 'building' || programIds.length === 0) return

    const newAttempts = attempts + 1
    setAttempts(newAttempts)

    const isCorrect =
      programIds.length === screen.correctSequence.length &&
      programIds.every((id, i) => id === screen.correctSequence[i])

    const statuses: Record<string, 'idle' | 'correct' | 'incorrect' | 'locked'> = {}
    programIds.forEach((id, i) => {
      statuses[id] = i < screen.correctSequence.length && id === screen.correctSequence[i]
        ? 'correct'
        : 'incorrect'
    })
    setBlockStatuses(statuses)
    setLastAnswerCorrect(isCorrect)

    if (isCorrect) {
      setPhase('feedback')
    } else if (newAttempts >= MAX_ATTEMPTS) {
      // Reveal correct answer
      setProgramIds([...screen.correctSequence])
      const locked: Record<string, 'locked'> = {}
      screen.correctSequence.forEach((id) => { locked[id] = 'locked' })
      setBlockStatuses(locked)
      setPhase('revealed')
    } else {
      setPhase('feedback')
    }
  }, [phase, attempts, programIds, screen.correctSequence])

  const handleRetry = useCallback(() => {
    setPhase('building')
    setLastAnswerCorrect(false)
    setBlockStatuses({})
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

  const isDragDisabled = phase !== 'building'

  // ── Render ────────────────────────────────────────────────────────────

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6">
      {/* Header */}
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
          <Code2 className="h-3.5 w-3.5" />
          {screen.instruction}
        </p>
      </motion.div>

      {/* Goal banner */}
      <motion.div
        initial={prefersReduced ? false : { opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{
          duration: prefersReduced ? 0 : 0.35,
          delay: prefersReduced ? 0 : 0.1,
          ease: [0.25, 0.4, 0.25, 1],
        }}
        className="flex items-center gap-3 rounded-xl border border-[var(--glass-border)] bg-[var(--glass-bg-subtle)] px-4 py-3"
      >
        <Puzzle className="h-4 w-4 shrink-0 text-muted-foreground/60" />
        <p className="text-sm font-medium text-foreground/80">
          <span className="text-muted-foreground">Goal: </span>
          {screen.goal}
        </p>
        {screen.maxBlocks && (
          <span className="ml-auto shrink-0 rounded-md bg-black/5 px-2 py-0.5 text-xs font-semibold text-muted-foreground dark:bg-white/5">
            {programIds.length}/{screen.maxBlocks} blocks
          </span>
        )}
      </motion.div>

      {/* Two-column layout: Toolbox | Program */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {/* Left: Toolbox */}
        <motion.div
          initial={prefersReduced ? false : { opacity: 0, x: -16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{
            duration: prefersReduced ? 0 : 0.4,
            delay: prefersReduced ? 0 : 0.15,
            ease: [0.25, 0.4, 0.25, 1],
          }}
          className="space-y-3"
        >
          <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <span className="flex h-5 w-5 items-center justify-center rounded bg-black/5 dark:bg-white/5">
              <Puzzle className="h-3 w-3" />
            </span>
            Toolbox
          </h3>
          <div className="space-y-1.5 rounded-xl border border-[var(--glass-border)] bg-[var(--glass-bg-subtle)] p-3">
            {screen.availableBlocks.map((block, i) => (
              <ToolboxBlock
                key={block.id}
                block={block}
                disabled={isDragDisabled || (!canAddMore && !usedBlockIds.has(block.id))}
                used={usedBlockIds.has(block.id)}
                index={i}
                prefersReduced={prefersReduced}
                onAdd={handleAddBlock}
              />
            ))}
          </div>
        </motion.div>

        {/* Right: Program area */}
        <motion.div
          initial={prefersReduced ? false : { opacity: 0, x: 16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{
            duration: prefersReduced ? 0 : 0.4,
            delay: prefersReduced ? 0 : 0.2,
            ease: [0.25, 0.4, 0.25, 1],
          }}
          className="space-y-3"
        >
          <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <span className="flex h-5 w-5 items-center justify-center rounded bg-black/5 dark:bg-white/5">
              <Code2 className="h-3 w-3" />
            </span>
            Your Program
          </h3>
          <div
            className={cn(
              'min-h-[200px] rounded-xl border-2 border-dashed p-3',
              'transition-colors duration-200',
              programBlocks.length === 0
                ? 'border-[var(--glass-border)] bg-[var(--glass-bg-subtle)]'
                : 'border-primary/20 bg-card'
            )}
          >
            {programBlocks.length === 0 ? (
              <div className="flex h-full min-h-[176px] items-center justify-center">
                <p className="text-center text-sm text-muted-foreground/50">
                  Click blocks in the toolbox to build your program
                </p>
              </div>
            ) : (
              <Reorder.Group
                ref={groupRef}
                axis="y"
                values={programBlocks}
                onReorder={handleReorder}
                as="div"
                className="space-y-1.5"
              >
                {programBlocks.map((block, index) => (
                  <ProgramBlock
                    key={block.id}
                    block={block}
                    index={index}
                    status={blockStatuses[block.id] ?? 'idle'}
                    disabled={isDragDisabled}
                    groupRef={groupRef}
                    prefersReduced={prefersReduced}
                    onRemove={handleRemoveBlock}
                  />
                ))}
              </Reorder.Group>
            )}
          </div>
        </motion.div>
      </div>

      {/* Run button */}
      {phase === 'building' && (
        <motion.div
          initial={prefersReduced ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: prefersReduced ? 0 : 0.2 }}
          className="flex justify-end"
        >
          <Button
            onClick={handleRun}
            size="lg"
            disabled={programIds.length === 0}
            className="gap-2 px-8"
          >
            <Play className="h-4 w-4" />
            Run Program
          </Button>
        </motion.div>
      )}

      {/* Feedback overlay */}
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
              Here&apos;s the correct sequence:
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
      {phase === 'building' && (
        <HintDrawer hints={screen.hints} onHintUsed={handleHintUsed} />
      )}
    </div>
  )
}
