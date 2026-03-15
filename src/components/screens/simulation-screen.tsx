'use client'

import { useState, useCallback } from 'react'
import { motion, useReducedMotion, AnimatePresence } from 'framer-motion'
import type { SimulationScreen } from '@/lib/schemas/content'
import { FeedbackOverlay } from '@/components/lesson/feedback-overlay'
import { HintDrawer } from '@/components/lesson/hint-drawer'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const MAX_ATTEMPTS = 3

type Phase = 'predicting' | 'observing' | 'feedback' | 'revealed'

interface ScreenResult {
  screenId: string
  answeredCorrectly: boolean
  attempts: number
  hintsUsed: number
  answeredAt: string
}

interface ObjectPosition {
  x: number
  y: number
}

function applyRules(
  objects: SimulationScreen['scenario']['objects'],
  rules: SimulationScreen['scenario']['rules'],
): Map<string, ObjectPosition> {
  const positions = new Map<string, ObjectPosition>()
  for (const obj of objects) {
    positions.set(obj.id, { x: obj.x, y: obj.y })
  }

  for (const rule of rules) {
    if (rule.action === 'fall') {
      const pos = positions.get(rule.target)
      if (pos) positions.set(rule.target, { x: pos.x, y: 350 })
    } else if (rule.action === 'rise') {
      const pos = positions.get(rule.target)
      if (pos) positions.set(rule.target, { x: pos.x, y: 50 })
    } else if (rule.action === 'move_right') {
      const pos = positions.get(rule.target)
      if (pos) positions.set(rule.target, { x: Math.min(pos.x + 150, 550), y: pos.y })
    } else if (rule.action === 'move_left') {
      const pos = positions.get(rule.target)
      if (pos) positions.set(rule.target, { x: Math.max(pos.x - 150, 50), y: pos.y })
    }
  }

  return positions
}

