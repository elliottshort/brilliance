'use client'

import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { Loader2, AlertCircle, BookOpen } from 'lucide-react'
import { Progress } from '@/components/ui/progress'
import { Button } from '@/components/ui/button'
import type { GenerationPhase, CourseGenerationProgress } from '@/temporal/types'

const PHASE_LABELS: Record<GenerationPhase, string> = {
  pending: 'Starting up...',
  researching: 'Researching your topic...',
  skeleton: 'Planning course structure...',
  generating_lessons: 'Crafting lessons and exercises...',
  validating: 'Checking quality...',
  saving: 'Saving your course...',
  verifying: 'Verifying...',
  complete: 'Your course is ready!',
  failed: 'Generation failed',
}

const POLL_INTERVAL_MS = 2000

interface GenerationProgressProps {
  workflowId: string
  onComplete: (courseId: string, preview?: { title: string; description: string }) => void
  onError: (message: string) => void
  onRetry: () => void
}

export function GenerationProgress({
  workflowId,
  onComplete,
  onError,
  onRetry,
}: GenerationProgressProps) {
  const [phase, setPhase] = useState<GenerationPhase>('pending')
  const [percent, setPercent] = useState(0)
  const [preview, setPreview] = useState<{ title: string; description: string } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const doneRef = useRef(false)
  const previewRef = useRef<{ title: string; description: string } | null>(null)
  const prefersReduced = useReducedMotion() ?? false

  useEffect(() => {
    doneRef.current = false

    const poll = async () => {
      if (doneRef.current) return

      try {
        const res = await fetch(
          `/api/courses/generate/status?workflowId=${encodeURIComponent(workflowId)}`,
        )

        if (!res.ok) {
          if (res.status === 404) {
            setError('Course generation not found')
            onError('Course generation not found')
            doneRef.current = true
            return
          }
          if (res.status === 503) {
            return
          }
          return
        }

        const progress: CourseGenerationProgress = await res.json()

        setPhase(progress.phase)
        setPercent(progress.percent)

        if (progress.preview) {
          previewRef.current = {
            title: progress.preview.title,
            description: progress.preview.description,
          }
          setPreview(previewRef.current)
        }

        if (progress.phase === 'complete' && progress.courseId) {
          doneRef.current = true
          onComplete(progress.courseId, previewRef.current ?? undefined)
          return
        }

        if (progress.phase === 'failed') {
          doneRef.current = true
          const errorMsg = progress.error ?? 'Course generation failed'
          setError(errorMsg)
          onError(errorMsg)
          return
        }
      } catch {
        // Network error — keep polling
      }
    }

    poll()
    const interval = setInterval(poll, POLL_INTERVAL_MS)

    return () => {
      doneRef.current = true
      clearInterval(interval)
    }
  }, [workflowId, onComplete, onError])

  if (error) {
    return (
      <div className="flex flex-col items-center gap-4 py-8">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
          <AlertCircle className="h-6 w-6 text-destructive" />
        </div>
        <p className="text-sm text-muted-foreground text-center max-w-xs">{error}</p>
        <Button variant="outline" size="sm" onClick={onRetry}>
          Try Again
        </Button>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center gap-6 py-8">
      <div className="relative flex h-10 w-10 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary/60" />
        <div className="absolute h-2 w-2 rounded-full bg-primary animate-pulse" />
      </div>

      <AnimatePresence mode="wait">
        <motion.p
          key={phase}
          initial={prefersReduced ? { opacity: 1 } : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={prefersReduced ? { opacity: 1 } : { opacity: 0, y: -8 }}
          transition={{ duration: 0.3 }}
          className="text-sm font-medium text-foreground"
        >
          {PHASE_LABELS[phase]}
        </motion.p>
      </AnimatePresence>

      <div className="w-full max-w-xs">
        <Progress value={percent} className="h-2" />
      </div>

      <AnimatePresence>
        {preview && (
          <motion.div
            initial={prefersReduced ? { opacity: 1 } : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-start gap-3 rounded-lg border border-[var(--glass-border)] bg-[var(--glass-bg-subtle)] p-4 max-w-sm"
          >
            <BookOpen className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <div>
              <p className="text-sm font-semibold text-foreground">{preview.title}</p>
              <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{preview.description}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
