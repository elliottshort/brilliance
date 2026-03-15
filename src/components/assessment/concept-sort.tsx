'use client'

import { useState, useRef, useCallback, useMemo } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { ConceptSortPuzzle, AssessmentResponse } from '@/lib/schemas/assessment'

interface ConceptSortProps {
  puzzle: ConceptSortPuzzle
  onComplete: (response: AssessmentResponse) => void
}

function getBucketLabelClasses(index: number) {
  switch (index) {
    case 0:
      return 'text-emerald-600 dark:text-emerald-400'
    case 1:
      return 'text-amber-600 dark:text-amber-400'
    case 2:
      return 'text-sky-600 dark:text-sky-400'
    default:
      return 'text-muted-foreground'
  }
}

function getBucketBorderClasses(index: number) {
  switch (index) {
    case 0:
      return 'border-emerald-400/40 dark:border-emerald-500/40'
    case 1:
      return 'border-amber-400/40 dark:border-amber-500/40'
    case 2:
      return 'border-sky-400/40 dark:border-sky-500/40'
    default:
      return 'border-[var(--glass-border)]'
  }
}

function getBucketChipClasses(index: number) {
  switch (index) {
    case 0:
      return 'bg-emerald-500/10 dark:bg-emerald-500/15'
    case 1:
      return 'bg-amber-500/10 dark:bg-amber-500/15'
    case 2:
      return 'bg-sky-500/10 dark:bg-sky-500/15'
    default:
      return 'bg-[var(--glass-bg-subtle)]'
  }
}

function getSegmentClasses(index: number) {
  switch (index) {
    case 0:
      return 'text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/15 hover:border-emerald-500/30'
    case 1:
      return 'text-amber-700 dark:text-amber-400 hover:bg-amber-500/15 hover:border-amber-500/30'
    case 2:
      return 'text-sky-700 dark:text-sky-400 hover:bg-sky-500/15 hover:border-sky-500/30'
    default:
      return 'text-muted-foreground'
  }
}

// ─── ConceptCard ────────────────────────────────────────────────────────

interface ConceptCardProps {
  concept: { id: string; text: string }
  categories: string[]
  onSort: (conceptId: string, category: string) => void
  index: number
  prefersReduced: boolean
}

