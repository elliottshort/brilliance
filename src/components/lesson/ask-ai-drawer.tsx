'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { Sparkles, SendHorizonal } from 'lucide-react'
import Markdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

interface AskAiDrawerProps {
  courseId: string
  lessonId: string
  screenId: string
  screenData: {
    type: string
    title: string
    content?: string
    explanation?: string
  }
}

const markdownComponents = {
  h1: ({ children }: { children?: React.ReactNode }) => (
    <h3 className="mb-3 mt-6 text-base font-bold tracking-tight text-foreground first:mt-0">
      {children}
    </h3>
  ),
  h2: ({ children }: { children?: React.ReactNode }) => (
    <h4 className="mb-2 mt-4 text-sm font-semibold tracking-tight text-foreground first:mt-0">
      {children}
    </h4>
  ),
  p: ({ children }: { children?: React.ReactNode }) => (
    <p className="mb-3 text-sm leading-relaxed text-foreground/85 last:mb-0">
      {children}
    </p>
  ),
  strong: ({ children }: { children?: React.ReactNode }) => (
    <strong className="font-semibold text-foreground">{children}</strong>
  ),
  em: ({ children }: { children?: React.ReactNode }) => (
    <em className="text-foreground/75">{children}</em>
  ),
  ul: ({ children }: { children?: React.ReactNode }) => (
    <ul className="mb-3 ml-1 space-y-1 last:mb-0">{children}</ul>
  ),
  ol: ({ children }: { children?: React.ReactNode }) => (
    <ol className="mb-3 ml-1 list-decimal space-y-1 pl-4 last:mb-0">
      {children}
    </ol>
  ),
  li: ({ children }: { children?: React.ReactNode }) => (
    <li className="flex gap-2 text-sm leading-relaxed text-foreground/85">
      <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-foreground/30" />
      <span>{children}</span>
    </li>
  ),
  code: ({
    children,
    className,
  }: {
    children?: React.ReactNode
    className?: string
  }) => {
    const isBlock = className?.includes('language-')
    if (isBlock) {
      return (
        <code
          className={cn(
            'block overflow-x-auto rounded-lg border border-[var(--glass-border)]',
            'bg-[var(--glass-bg-subtle)] px-3 py-2 font-mono text-xs leading-relaxed',
            'text-foreground/90'
          )}
        >
          {children}
        </code>
      )
    }
    return (
      <code
        className={cn(
          'rounded-md border border-[var(--glass-border)] bg-[var(--glass-bg-subtle)]',
          'px-1.5 py-0.5 font-mono text-xs text-foreground/90'
        )}
      >
        {children}
      </code>
    )
  },
  pre: ({ children }: { children?: React.ReactNode }) => (
    <pre className="mb-3 last:mb-0">{children}</pre>
  ),
  blockquote: ({ children }: { children?: React.ReactNode }) => (
    <blockquote
      className={cn(
        'mb-3 border-l-2 border-foreground/20 pl-3',
        'text-sm italic text-foreground/70 last:mb-0'
      )}
    >
      {children}
    </blockquote>
  ),
}

function LoadingDots() {
  return (
    <div className="flex items-center gap-1 px-1 py-0.5">
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="h-1.5 w-1.5 rounded-full bg-muted-foreground/60"
          animate={{ opacity: [0.3, 1, 0.3] }}
          transition={{
            duration: 1.2,
            repeat: Infinity,
            delay: i * 0.2,
            ease: 'easeInOut',
          }}
        />
      ))}
    </div>
  )
}