export function SimulationScreenRenderer({
  screen,
  onComplete,
}: {
  screen: SimulationScreen
  onComplete: (result: ScreenResult) => void
}) {
  const prefersReduced = useReducedMotion()

  const [phase, setPhase] = useState<Phase>('predicting')
  const [attempts, setAttempts] = useState(0)
  const [hintsUsed, setHintsUsed] = useState(0)
  const [prediction, setPrediction] = useState<string | number | null>(null)
  const [numericInput, setNumericInput] = useState('')
  const [paramValues, setParamValues] = useState<Record<string, number>>(() => {
    const init: Record<string, number> = {}
    if (screen.scenario.parameters) {
      for (const p of screen.scenario.parameters) {
        init[p.id] = p.defaultValue
      }
    }
    return init
  })
  const [animated, setAnimated] = useState(false)
  const [isCorrect, setIsCorrect] = useState(false)

  const finalPositions = applyRules(screen.scenario.objects, screen.scenario.rules)

  const handleHintUsed = useCallback((idx: number) => {
    setHintsUsed((prev) => Math.max(prev, idx + 1))
  }, [])

  const handleRun = useCallback(() => {
    const userPrediction = screen.prediction.options === 'numeric'
      ? parseFloat(numericInput)
      : prediction

    if (userPrediction === null || userPrediction === undefined) return
    if (typeof userPrediction === 'number' && isNaN(userPrediction)) return

    const newAttempts = attempts + 1
    setAttempts(newAttempts)

    let correct = false
    if (typeof screen.prediction.correctAnswer === 'number' && typeof userPrediction === 'number') {
      const tolerance = screen.prediction.tolerance ?? 0
      correct = Math.abs(userPrediction - screen.prediction.correctAnswer) <= tolerance
    } else {
      correct = String(userPrediction).trim().toLowerCase() === String(screen.prediction.correctAnswer).trim().toLowerCase()
    }

    setIsCorrect(correct)

    if (prefersReduced) {
      setAnimated(true)
      setPhase('feedback')
    } else {
      setPhase('observing')
      setAnimated(true)
      setTimeout(() => {
        setPhase('feedback')
      }, 1500)
    }
  }, [prediction, numericInput, attempts, screen.prediction, prefersReduced])

  const handleRetry = useCallback(() => {
    setPrediction(null)
    setNumericInput('')
    setAnimated(false)
    setPhase('predicting')
  }, [])

  const handleContinue = useCallback(() => {
    if (isCorrect) {
      onComplete({
        screenId: screen.id,
        answeredCorrectly: true,
        attempts,
        hintsUsed,
        answeredAt: new Date().toISOString(),
      })
    } else if (attempts >= MAX_ATTEMPTS) {
      setPhase('revealed')
    } else {
      handleRetry()
    }
  }, [isCorrect, attempts, hintsUsed, screen.id, onComplete, handleRetry])

  const handleRevealedContinue = useCallback(() => {
    onComplete({
      screenId: screen.id,
      answeredCorrectly: false,
      attempts,
      hintsUsed,
      answeredAt: new Date().toISOString(),
    })
  }, [screen.id, attempts, hintsUsed, onComplete])

  const isRunDisabled = screen.prediction.options === 'numeric'
    ? numericInput.trim() === ''
    : prediction === null

  return (
    <motion.div
      className="mx-auto w-full max-w-2xl space-y-6"
      initial={prefersReduced ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] }}
    >
      <div className="space-y-1">
        <h2 className="text-lg font-semibold">{screen.title}</h2>
        {screen.instruction && (
          <p className="text-sm text-muted-foreground">{screen.instruction}</p>
        )}
      </div>

      {/* SVG Scene */}
      <div className="rounded-xl border border-[var(--glass-border)] bg-card overflow-hidden">
        <svg viewBox="0 0 600 400" className="w-full" role="img" aria-label={screen.title}>
          <title>{screen.title}</title>
          <desc>Interactive simulation scene</desc>

          {/* Grid */}
          {Array.from({ length: 12 }, (_, i) => (
            <line
              key={`gx-${i}`}
              x1={i * 50} y1={0} x2={i * 50} y2={400}
              stroke="hsl(var(--muted-foreground) / 0.08)" strokeWidth={0.5}
            />
          ))}
          {Array.from({ length: 8 }, (_, i) => (
            <line
              key={`gy-${i}`}
              x1={0} y1={i * 50} x2={600} y2={i * 50}
              stroke="hsl(var(--muted-foreground) / 0.08)" strokeWidth={0.5}
            />
          ))}

          {/* Ground line */}
          <line x1={0} y1={380} x2={600} y2={380} stroke="hsl(var(--foreground) / 0.2)" strokeWidth={1} />

          {/* Objects */}
          {screen.scenario.objects.map((obj) => {
            const finalPos = finalPositions.get(obj.id) ?? { x: obj.x, y: obj.y }
            const targetX = animated ? finalPos.x : obj.x
            const targetY = animated ? finalPos.y : obj.y

            if (obj.type === 'rectangle') {
              return (
                <g key={obj.id}>
                  <motion.rect
                    x={obj.x - 25}
                    y={obj.y - 20}
                    width={50}
                    height={40}
                    rx={6}
                    fill="hsl(var(--primary))"
                    animate={{ x: targetX - 25, y: targetY - 20 }}
                    transition={prefersReduced ? { duration: 0 } : { duration: 1.2, ease: 'easeInOut' }}
                  />
                  <motion.text
                    x={obj.x}
                    y={obj.y + 5}
                    textAnchor="middle"
                    fill="white"
                    fontSize={11}
                    fontWeight={600}
                    animate={{ x: targetX, y: targetY + 5 }}
                    transition={prefersReduced ? { duration: 0 } : { duration: 1.2, ease: 'easeInOut' }}
                  >
                    {obj.label}
                  </motion.text>
                </g>
              )
            }

            return (
              <g key={obj.id}>
                <motion.circle
                  cx={obj.x}
                  cy={obj.y}
                  r={22}
                  fill="hsl(var(--primary))"
                  animate={{ cx: targetX, cy: targetY }}
                  transition={prefersReduced ? { duration: 0 } : { duration: 1.2, ease: 'easeInOut' }}
                />
                <motion.text
                  x={obj.x}
                  y={obj.y + 4}
                  textAnchor="middle"
                  fill="white"
                  fontSize={11}
                  fontWeight={600}
                  animate={{ x: targetX, y: targetY + 4 }}
                  transition={prefersReduced ? { duration: 0 } : { duration: 1.2, ease: 'easeInOut' }}
                >
                  {obj.label}
                </motion.text>
              </g>
            )
          })}
        </svg>
      </div>

      {/* Parameter sliders */}
      {screen.scenario.parameters && screen.scenario.parameters.length > 0 && phase === 'predicting' && (
        <div className="space-y-3">
          {screen.scenario.parameters.map((param) => (
            <div key={param.id} className="flex flex-wrap items-center gap-2 sm:flex-nowrap sm:gap-3">
              <label className="w-full text-sm font-medium sm:w-auto sm:min-w-[120px]">
                {param.label}{param.unit ? ` (${param.unit})` : ''}
              </label>
              <input
                type="range"
                min={param.min}
                max={param.max}
                step={param.step}
                value={paramValues[param.id] ?? param.defaultValue}
                onChange={(e) => setParamValues((prev) => ({ ...prev, [param.id]: parseFloat(e.target.value) }))}
                className="flex-1 accent-primary"
              />
              <span className="text-sm tabular-nums w-12 shrink-0 text-right">
                {paramValues[param.id] ?? param.defaultValue}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Prediction question */}
      {phase === 'predicting' && (
        <div className="space-y-4">
          <p className="text-sm font-medium">{screen.prediction.question}</p>

          {screen.prediction.options === 'numeric' ? (
            <input
              type="number"
              value={numericInput}
              onChange={(e) => setNumericInput(e.target.value)}
              placeholder="Enter your prediction..."
              className="w-full rounded-lg border border-[var(--glass-border)] bg-card px-4 py-2.5 text-sm"
            />
          ) : (
            <div className="grid gap-2">
              {screen.prediction.options.map((option) => (
                <button
                  key={option}
                  onClick={() => setPrediction(option)}
                  className={cn(
                    'rounded-xl border-2 px-4 py-3 text-left text-sm transition-colors',
                    prediction === option
                      ? 'border-primary bg-primary/10 font-medium'
                      : 'border-[var(--glass-border)] bg-card hover:border-primary/30'
                  )}
                >
                  {option}
                </button>
              ))}
            </div>
          )}

          <Button
            onClick={handleRun}
            disabled={isRunDisabled}
            className="w-full"
          >
            Run Simulation
          </Button>
        </div>
      )}

      {/* Observing indicator */}
      {phase === 'observing' && (
        <div className="text-center text-sm text-muted-foreground animate-pulse">
          Running simulation...
        </div>
      )}

      {/* Revealed state */}
      {phase === 'revealed' && (
        <div className="space-y-4">
          <div className="rounded-xl border border-[var(--glass-border)] bg-[var(--glass-bg-subtle)] p-4">
            <p className="text-sm font-medium text-foreground/80 mb-1">Correct Answer</p>
            <p className="text-sm">{String(screen.prediction.correctAnswer)}</p>
          </div>
          <div className="rounded-xl border border-[var(--glass-border)] bg-[var(--glass-bg-subtle)] p-4">
            <p className="text-sm font-medium text-foreground/80 mb-1">Explanation</p>
            <p className="text-sm text-muted-foreground">{screen.explanation}</p>
          </div>
          <Button onClick={handleRevealedContinue} className="w-full">Continue</Button>
        </div>
      )}

      {/* Hint drawer */}
      <HintDrawer hints={screen.hints} onHintUsed={handleHintUsed} />

      {/* Feedback overlay */}
      <AnimatePresence>
        {phase === 'feedback' && (
          <FeedbackOverlay
            isCorrect={isCorrect}
            explanation={screen.explanation}
            onContinue={handleContinue}
            onRetry={!isCorrect && attempts < MAX_ATTEMPTS ? handleRetry : undefined}
          />
        )}
      </AnimatePresence>
    </motion.div>
  )
}
