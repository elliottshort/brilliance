'use client'

import { useState, useRef, useEffect, type ReactNode, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { Send, Loader2, CheckCircle2 } from 'lucide-react'
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

export function CreateCourseWizard({ children }: { children: ReactNode }) {
  const router = useRouter()
  const prefersReduced = useReducedMotion() ?? false
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState<WizardStep>('topic')
  const [topic, setTopic] = useState('')
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [interviewSummary, setInterviewSummary] = useState('')
  const [inputValue, setInputValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [completedCourse, setCompletedCourse] = useState<CompletedCourse | null>(null)
  const [generationError, setGenerationError] = useState<string | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  function resetWizard() {
    setStep('topic')
    setTopic('')
    setMessages([])
    setInterviewSummary('')
    setInputValue('')
    setIsLoading(false)
    setCompletedCourse(null)
    setGenerationError(null)
  }

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen)
    if (!nextOpen) resetWizard()
  }

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

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
        setInterviewSummary(data.summary)
        setTimeout(() => setStep('generating'), 1500)
      }
    } catch {
      setMessages([...updatedHistory, { role: 'assistant', content: 'Connection error. Please try again.' }])
      setIsLoading(false)
    }
  }

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
  }, [])

  const handleGenerationError = useCallback((message: string) => {
    setGenerationError(message)
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
                  className={`max-w-[85%] rounded-xl px-3.5 py-2.5 text-sm leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-foreground'
                  }`}
                >
                  {msg.content}
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

    generating: (
      <GenerationProgress
        topic={topic}
        interviewSummary={interviewSummary}
        onComplete={handleGenerationComplete}
        onError={handleGenerationError}
      />
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
            {generationError && step === 'generating' && (
              <p className="mt-2 text-center text-xs text-destructive">{generationError}</p>
            )}
          </motion.div>
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  )
}
