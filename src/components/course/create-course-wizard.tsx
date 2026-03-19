'use client'

import { useState, useEffect, useRef, type ReactNode, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { Loader2, CheckCircle2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { GenerationProgress } from './generation-progress'
import { AssessmentFlow } from '@/components/assessment/assessment-flow'
import { LearnerProfileRadar } from '@/components/assessment/learner-profile-radar'
import { fetchPuzzles } from '@/lib/assessment/api'
import { serializeProfile } from '@/lib/assessment/serializer'
import type { LearnerProfile, AssessmentPuzzle } from '@/lib/schemas/assessment'

interface PuzzleResponse {
  puzzles: AssessmentPuzzle[]
}

type WizardStep = 'topic' | 'assessment' | 'generating' | 'done'

interface CompletedCourse {
  courseId: string
  title?: string
  description?: string
}

export function CreateCourseWizard({ children }: { children: ReactNode }) {
  const router = useRouter()
  const prefersReduced = useReducedMotion() ?? false
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState<WizardStep>('topic')
  const [topic, setTopic] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [completedCourse, setCompletedCourse] = useState<CompletedCourse | null>(null)
  const [generationError, setGenerationError] = useState<string | null>(null)
  const [workflowId, setWorkflowId] = useState<string | null>(null)
  const [learnerProfile, setLearnerProfile] = useState<LearnerProfile | null>(null)
  const act1PromiseRef = useRef<Promise<PuzzleResponse> | null>(null)
  const act2PromiseRef = useRef<Promise<PuzzleResponse> | null>(null)

  function resetWizard() {
    setStep('topic')
    setTopic('')
    setIsLoading(false)
    setCompletedCourse(null)
    setGenerationError(null)
    setWorkflowId(null)
    setLearnerProfile(null)
    act1PromiseRef.current = null
    act2PromiseRef.current = null
  }

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen)
    if (!nextOpen) resetWizard()
  }

  async function startGeneration(summary: string, profile: LearnerProfile) {
    setStep('generating')
    setGenerationError(null)

    try {
      const res = await fetch('/api/courses/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic, interviewSummary: summary, learnerProfile: profile }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: 'Failed to start generation' }))
        setGenerationError(data.error ?? 'Failed to start generation')
        return
      }

      const data = await res.json() as { workflowId: string; courseId: string }
      setWorkflowId(data.workflowId)

      const url = new URL(window.location.href)
      url.searchParams.set('workflowId', data.workflowId)
      window.history.replaceState({}, '', url.toString())
    } catch {
      setGenerationError('Connection error. Please try again.')
    }
  }

  useEffect(() => {
    const url = new URL(window.location.href)
    const existingWorkflowId = url.searchParams.get('workflowId')
    if (existingWorkflowId) {
      setWorkflowId(existingWorkflowId)
      setStep('generating')
      setOpen(true)
    }
  }, [])

  async function handleTopicSubmit() {
    if (!topic.trim()) return
    act1PromiseRef.current = fetchPuzzles(topic.trim(), 1)
    act2PromiseRef.current = fetchPuzzles(topic.trim(), 2)
    setStep('assessment')
  }

  const handleGenerationComplete = useCallback((courseId: string, preview?: { title: string; description: string }) => {
    setCompletedCourse({ courseId, title: preview?.title, description: preview?.description })
    setStep('done')

    const url = new URL(window.location.href)
    url.searchParams.delete('workflowId')
    window.history.replaceState({}, '', url.toString())
  }, [])

  const handleGenerationError = useCallback((message: string) => {
    setGenerationError(message)
  }, [])

  const handleGenerationRetry = useCallback(() => {
    const url = new URL(window.location.href)
    url.searchParams.delete('workflowId')
    window.history.replaceState({}, '', url.toString())

    setWorkflowId(null)
    setGenerationError(null)
    setStep('topic')
  }, [])

  const stepContent: Record<WizardStep, ReactNode> = {
    topic: (
      <div className="flex flex-col gap-4 py-4">
        <div className="text-center">
          <h3 className="text-lg font-semibold tracking-tight text-foreground">
            What would you like to learn?
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            e.g., Mental math tricks, Introduction to Python, Music theory basics
          </p>
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            handleTopicSubmit()
          }}
          className="flex gap-2"
        >
          <Input
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="Enter a topic..."
            autoFocus
            className="flex-1"
          />
          <Button type="submit" disabled={!topic.trim()}>
            Start
          </Button>
        </form>
      </div>
    ),

    assessment: (
      <AssessmentFlow
        topic={topic}
        prefetchedAct1={act1PromiseRef.current}
        prefetchedAct2={act2PromiseRef.current}
        onComplete={(profile: LearnerProfile) => {
          setLearnerProfile(profile)
          const summary = serializeProfile(profile)
          startGeneration(summary, profile)
        }}
        onError={(error: string) => {
          setGenerationError(error)
        }}
      />
    ),

    generating: (
      <div className="flex flex-col gap-6">
        {learnerProfile && (
          <motion.div
            initial={prefersReduced ? { opacity: 1 } : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="rounded-xl border border-border/50 bg-muted/30 p-5"
          >
            <h3 className="text-center text-sm font-medium text-muted-foreground mb-3">
              Here&rsquo;s what I noticed
            </h3>
            <LearnerProfileRadar
              dimensions={learnerProfile.dimensions}
              className="mx-auto max-w-[240px]"
            />
            {learnerProfile.narrative && (
              <p className="mt-3 text-center text-sm leading-relaxed text-muted-foreground">
                {learnerProfile.narrative.split(/\n\n?/).filter(Boolean)[0]}
              </p>
            )}
          </motion.div>
        )}
        {workflowId ? (
          <GenerationProgress
            workflowId={workflowId}
            onComplete={handleGenerationComplete}
            onError={handleGenerationError}
            onRetry={handleGenerationRetry}
          />
        ) : (
          <div className="flex flex-col items-center gap-4 py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary/60" />
            <p className="text-sm text-muted-foreground">Starting generation...</p>
            {generationError && (
              <p className="text-sm text-destructive text-center max-w-xs">{generationError}</p>
            )}
          </div>
        )}
      </div>
    ),

    done: completedCourse ? (
      <div className="flex flex-col items-center gap-4 py-8">
        <motion.div
          initial={prefersReduced ? {} : { scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
        >
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
            <CheckCircle2 className="h-7 w-7 text-primary" />
          </div>
        </motion.div>
        {completedCourse.title && (
          <div className="text-center">
            <p className="text-lg font-semibold tracking-tight text-foreground">
              {completedCourse.title}
            </p>
            {completedCourse.description && (
              <p className="mt-1 text-sm text-muted-foreground max-w-xs">
                {completedCourse.description}
              </p>
            )}
          </div>
        )}
        <Button
          onClick={() => {
            handleOpenChange(false)
            router.push(`/courses/${completedCourse.courseId}`)
            router.refresh()
          }}
        >
          Start Learning
        </Button>
      </div>
    ) : null,
  }

  const stepTitles: Record<WizardStep, string> = {
    topic: 'Create Your Own Course',
    assessment: 'Discover How You Think',
    generating: 'Creating your course',
    done: 'Course Ready',
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <div onClick={() => setOpen(true)}>{children}</div>
      <DialogContent className={cn(
        'transition-all duration-300',
        step === 'assessment'
          ? 'w-[95vw] max-w-5xl h-[85vh] overflow-y-auto'
          : step === 'generating' && learnerProfile
            ? 'sm:max-w-lg overflow-y-auto max-h-[85vh]'
            : 'sm:max-w-md'
      )}>
        <DialogHeader>
          <DialogTitle className="text-center">{stepTitles[step]}</DialogTitle>
        </DialogHeader>
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={prefersReduced ? { opacity: 1 } : { opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={prefersReduced ? { opacity: 1 } : { opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
          >
            {stepContent[step]}
            {generationError && step === 'generating' && workflowId && (
              <p className="mt-2 text-center text-xs text-destructive">{generationError}</p>
            )}
          </motion.div>
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  )
}