function MessageBubble({
  message,
  isLoading,
  prefersReduced,
}: {
  message: Message
  isLoading?: boolean
  prefersReduced: boolean
}) {
  const isUser = message.role === 'user'

  return (
    <motion.div
      initial={prefersReduced ? { opacity: 1 } : { opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={
        prefersReduced
          ? { duration: 0 }
          : { duration: 0.3, ease: [0.25, 0.4, 0.25, 1] }
      }
      className={cn('flex w-full', isUser ? 'justify-end' : 'justify-start')}
    >
      <div
        className={cn(
          'max-w-[85%] rounded-2xl px-4 py-2.5',
          isUser
            ? 'rounded-br-md bg-primary text-primary-foreground'
            : 'rounded-bl-md border border-[var(--glass-border)] bg-[var(--glass-bg-subtle)] text-foreground'
        )}
      >
        {isUser ? (
          <p className="text-sm leading-relaxed">{message.content}</p>
        ) : isLoading ? (
          <LoadingDots />
        ) : (
          <div className="ask-ai-prose">
            <Markdown
              remarkPlugins={[remarkGfm]}
              components={markdownComponents}
            >
              {message.content}
            </Markdown>
          </div>
        )}
      </div>
    </motion.div>
  )
}

export function AskAiDrawer({
  courseId,
  lessonId,
  screenId,
  screenData,
}: AskAiDrawerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const prefersReduced = useReducedMotion() ?? false

  useEffect(() => {
    setMessages([])
    setInput('')
    setIsLoading(false)
  }, [screenId])

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

  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => inputRef.current?.focus(), 100)
      return () => clearTimeout(timer)
    }
  }, [isOpen])

  const sendMessage = useCallback(async () => {
    const question = input.trim()
    if (!question || isLoading) return

    const userMessage: Message = { role: 'user', content: question }
    setMessages((prev) => [...prev, userMessage])
    setInput('')
    setIsLoading(true)

    const allMessages = [...messages, userMessage]
    const history = allMessages.slice(-10).map((m) => ({
      role: m.role,
      content: m.content,
    }))

    try {
      const res = await fetch('/api/adapt/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          courseId,
          lessonId,
          screenId,
          question,
          screenData,
          history,
        }),
      })

      if (!res.ok) throw new Error('Failed to get response')

      const data = (await res.json()) as { answer: string }
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: data.answer },
      ])
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content:
            'Sorry, I could not process your question right now. Please try again.',
        },
      ])
    } finally {
      setIsLoading(false)
    }
  }, [input, isLoading, messages, courseId, lessonId, screenId, screenData])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  return (
    <>
      <AnimatePresence>
        {!isOpen && (
          <motion.div
            initial={prefersReduced ? { opacity: 1 } : { opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={prefersReduced ? { opacity: 0 } : { opacity: 0, scale: 0.8 }}
            transition={
              prefersReduced
                ? { duration: 0 }
                : { duration: 0.3, ease: [0.25, 0.4, 0.25, 1] }
            }
            className="fixed bottom-6 right-6 z-40"
          >
            <Button
              onClick={() => setIsOpen(true)}
              size="lg"
              className={cn(
                'group relative h-12 gap-2 rounded-full px-5',
                'bg-primary/90 text-primary-foreground hover:bg-primary/80',
                'border border-[var(--glass-border)]',
                'transition-shadow'
              )}
              style={{ boxShadow: 'var(--glass-shadow-outer), var(--glass-shadow-inner)' }}
            >
              {!prefersReduced && (
                <span
                  className={cn(
                    'pointer-events-none absolute inset-0 rounded-full',
                    'motion-safe:animate-ping bg-[var(--glass-tint)]/10'
                  )}
                  style={{ animationDuration: '2.5s' }}
                />
              )}
              <Sparkles className="h-4 w-4 transition-transform group-hover:scale-110" />
              <span className="text-sm font-medium">Ask AI</span>
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetContent
          side="right"
          className={cn(
            'flex w-full flex-col gap-0 p-0 sm:max-w-[400px]',
            '[&>button]:right-3 [&>button]:top-3'
          )}
        >
          <SheetHeader className="shrink-0 border-b border-[var(--glass-border)] px-5 py-4">
            <SheetTitle className="flex items-center gap-2 text-base">
              <Sparkles className="h-4 w-4 text-primary" />
              Ask AI
            </SheetTitle>
          </SheetHeader>

          <ScrollArea ref={scrollRef} className="flex-1">
            <div className="flex min-h-full flex-col px-4 py-4">
              {messages.length === 0 && !isLoading ? (
                <div className="flex flex-1 flex-col items-center justify-center py-16">
                  <motion.div
                    initial={prefersReduced ? {} : { opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={
                      prefersReduced
                        ? { duration: 0 }
                        : { delay: 0.1, duration: 0.4 }
                    }
                    className="text-center"
                  >
                    <div
                      className={cn(
                        'mx-auto mb-4 flex h-12 w-12 items-center justify-center',
                        'rounded-full bg-primary/10'
                      )}
                    >
                      <Sparkles className="h-5 w-5 text-primary" />
                    </div>
                    <p className="text-sm font-medium text-foreground/70">
                      Ask anything about this screen
                    </p>
                    <p className="mt-1.5 text-xs text-muted-foreground">
                      Get help understanding concepts, examples, or explanations
                    </p>
                  </motion.div>
                </div>
              ) : (
                <div className="space-y-3">
                  {messages.map((message, index) => (
                    <MessageBubble
                      key={`${screenId}-${index}`}
                      message={message}
                      prefersReduced={prefersReduced}
                    />
                  ))}
                  {isLoading && (
                    <MessageBubble
                      message={{ role: 'assistant', content: '' }}
                      isLoading
                      prefersReduced={prefersReduced}
                    />
                  )}
                </div>
              )}
            </div>
          </ScrollArea>

          <div className="shrink-0 border-t border-[var(--glass-border)] px-4 py-3">
            <div className="flex items-center gap-2">
              <Input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask a question..."
                disabled={isLoading}
                className={cn(
                  'flex-1 rounded-full px-4',
                  'text-sm placeholder:text-muted-foreground/60',
                  'focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-offset-0'
                )}
              />
              <Button
                onClick={sendMessage}
                disabled={!input.trim() || isLoading}
                size="icon"
                className="h-10 w-10 shrink-0 rounded-full"
              >
                <SendHorizonal className="h-4 w-4" />
                <span className="sr-only">Send message</span>
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
}