function ConceptCard({
  concept,
  categories,
  onSort,
  index,
  prefersReduced,
}: ConceptCardProps) {
  return (
    <motion.div
      layout
      initial={prefersReduced ? false : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={
        prefersReduced
          ? undefined
          : { opacity: 0, scale: 0.92, y: -6 }
      }
      transition={{
        duration: prefersReduced ? 0 : 0.3,
        delay: prefersReduced ? 0 : index * 0.04,
        ease: [0.25, 0.4, 0.25, 1],
        layout: prefersReduced
          ? { duration: 0 }
          : { type: 'spring', stiffness: 400, damping: 30 },
      }}
      className={cn(
        'rounded-lg border border-[var(--glass-border)] bg-[var(--glass-bg)]',
        'backdrop-blur-sm p-3 space-y-2.5',
        'hover:border-[var(--glass-border-strong)]',
        'transition-colors duration-150'
      )}
    >
      <span className="text-sm font-medium leading-relaxed text-foreground/85 block">
        {concept.text}
      </span>

      <div className="flex gap-1">
        {categories.map((category, i) => (
          <button
            key={category}
            onClick={() => onSort(concept.id, category)}
            className={cn(
              'flex-1 rounded-md px-2 py-1 text-xs font-medium',
              'border border-transparent',
              'transition-all duration-150',
              'bg-[var(--glass-bg-subtle)]',
              'cursor-pointer',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 ring-offset-background',
              getSegmentClasses(i)
            )}
          >
            {category}
          </button>
        ))}
      </div>
    </motion.div>
  )
}

// ─── ConceptSort ────────────────────────────────────────────────────────

export function ConceptSort({ puzzle, onComplete }: ConceptSortProps) {
  const prefersReduced = useReducedMotion() ?? false
  const startTimeRef = useRef(Date.now())

  // conceptId → category name
  const [sorted, setSorted] = useState<Record<string, string>>({})

  const unsortedConcepts = useMemo(
    () => puzzle.concepts.filter((c) => !(c.id in sorted)),
    [puzzle.concepts, sorted]
  )

  const allSorted = unsortedConcepts.length === 0

  const handleSort = useCallback((conceptId: string, category: string) => {
    setSorted((prev) => ({ ...prev, [conceptId]: category }))
  }, [])

  const handleUnsort = useCallback((conceptId: string) => {
    setSorted((prev) => {
      const next = { ...prev }
      delete next[conceptId]
      return next
    })
  }, [])

  const handleComplete = useCallback(() => {
    onComplete({
      puzzleId: puzzle.id,
      puzzleType: 'concept_sort',
      response: { sorted },
      responseTimeMs: Date.now() - startTimeRef.current,
      hintsUsed: 0,
      correct: null,
    })
  }, [puzzle.id, sorted, onComplete])

  const getConceptsInBucket = useCallback(
    (category: string) =>
      puzzle.concepts.filter((c) => sorted[c.id] === category),
    [puzzle.concepts, sorted]
  )

  return (
    <div className="mx-auto w-full max-w-2xl space-y-8">
      {/* ── Title ── */}
      <motion.div
        initial={prefersReduced ? false : { opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{
          duration: prefersReduced ? 0 : 0.4,
          ease: [0.25, 0.4, 0.25, 1],
        }}
      >
        <h2 className="text-2xl font-bold tracking-tight text-foreground">
          {puzzle.title}
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Sort each concept into a category based on your familiarity
        </p>
      </motion.div>

      {/* ── Unsorted concepts ── */}
      <AnimatePresence mode="popLayout">
        {unsortedConcepts.length > 0 && (
          <motion.div
            layout
            className="flex flex-wrap gap-3"
            initial={prefersReduced ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={
              prefersReduced
                ? undefined
                : { opacity: 0, height: 0, marginTop: 0 }
            }
            transition={{ duration: prefersReduced ? 0 : 0.3 }}
          >
            <AnimatePresence mode="popLayout">
              {unsortedConcepts.map((concept, index) => (
                <ConceptCard
                  key={concept.id}
                  concept={concept}
                  categories={puzzle.categories}
                  onSort={handleSort}
                  index={index}
                  prefersReduced={prefersReduced}
                />
              ))}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Buckets ── */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {puzzle.categories.map((category, i) => {
          const concepts = getConceptsInBucket(category)
          const hasItems = concepts.length > 0

          return (
            <motion.div
              key={category}
              initial={prefersReduced ? false : { opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: prefersReduced ? 0 : 0.4,
                delay: prefersReduced ? 0 : 0.15 + i * 0.08,
                ease: [0.25, 0.4, 0.25, 1],
              }}
              className={cn(
                'rounded-xl border bg-[var(--glass-bg)] backdrop-blur-sm p-3',
                'min-h-[120px] flex flex-col',
                'transition-colors duration-200',
                hasItems
                  ? getBucketBorderClasses(i)
                  : 'border-[var(--glass-border)]'
              )}
            >
              <span
                className={cn(
                  'text-xs font-semibold uppercase tracking-wider mb-2.5',
                  hasItems
                    ? getBucketLabelClasses(i)
                    : 'text-muted-foreground'
                )}
              >
                {category}
                {hasItems && (
                  <span className="ml-1.5 text-muted-foreground font-normal">
                    ({concepts.length})
                  </span>
                )}
              </span>

              <div className="flex flex-wrap gap-1.5 flex-1">
                <AnimatePresence mode="popLayout">
                  {concepts.map((concept) => (
                    <motion.button
                      key={concept.id}
                      layout
                      initial={
                        prefersReduced
                          ? false
                          : { opacity: 0, scale: 0.85 }
                      }
                      animate={{ opacity: 1, scale: 1 }}
                      exit={
                        prefersReduced
                          ? undefined
                          : { opacity: 0, scale: 0.85 }
                      }
                      transition={{
                        duration: prefersReduced ? 0 : 0.2,
                        ease: [0.25, 0.4, 0.25, 1],
                      }}
                      onClick={() => handleUnsort(concept.id)}
                      className={cn(
                        'rounded-lg px-2.5 py-1.5 text-sm',
                        'border border-[var(--glass-border)]',
                        getBucketChipClasses(i),
                        'hover:bg-destructive/10 hover:border-destructive/30',
                        'cursor-pointer transition-colors duration-150',
                        'text-foreground/85',
                        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 ring-offset-background'
                      )}
                      title="Click to unsort"
                    >
                      {concept.text}
                    </motion.button>
                  ))}
                </AnimatePresence>

                {!hasItems && (
                  <span className="text-xs text-muted-foreground/40 italic m-auto select-none">
                    Drop concepts here
                  </span>
                )}
              </div>
            </motion.div>
          )
        })}
      </div>

      {/* ── Continue button ── */}
      <AnimatePresence>
        {allSorted && (
          <motion.div
            initial={prefersReduced ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={prefersReduced ? undefined : { opacity: 0 }}
            transition={{
              duration: prefersReduced ? 0 : 0.3,
              ease: [0.25, 0.4, 0.25, 1],
            }}
            className="flex justify-end"
          >
            <Button onClick={handleComplete} size="lg" className="px-8">
              Continue
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
