'use client'

import { useState, useRef, useCallback, useMemo } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { Play, Check, X, RotateCcw } from 'lucide-react'
import Editor from 'react-simple-code-editor'
import Prism from 'prismjs'
import 'prismjs/components/prism-clike'
import 'prismjs/components/prism-javascript'
import 'prismjs/components/prism-typescript'
import 'prismjs/components/prism-python'
import 'prismjs/components/prism-c'
import 'prismjs/components/prism-cpp'
import 'prismjs/components/prism-java'
import 'prismjs/components/prism-rust'
import 'prismjs/components/prism-go'
import 'prismjs/components/prism-ruby'
import 'prismjs/components/prism-sql'
import 'prismjs/components/prism-bash'
import 'prismjs/components/prism-css'
import 'prismjs/components/prism-markup'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { FeedbackOverlay } from '@/components/lesson/feedback-overlay'
import { HintDrawer } from '@/components/lesson/hint-drawer'
import { evaluateCode } from '@/lib/code/evaluator'
import type { TestResult } from '@/lib/code/evaluator'
import type { CodeBlockScreen as CodeBlockScreenData } from '@/lib/schemas/content'
import type { ScreenResult } from '@/components/screens/shared/screen-utils'

interface CodeBlockScreenProps {
  screen: CodeBlockScreenData
  onComplete: (result: ScreenResult) => void
}

const MAX_ATTEMPTS = 5

const LANGUAGE_MAP: Record<string, string> = {
  javascript: 'javascript',
  js: 'javascript',
  typescript: 'typescript',
  ts: 'typescript',
  python: 'python',
  py: 'python',
  c: 'c',
  'c++': 'cpp',
  cpp: 'cpp',
  'c#': 'clike',
  csharp: 'clike',
  java: 'java',
  rust: 'rust',
  go: 'go',
  ruby: 'ruby',
  rb: 'ruby',
  sql: 'sql',
  bash: 'bash',
  shell: 'bash',
  sh: 'bash',
  css: 'css',
  html: 'markup',
  xml: 'markup',
  markup: 'markup',
}

function getPrismGrammar(language: string): { grammar: Prism.Grammar; key: string } {
  const key = LANGUAGE_MAP[language.toLowerCase()] ?? 'clike'
  const grammar = Prism.languages[key] ?? Prism.languages.clike
  return { grammar, key }
}

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
  const prefersReduced = useReducedMotion() ?? false
  const [code, setCode] = useState(screen.starterCode)
  const [testResults, setTestResults] = useState<TestResult[] | null>(null)
  const [attempts, setAttempts] = useState(0)
  const [hintsUsed, setHintsUsed] = useState(0)
  const [allPassed, setAllPassed] = useState(false)
  const [isComplete, setIsComplete] = useState(false)

  const editorWrapperRef = useRef<HTMLDivElement>(null)
  const lineNumbersRef = useRef<HTMLDivElement>(null)

  const lineCount = code.split('\n').length

  const { grammar, key: languageKey } = useMemo(
    () => getPrismGrammar(screen.language),
    [screen.language]
  )

  const highlightCode = useCallback(
    (value: string) => Prism.highlight(value, grammar, languageKey),
    [grammar, languageKey]
  )

  const handleRun = useCallback(() => {
    const results = evaluateCode(code, screen.testCases, screen.language)
    setTestResults(results)

    const newAttempts = attempts + 1
    setAttempts(newAttempts)

    const passed = results.every((r) => r.passed)
    setAllPassed(passed)

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

  const handleHintUsed = useCallback((hintIndex: number) => {
    setHintsUsed((prev) => Math.max(prev, hintIndex + 1))
  }, [])

  const handleEditorScroll = useCallback(() => {
    const wrapper = editorWrapperRef.current
    if (wrapper && lineNumbersRef.current) {
      lineNumbersRef.current.scrollTop = wrapper.scrollTop
    }
  }, [])

  const passedCount = testResults?.filter((r) => r.passed).length ?? 0
  const totalCount = testResults?.length ?? 0

  return (
    <>
      <style>{`
        .code-editor-prism .token.comment,
        .code-editor-prism .token.prolog,
        .code-editor-prism .token.doctype,
        .code-editor-prism .token.cdata { color: #6b7280; font-style: italic; }
        .code-editor-prism .token.keyword { color: #c084fc; }
        .code-editor-prism .token.string,
        .code-editor-prism .token.char,
        .code-editor-prism .token.template-string { color: #34d399; }
        .code-editor-prism .token.number { color: #f59e0b; }
        .code-editor-prism .token.function { color: #60a5fa; }
        .code-editor-prism .token.operator { color: #f472b6; }
        .code-editor-prism .token.punctuation { color: #9ca3af; }
        .code-editor-prism .token.class-name,
        .code-editor-prism .token.builtin { color: #fbbf24; }
        .code-editor-prism .token.boolean { color: #f97316; }
        .code-editor-prism .token.property { color: #38bdf8; }
        .code-editor-prism .token.attr-name { color: #38bdf8; }
        .code-editor-prism .token.attr-value { color: #34d399; }
        .code-editor-prism .token.tag { color: #f472b6; }
        .code-editor-prism .token.selector { color: #c084fc; }
        .code-editor-prism .token.regex { color: #f59e0b; }
        .code-editor-prism .token.important { color: #f97316; font-weight: bold; }

        .code-editor-prism textarea {
          outline: none !important;
          caret-color: #34d399 !important;
        }
        .code-editor-prism textarea:focus-visible {
          box-shadow: inset 0 0 0 2px var(--ring, hsl(var(--ring))) !important;
          border-radius: 0 !important;
        }
      `}</style>

      <motion.div
        variants={contentReveal}
        initial={prefersReduced ? false : 'hidden'}
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
            'border-[var(--glass-border)]',
            'shadow-sm'
          )}
        >
          <div
            className={cn(
              'flex items-center gap-2 border-b px-4 py-2.5',
              'border-[var(--glass-border)] bg-[var(--glass-bg-subtle)]'
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

            <div
              ref={editorWrapperRef}
              onScroll={handleEditorScroll}
              className="code-editor-prism relative flex-1 overflow-auto"
              style={{ minHeight: '200px', maxHeight: '400px' }}
            >
              <Editor
                value={code}
                onValueChange={setCode}
                highlight={highlightCode}
                padding={16}
                style={{
                  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                  fontSize: '0.875rem',
                  lineHeight: '1.5rem',
                  minHeight: '200px',
                  color: '#e4e4e7',
                  backgroundColor: 'transparent',
                  caretColor: '#34d399',
                }}
                textareaClassName="focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
                placeholder="Write your code here..."
                tabSize={2}
                insertSpaces
              />
            </div>
          </div>
        </motion.div>

        <motion.div variants={itemReveal} className="flex flex-wrap items-center justify-between gap-3">
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
              disabled={code.trim().length === 0 || isComplete}
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
              initial={prefersReduced ? false : { opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={prefersReduced ? { duration: 0 } : { duration: 0.3, ease: [0.25, 0.4, 0.25, 1] }}
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

        {allPassed && isComplete && (
          <FeedbackOverlay
            isCorrect
            explanation={screen.explanation}
            onContinue={handleContinue}
          />
        )}

        {isComplete && !allPassed && (
          <motion.div
            initial={prefersReduced ? false : { opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={prefersReduced ? { duration: 0 } : { duration: 0.3, ease: [0.25, 0.4, 0.25, 1] }}
            className="space-y-4 rounded-xl border border-[var(--glass-border)] bg-[var(--glass-bg-subtle)] p-6"
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
    </>
  )
}
