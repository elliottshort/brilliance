'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { Loader2, AlertCircle, BookOpen } from 'lucide-react'
import { Progress } from '@/components/ui/progress'
import { Button } from '@/components/ui/button'
import type { GenerationEvent, GenerationPhase } from '@/lib/claude/generate-course'

const PHASE_LABELS: Record<GenerationPhase, string> = {
  researching: 'Researching your topic...',
  planning: 'Planning course structure...',
  generating: 'Crafting lessons and exercises...',
  verifying: 'Checking quality...',
  fixing: 'Polishing...',
  saving: 'Saving your course...',
  complete: 'Your course is ready!',
}

interface GenerationProgressProps {
  topic: string
  interviewSummary: string
  onComplete: (courseId: string, preview?: { title: string; description: string }) => void
  onError: (message: string) => void
}

export function GenerationProgress({
  topic,
  interviewSummary,
  onComplete,
  onError,
}: GenerationProgressProps) {
  const [phase, setPhase] = useState<GenerationPhase>('researching')
  const [percent, setPercent] = useState(0)
  const [preview, setPreview] = useState<{ title: string; description: string } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)
  const previewRef = useRef<{ title: string; description: string } | null>(null)
  const prefersReduced = useReducedMotion() ?? false

  const startGeneration = useCallback(async () => {
    setError(null)
    setPercent(0)
    setPhase('researching')
    setPreview(null)

    const abort = new AbortController()
    abortRef.current = abort

    try {
      const res = await fetch('/api/courses/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic, interviewSummary }),
        signal: abort.signal,
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: 'Generation failed' }))
        setError(data.error ?? 'Generation failed')
        onError(data.error ?? 'Generation failed')
        return
      }

      const reader = res.body?.getReader()
      if (!reader) {
        setError('No response stream')
        onError('No response stream')
        return
      }

      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })

        const lines = buffer.split('\n\n')
        buffer = lines.pop() ?? ''

        for (const line of lines) {
          const dataLine = line.trim()
          if (!dataLine.startsWith('data: ')) continue

          try {
            const event = JSON.parse(dataLine.slice(6)) as GenerationEvent

            switch (event.type) {
              case 'phase':
                setPhase(event.phase)
                break
              case 'progress':
                setPercent(event.percent)
                break
              case 'course_preview':
                previewRef.current = { title: event.title, description: event.description }
                setPreview(previewRef.current)
                break
              case 'complete':
                onComplete(event.courseId, previewRef.current ?? undefined)
                return
              case 'error':
                setError(event.message)
                onError(event.message)
                return
            }
          } catch {
            continue
          }
        }
      }
    } catch (err) {
      if (abort.signal.aborted) return
      const msg = err instanceof Error ? err.message : 'Connection lost'
      setError(msg)
      onError(msg)
    }
  }, [topic, interviewSummary, onComplete, onError])

  useEffect(() => {
    startGeneration()
    return () => {
      abortRef.current?.abort()
    }
  }, [startGeneration])

  if (error) {
    return (
      <div className="flex flex-col items-center gap-4 py-8">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
          <AlertCircle className="h-6 w-6 text-destructive" />
        </div>
        <p className="text-sm text-muted-foreground text-center max-w-xs">{error}</p>
        <Button variant="outline" size="sm" onClick={startGeneration}>
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
            className="flex items-start gap-3 rounded-lg border border-border/60 bg-muted/30 p-4 max-w-sm"
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
