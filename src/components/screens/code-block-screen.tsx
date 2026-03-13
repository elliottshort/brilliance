'use client'

import { useState, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Play, Check, X, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { FeedbackOverlay } from '@/components/lesson/feedback-overlay'
import { HintDrawer } from '@/components/lesson/hint-drawer'
import { evaluateCode } from '@/lib/code/evaluator'
import type { TestResult } from '@/lib/code/evaluator'
import type { CodeBlockScreen as CodeBlockScreenData } from '@/lib/schemas/content'
import type { ScreenResult } from '@/lib/schemas/progress'

interface CodeBlockScreenProps {
  screen: CodeBlockScreenData
  onComplete: (result: ScreenResult) => void
}

const MAX_ATTEMPTS = 5

const contentReveal = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.15,
    },
  },
}

const itemReveal = {
  hidden: { opacity: 0, y: 8 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: [0.25, 0.4, 0.25, 1] as const },
  },
}

const resultReveal = {
  hidden: { opacity: 0, y: 6 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.3, ease: [0.25, 0.4, 0.25, 1] as const },
  },
}

export function CodeBlockScreen({ screen, onComplete }: CodeBlockScreenProps) {
  const [code, setCode] = useState(screen.starterCode)
  const [testResults, setTestResults] = useState<TestResult[] | null>(null)
  const [attempts, setAttempts] = useState(0)
  const [hintsUsed, setHintsUsed] = useState(0)
  const [showFeedback, setShowFeedback] = useState(false)
  const [allPassed, setAllPassed] = useState(false)
  const [isComplete, setIsComplete] = useState(false)

  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const lineNumbersRef = useRef<HTMLDivElement>(null)

  const lineCount = code.split('\n').length

  const handleRun = useCallback(() => {
    const results = evaluateCode(code, screen.testCases, screen.language)
    setTestResults(results)

    const newAttempts = attempts + 1
    setAttempts(newAttempts)

    const passed = results.every((r) => r.passed)
    setAllPassed(passed)
    setShowFeedback(true)

    if (passed || newAttempts >= MAX_ATTEMPTS) {
      setIsComplete(true)
    }
  }, [code, screen.testCases, screen.language, attempts])

  const handleContinue = useCallback(() => {
    onComplete({
      screenId: screen.id,
      answeredCorrectly: allPassed,
      attempts,
      hintsUsed,
      answeredAt: new Date().toISOString(),
    })
  }, [screen.id, allPassed, attempts, hintsUsed, onComplete])

  const handleRetry = useCallback(() => {
    setShowFeedback(false)
    setTestResults(null)
    textareaRef.current?.focus()
  }, [])

  const handleHintUsed = useCallback((hintIndex: number) => {
    setHintsUsed((prev) => Math.max(prev, hintIndex + 1))
  }, [])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Tab') {
        e.preventDefault()
        const target = e.currentTarget
        const start = target.selectionStart
        const end = target.selectionEnd

        const updated = code.substring(0, start) + '  ' + code.substring(end)
        setCode(updated)

        requestAnimationFrame(() => {
          target.selectionStart = target.selectionEnd = start + 2
        })
      }
    },
    [code]
  )

  const handleScroll = useCallback(() => {
    if (textareaRef.current && lineNumbersRef.current) {
      lineNumbersRef.current.scrollTop = textareaRef.current.scrollTop
    }
  }, [])

  const passedCount = testResults?.filter((r) => r.passed).length ?? 0
  const totalCount = testResults?.length ?? 0

  return (
    <motion.div
      variants={contentReveal}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      <motion.h2
        variants={itemReveal}
        className="text-2xl font-bold tracking-tight text-foreground"
      >
        {screen.title}
      </motion.h2>

      <motion.div
        variants={itemReveal}
        className={cn(
          'overflow-hidden rounded-xl border',
          'border-zinc-200 dark:border-zinc-800',
          'shadow-sm'
        )}
      >
        <div
          className={cn(
            'flex items-center gap-2 border-b px-4 py-2.5',
            'border-zinc-300/60 bg-zinc-100 dark:border-zinc-700/60 dark:bg-zinc-900'
          )}
        >
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-red-400/70" />
            <span className="h-2.5 w-2.5 rounded-full bg-amber-400/70" />
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/70" />
          </div>
          <span className="ml-2 rounded-md bg-zinc-200/80 px-2 py-0.5 font-mono text-[0.6875rem] font-medium text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
            {screen.language}
          </span>
        </div>

        <div className="flex bg-zinc-950" style={{ minHeight: '200px', maxHeight: '400px' }}>
          <div
            ref={lineNumbersRef}
            className={cn(
              'shrink-0 select-none overflow-hidden border-r',
              'border-zinc-800/60 bg-zinc-950 py-4 pr-3 pl-4',
              'font-mono text-sm leading-6 text-zinc-600'
            )}
            aria-hidden="true"
          >
            {Array.from({ length: lineCount }, (_, i) => (
              <div key={i + 1} className="text-right">
                {i + 1}
              </div>
            ))}
          </div>

          <textarea
            ref={textareaRef}
            value={code}
            onChange={(e) => setCode(e.target.value)}
            onKeyDown={handleKeyDown}
            onScroll={handleScroll}
            spellCheck={false}
            autoCapitalize="off"
            autoCorrect="off"
            className={cn(
              'flex-1 resize-none overflow-auto border-0 bg-transparent',
              'py-4 pr-4 pl-4',
              'font-mono text-sm leading-6 text-zinc-100',
              'caret-emerald-400 outline-none',
              'placeholder:text-zinc-600'
            )}
            style={{ minHeight: '200px', maxHeight: '400px', tabSize: 2 }}
            placeholder="Write your code here..."
          />
        </div>
      </motion.div>

      <motion.div variants={itemReveal} className="flex items-center justify-between">
        <HintDrawer hints={screen.hints} onHintUsed={handleHintUsed} />

        <div className="flex items-center gap-3">
          {attempts > 0 && !isComplete && (
            <span className="text-xs text-muted-foreground">
              Attempt {attempts}/{MAX_ATTEMPTS}
            </span>
          )}
          <Button
            onClick={handleRun}
            size="lg"
            disabled={showFeedback || code.trim().length === 0}
            className="gap-2"
          >
            <Play className="h-4 w-4" />
            Run Code
          </Button>
        </div>
      </motion.div>

      <AnimatePresence>
        {testResults && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3, ease: [0.25, 0.4, 0.25, 1] }}
            className="space-y-3 overflow-hidden"
          >
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-foreground">Test Results</h3>
              <span
                className={cn(
                  'rounded-full px-2 py-0.5 text-xs font-medium',
                  allPassed
                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300'
                    : 'bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-300'
                )}
              >
                {passedCount}/{totalCount} passed
              </span>
            </div>

            <div className="space-y-2">
              {testResults.map((result, index) => (
                <motion.div
                  key={index}
                  variants={resultReveal}
                  initial="hidden"
                  animate="visible"
                  transition={{ delay: index * 0.06 }}
                  className={cn(
                    'rounded-lg border px-4 py-3',
                    result.passed
                      ? 'border-emerald-200/80 bg-emerald-50/50 dark:border-emerald-800/40 dark:bg-emerald-950/20'
                      : 'border-red-200/80 bg-red-50/50 dark:border-red-800/40 dark:bg-red-950/20'
                  )}
                >
                  <div className="flex items-start gap-3">
                    <div className="shrink-0 pt-0.5">
                      {result.passed ? (
                        <Check className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                      ) : (
                        <X className="h-4 w-4 text-red-600 dark:text-red-400" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1 space-y-1.5">
                      <p className="font-mono text-[0.8125rem] text-foreground/90">
                        {result.input}
                      </p>

                      {result.passed ? (
                        <p className="text-xs text-emerald-700 dark:text-emerald-300">
                          Output: <span className="font-mono">{result.actualOutput}</span>
                        </p>
                      ) : (
                        <div className="space-y-1">
                          {result.error ? (
                            <p className="rounded-md bg-red-100/80 px-2.5 py-1.5 font-mono text-xs text-red-700 dark:bg-red-950/40 dark:text-red-300">
                              {result.error}
                            </p>
                          ) : (
                            <>
                              <div className="flex gap-4 text-xs">
                                <span className="text-emerald-700 dark:text-emerald-400">
                                  Expected:{' '}
                                  <span className="font-mono">
                                    &quot;{result.expectedOutput}&quot;
                                  </span>
                                </span>
                              </div>
                              <div className="flex gap-4 text-xs">
                                <span className="text-red-700 dark:text-red-400">
                                  Received:{' '}
                                  <span className="font-mono">
                                    &quot;{result.actualOutput}&quot;
                                  </span>
                                </span>
                              </div>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {showFeedback && allPassed && (
        <FeedbackOverlay
          isCorrect
          explanation={screen.explanation}
          onContinue={handleContinue}
        />
      )}

      {showFeedback && !allPassed && !isComplete && (
        <FeedbackOverlay
          isCorrect={false}
          explanation="Some tests didn't pass. Review the results and adjust your code."
          onContinue={handleContinue}
          onRetry={handleRetry}
        />
      )}

      {showFeedback && !allPassed && isComplete && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: [0.25, 0.4, 0.25, 1] }}
          className="space-y-4 rounded-xl border border-zinc-200 bg-zinc-50/80 p-6 dark:border-zinc-800 dark:bg-zinc-900/50"
        >
          <div className="flex items-start gap-4">
            <RotateCcw className="mt-0.5 h-5 w-5 shrink-0 text-zinc-500" />
            <div className="space-y-2">
              <h3 className="text-lg font-semibold tracking-tight text-foreground">
                Maximum attempts reached
              </h3>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {screen.explanation}
              </p>
            </div>
          </div>
          <div className="flex justify-end">
            <Button onClick={handleContinue} size="sm">
              Continue
            </Button>
          </div>
        </motion.div>
      )}
    </motion.div>
  )
}
