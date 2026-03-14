'use client'

import { useState, useRef, useEffect, type ReactNode, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { Send, Loader2, CheckCircle2 } from 'lucide-react'
import Markdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { cn } from '@/lib/utils'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { GenerationProgress } from './generation-progress'

type WizardStep = 'topic' | 'interview' | 'generating' | 'done'

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

interface CompletedCourse {
  courseId: string
  title?: string
  description?: string
}

const markdownComponents = {
  h1: ({ children }: { children?: React.ReactNode }) => (
    <h3 className="mb-3 mt-6 text-sm font-bold tracking-tight text-inherit first:mt-0">
      {children}
    </h3>
  ),
  h2: ({ children }: { children?: React.ReactNode }) => (
    <h4 className="mb-2 mt-4 text-sm font-semibold tracking-tight text-inherit first:mt-0">
      {children}
    </h4>
  ),
  p: ({ children }: { children?: React.ReactNode }) => (
    <p className="mb-2 text-sm leading-relaxed last:mb-0">{children}</p>
  ),
  strong: ({ children }: { children?: React.ReactNode }) => (
    <strong className="font-semibold">{children}</strong>
  ),
  em: ({ children }: { children?: React.ReactNode }) => (
    <em className="opacity-80">{children}</em>
  ),
  ul: ({ children }: { children?: React.ReactNode }) => (
    <ul className="mb-2 ml-1 space-y-1 last:mb-0">{children}</ul>
  ),
  ol: ({ children }: { children?: React.ReactNode }) => (
    <ol className="mb-2 ml-1 list-decimal space-y-1 pl-4 last:mb-0">{children}</ol>
  ),
  li: ({ children }: { children?: React.ReactNode }) => (
    <li className="flex gap-2 text-sm leading-relaxed">
      <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-current opacity-30" />
      <span>{children}</span>
    </li>
  ),
  code: ({ children, className }: { children?: React.ReactNode; className?: string }) => {
    const isBlock = className?.includes('language-')
    if (isBlock) {
      return (
        <code
          className={cn(
            'block overflow-x-auto rounded-lg border border-border/60',
            'bg-muted/50 px-3 py-2 font-mono text-xs leading-relaxed',
          )}
        >
          {children}
        </code>
      )
    }
    return (
      <code className="rounded-md border border-border/50 bg-muted/60 px-1.5 py-0.5 font-mono text-xs">
        {children}
      </code>
    )
  },
  pre: ({ children }: { children?: React.ReactNode }) => (
    <pre className="mb-2 last:mb-0">{children}</pre>
  ),
  blockquote: ({ children }: { children?: React.ReactNode }) => (
    <blockquote className="mb-2 border-l-2 border-current/20 pl-3 text-sm italic opacity-80 last:mb-0">
      {children}
    </blockquote>
  ),
}

export function CreateCourseWizard({ children }: { children: ReactNode }) {
  const router = useRouter()
  const prefersReduced = useReducedMotion() ?? false
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState<WizardStep>('topic')
  const [topic, setTopic] = useState('')
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [inputValue, setInputValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [completedCourse, setCompletedCourse] = useState<CompletedCourse | null>(null)
  const [generationError, setGenerationError] = useState<string | null>(null)
  const [workflowId, setWorkflowId] = useState<string | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  function resetWizard() {
    setStep('topic')
    setTopic('')
    setMessages([])
    setInputValue('')
    setIsLoading(false)
    setCompletedCourse(null)
    setGenerationError(null)
    setWorkflowId(null)
  }

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen)
    if (!nextOpen) resetWizard()
  }

  useEffect(() => {
    if (scrollRef.current) {
      const viewport = scrollRef.current.querySelector(
        '[data-radix-scroll-area-viewport]'
      )
      if (viewport) {
        viewport.scrollTop = viewport.scrollHeight
      }
    }
  }, [messages, isLoading])

  async function sendInterviewMessage(userMessage: string) {
    const updatedHistory: ChatMessage[] = [...messages, { role: 'user', content: userMessage }]
    setMessages(updatedHistory)
    setInputValue('')
    setIsLoading(true)

    try {
      const res = await fetch('/api/courses/generate/interview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic, history: updatedHistory }),
      })

      if (!res.ok) {
        setMessages([...updatedHistory, { role: 'assistant', content: 'Sorry, something went wrong. Please try again.' }])
        setIsLoading(false)
        return
      }

      const data = await res.json() as {
        message: string
        ready: boolean
        summary?: string
        fallback?: boolean
      }

      setMessages([...updatedHistory, { role: 'assistant', content: data.message }])
      setIsLoading(false)

      if (data.ready && data.summary) {
        setTimeout(() => startGeneration(data.summary!), 1500)
      }
    } catch {
      setMessages([...updatedHistory, { role: 'assistant', content: 'Connection error. Please try again.' }])
      setIsLoading(false)
    }
  }

  async function startGeneration(summary: string) {
    setStep('generating')
    setGenerationError(null)

    try {
      const res = await fetch('/api/courses/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic, interviewSummary: summary }),
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
    setStep('interview')
    await sendInterviewMessage(`I want to learn about: ${topic}`)
  }

  function handleInterviewSubmit() {
    if (!inputValue.trim() || isLoading) return
    sendInterviewMessage(inputValue.trim())
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

    interview: (
      <div className="flex flex-col gap-3" style={{ height: '400px' }}>
        <ScrollArea className="flex-1 pr-3" ref={scrollRef}>
          <div className="flex flex-col gap-3 py-2">
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={cn(
                    'max-w-[85%] rounded-xl px-3.5 py-2.5 text-sm leading-relaxed',
                    msg.role === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-foreground'
                  )}
                >
                  {msg.role === 'user' ? (
                    msg.content
                  ) : (
                    <Markdown
                      remarkPlugins={[remarkGfm]}
                      components={markdownComponents}
                    >
                      {msg.content}
                    </Markdown>
                  )}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-muted rounded-xl px-4 py-3">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            handleInterviewSubmit()
          }}
          className="flex gap-2"
        >
          <Input
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Type your answer..."
            disabled={isLoading}
            autoFocus
          />
          <Button type="submit" size="icon" disabled={isLoading || !inputValue.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </div>
    ),

    generating: workflowId ? (
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
    interview: 'Tell us about yourself',
    generating: 'Creating your course',
    done: 'Course Ready',
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <div onClick={() => setOpen(true)}>{children}</div>
      <DialogContent className="sm:max-w-md">
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
