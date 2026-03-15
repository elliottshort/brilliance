'use client'

import { useState, useCallback, useMemo, useRef } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { MoveHorizontal } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { FeedbackOverlay } from '@/components/lesson/feedback-overlay'
import { HintDrawer } from '@/components/lesson/hint-drawer'
import { cn } from '@/lib/utils'
import type { NumberLineScreen } from '@/lib/schemas/content'

interface ScreenResult {
  screenId: string
  answeredCorrectly: boolean
  attempts: number
  hintsUsed: number
  answeredAt: string
}

const MAX_ATTEMPTS = 3

// ─── SVG layout constants ──────────────────────────────────────────────
const SVG_W = 600
const SVG_H = 120
const LINE_Y = 75
const X0 = 50
const X1 = 550
const SPAN = X1 - X0
const TICK_H = 6
const MARKER_R = 12

// ─── Helpers ────────────────────────────────────────────────────────────

function gcd(a: number, b: number): number {
  a = Math.abs(Math.round(a))
  b = Math.abs(Math.round(b))
  while (b) {
    ;[a, b] = [b, a % b]
  }
  return a
}

function toFraction(value: number): string {
  if (Number.isInteger(value)) return `${value}`
  const sign = value < 0 ? -1 : 1
  const abs = Math.abs(value)
  const denoms = [2, 3, 4, 5, 6, 8, 10, 12, 16, 20, 100]
  for (const d of denoms) {
    const n = abs * d
    if (Math.abs(n - Math.round(n)) < 0.0001) {
      const num = Math.round(n) * sign
      const div = gcd(Math.abs(num), d)
      return `${num / div}/${d / div}`
    }
  }
  return value.toFixed(2)
}

function fmtVal(
  v: number,
  mode: NumberLineScreen['displayMode'],
  custom?: Record<string, string>
): string {
  switch (mode) {
    case 'integer':
      return `${Math.round(v)}`
    case 'decimal':
      return v % 1 === 0 ? `${v}` : parseFloat(v.toFixed(4)).toString()
    case 'fraction':
      return toFraction(v)
    case 'custom_labels':
      return custom?.[String(v)] ?? `${v}`
  }
}

function valToX(v: number, min: number, max: number) {
  return X0 + ((v - min) / (max - min)) * SPAN
}

function xToVal(x: number, min: number, max: number) {
  return min + ((Math.max(X0, Math.min(X1, x)) - X0) / SPAN) * (max - min)
}

// ─── NumberLineScreenRenderer ──────────────────────────────────────────

export function NumberLineScreenRenderer({
  screen,
  onComplete,
}: {
  screen: NumberLineScreen
  onComplete: (result: ScreenResult) => void
}) {
  const prefersReduced = useReducedMotion() ?? false
  const svgRef = useRef<SVGSVGElement>(null)
  const draggingRef = useRef<string | null>(null)

  const midVal = (screen.min + screen.max) / 2
  const initPositions = useMemo(() => {
    const p: Record<string, number> = {}
    screen.markers.forEach((m) => {
      p[m.id] = midVal
    })
    return p
  }, [screen.markers, midVal])

  const [positions, setPositions] = useState<Record<string, number>>(initPositions)
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [phase, setPhase] = useState<'placing' | 'feedback' | 'revealed'>('placing')
  const [correct, setCorrect] = useState(false)
  const [attempts, setAttempts] = useState(0)
  const [hintsUsed, setHintsUsed] = useState(0)
  const [statuses, setStatuses] = useState<
    Record<string, 'idle' | 'correct' | 'incorrect'>
  >({})

  // Generate tick positions
  const ticks = useMemo(() => {
    const t: number[] = []
    const eps = screen.step * 0.001
    for (let v = screen.min; v <= screen.max + eps; v += screen.step) {
      t.push(Math.round(v * 1e6) / 1e6)
    }
    return t
  }, [screen.min, screen.max, screen.step])

  const nearest = useCallback(
    (v: number) =>
      ticks.reduce((best, t) =>
        Math.abs(t - v) < Math.abs(best - v) ? t : best
      ),
    [ticks]
  )

  const clientToSvgX = useCallback((clientX: number) => {
    if (!svgRef.current) return X0
    const rect = svgRef.current.getBoundingClientRect()
    return ((clientX - rect.left) / rect.width) * SVG_W
  }, [])

  // ─── Pointer drag ──────────────────────────────────────────────────

  const startDrag = useCallback(
    (id: string, e: React.PointerEvent) => {
      if (phase !== 'placing' || draggingRef.current) return
      e.preventDefault()
      draggingRef.current = id
      setDraggingId(id)

      const { min, max, step } = screen

      const onMove = (ev: PointerEvent) => {
        const val = xToVal(clientToSvgX(ev.clientX), min, max)
        const near = nearest(val)
        const snapped = Math.abs(near - val) < step * 0.4 ? near : val
        setPositions((p) => ({ ...p, [id]: snapped }))
      }

      const onUp = () => {
        setPositions((p) => ({ ...p, [id]: nearest(p[id]) }))
        draggingRef.current = null
        setDraggingId(null)
        window.removeEventListener('pointermove', onMove)
        window.removeEventListener('pointerup', onUp)
      }

      window.addEventListener('pointermove', onMove)
      window.addEventListener('pointerup', onUp)
    },
    [phase, clientToSvgX, screen, nearest]
  )

  // ─── Check answer ──────────────────────────────────────────────────

  const checkAnswer = useCallback(() => {
    if (phase !== 'placing') return

    const n = attempts + 1
    setAttempts(n)

    const s: Record<string, 'correct' | 'incorrect'> = {}
    let allOk = true

    screen.markers.forEach((m) => {
      const ok = Math.abs(positions[m.id] - m.correctValue) <= screen.tolerance
      s[m.id] = ok ? 'correct' : 'incorrect'
      if (!ok) allOk = false
    })

    setStatuses(s)
    setCorrect(allOk)

    if (allOk) {
      setPhase('feedback')
    } else if (n >= MAX_ATTEMPTS) {
      // Reveal correct positions
      const cp: Record<string, number> = {}
      const rs: Record<string, 'correct'> = {}
      screen.markers.forEach((m) => {
        cp[m.id] = m.correctValue
        rs[m.id] = 'correct'
      })
      setPositions(cp)
      setStatuses(rs)
      setPhase('revealed')
    } else {
      setPhase('feedback')
    }
  }, [phase, attempts, positions, screen.markers, screen.tolerance])

  const handleRetry = useCallback(() => {
    setPhase('placing')
    setCorrect(false)
    setStatuses({})
  }, [])

  const handleContinue = useCallback(() => {
    onComplete({
      screenId: screen.id,
      answeredCorrectly: correct,
      attempts,
      hintsUsed,
      answeredAt: new Date().toISOString(),
    })
  }, [screen.id, correct, attempts, hintsUsed, onComplete])

  const handleRevealedContinue = useCallback(() => {
    onComplete({
      screenId: screen.id,
      answeredCorrectly: false,
      attempts,
      hintsUsed,
      answeredAt: new Date().toISOString(),
    })
  }, [screen.id, attempts, hintsUsed, onComplete])

  const handleHintUsed = useCallback((_i: number) => {
    setHintsUsed((prev) => prev + 1)
  }, [])

  // ─── Marker styling helpers ────────────────────────────────────────

  const markerFill = (m: { id: string; color?: string }) => {
    const st = statuses[m.id]
    if (st === 'correct') return 'hsl(152 57% 48%)'
    if (st === 'incorrect') return 'hsl(0 84% 60%)'
    return m.color ?? 'hsl(var(--primary))'
  }

  const markerStroke = (id: string) => {
    const st = statuses[id]
    if (st === 'correct') return 'hsl(152 57% 38%)'
    if (st === 'incorrect') return 'hsl(0 84% 50%)'
    return 'hsl(var(--primary) / 0.5)'
  }

  return (
    <div className="mx-auto w-full max-w-2xl space-y-8">
      {/* ── Instruction heading ────────────────────────────────────── */}
      <motion.div
        initial={prefersReduced ? false : { opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{
          duration: prefersReduced ? 0 : 0.4,
          ease: [0.25, 0.4, 0.25, 1],
        }}
      >
        <h2 className="text-2xl font-bold tracking-tight text-foreground">
          {screen.title}
        </h2>
        <p className="mt-2 flex items-center gap-1.5 text-sm text-muted-foreground">
          <MoveHorizontal className="h-3.5 w-3.5" />
          {screen.instruction}
        </p>
      </motion.div>

      {/* ── SVG number line ────────────────────────────────────────── */}
      <motion.div
        initial={prefersReduced ? false : { opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{
          duration: prefersReduced ? 0 : 0.5,
          delay: prefersReduced ? 0 : 0.15,
          ease: [0.25, 0.4, 0.25, 1],
        }}
        className="rounded-xl border border-[var(--glass-border)] bg-[var(--glass-bg-subtle)] p-4"
      >
        <svg
          ref={svgRef}
          viewBox={`0 0 ${SVG_W} ${SVG_H}`}
          className="w-full touch-none select-none"
          role="img"
          aria-label={`Number line from ${screen.min} to ${screen.max}`}
        >
          {/* Main horizontal line */}
          <line
            x1={X0} y1={LINE_Y} x2={X1} y2={LINE_Y}
            stroke="hsl(var(--foreground) / 0.4)"
            strokeWidth={2}
            strokeLinecap="round"
          />

          {/* End caps */}
          {[X0, X1].map((x) => (
            <line
              key={x}
              x1={x} y1={LINE_Y - TICK_H - 2}
              x2={x} y2={LINE_Y + TICK_H + 2}
              stroke="hsl(var(--foreground) / 0.4)"
              strokeWidth={2}
              strokeLinecap="round"
            />
          ))}

          {/* Tick marks & labels */}
          {ticks.map((v) => {
            const x = valToX(v, screen.min, screen.max)
            const isEnd =
              Math.abs(v - screen.min) < 1e-9 ||
              Math.abs(v - screen.max) < 1e-9

            return (
              <g key={v}>
                {/* Interior tick lines (skip endpoints — end caps cover them) */}
                {!isEnd && (
                  <line
                    x1={x} y1={LINE_Y - TICK_H}
                    x2={x} y2={LINE_Y + TICK_H}
                    stroke="hsl(var(--foreground) / 0.35)"
                    strokeWidth={1.5}
                    strokeLinecap="round"
                  />
                )}
                {screen.showLabels && (
                  <text
                    x={x}
                    y={LINE_Y + TICK_H + 16}
                    textAnchor="middle"
                    fill="hsl(var(--muted-foreground))"
                    style={{ fontSize: 11, fontFamily: 'var(--font-sans, system-ui)' }}
                  >
                    {fmtVal(v, screen.displayMode, screen.customLabels)}
                  </text>
                )}
              </g>
            )
          })}

          {/* Draggable markers */}
          {screen.markers.map((m, i) => {
            const x = valToX(positions[m.id], screen.min, screen.max)
            const isDrag = draggingId === m.id
            const st = statuses[m.id] ?? 'idle'

            return (
              <g
                key={m.id}
                role="slider"
                aria-label={m.label ?? `Marker ${i + 1}`}
                aria-valuemin={screen.min}
                aria-valuemax={screen.max}
                aria-valuenow={Math.round(positions[m.id] * 100) / 100}
                tabIndex={phase === 'placing' ? 0 : -1}
                style={{
                  cursor: phase === 'placing' ? (isDrag ? 'grabbing' : 'grab') : 'default',
                  outline: 'none',
                }}
                onKeyDown={(e) => {
                  if (phase !== 'placing') return
                  if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return
                  e.preventDefault()
                  const cur = positions[m.id]
                  const next =
                    e.key === 'ArrowRight'
                      ? Math.min(cur + screen.step, screen.max)
                      : Math.max(cur - screen.step, screen.min)
                  setPositions((p) => ({ ...p, [m.id]: nearest(next) }))
                }}
              >
                {/* Tooltip during drag */}
                {isDrag && (
                  <g>
                    <rect
                      x={x - 26} y={LINE_Y - MARKER_R - 34}
                      width={52} height={22} rx={6}
                      fill="hsl(var(--foreground))" opacity={0.9}
                    />
                    <text
                      x={x} y={LINE_Y - MARKER_R - 19}
                      textAnchor="middle"
                      fill="hsl(var(--background))"
                      style={{ fontSize: 11, fontWeight: 600, fontFamily: 'var(--font-sans, system-ui)' }}
                    >
                      {fmtVal(positions[m.id], screen.displayMode, screen.customLabels)}
                    </text>
                    <polygon
                      points={`${x - 4},${LINE_Y - MARKER_R - 12} ${x + 4},${LINE_Y - MARKER_R - 12} ${x},${LINE_Y - MARKER_R - 6}`}
                      fill="hsl(var(--foreground))" opacity={0.9}
                    />
                  </g>
                )}

                {/* Label above marker (when not dragging) */}
                {!isDrag && m.label && (
                  <text
                    x={x} y={LINE_Y - MARKER_R - 8}
                    textAnchor="middle"
                    fill={
                      st === 'correct'
                        ? 'hsl(152 57% 48%)'
                        : st === 'incorrect'
                          ? 'hsl(0 84% 60%)'
                          : 'hsl(var(--foreground) / 0.7)'
                    }
                    style={{ fontSize: 12, fontWeight: 600, fontFamily: 'var(--font-sans, system-ui)' }}
                  >
                    {m.label}
                  </text>
                )}

                {/* Glow ring during drag */}
                {isDrag && (
                  <circle
                    cx={x} cy={LINE_Y} r={MARKER_R + 5}
                    fill="none"
                    stroke={markerFill(m)}
                    strokeWidth={2}
                    opacity={0.25}
                  />
                )}

                {/* Status ring */}
                {st !== 'idle' && (
                  <circle
                    cx={x} cy={LINE_Y} r={MARKER_R + 3}
                    fill="none"
                    stroke={markerStroke(m.id)}
                    strokeWidth={2}
                    opacity={0.5}
                  />
                )}

                {/* Main marker circle */}
                <circle
                  cx={x} cy={LINE_Y} r={MARKER_R}
                  fill={markerFill(m)}
                  stroke={markerStroke(m.id)}
                  strokeWidth={2}
                  style={{
                    filter: isDrag
                      ? 'drop-shadow(0 2px 6px rgba(0,0,0,0.25))'
                      : 'none',
                  }}
                  onPointerDown={(e) => startDrag(m.id, e)}
                />

                {/* Index inside circle (multi-marker only) */}
                {screen.markers.length > 1 && (
                  <text
                    x={x} y={LINE_Y + 1}
                    textAnchor="middle"
                    dominantBaseline="central"
                    fill="white"
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      pointerEvents: 'none',
                      fontFamily: 'var(--font-sans, system-ui)',
                    }}
                  >
                    {i + 1}
                  </text>
                )}
              </g>
            )
          })}
        </svg>
      </motion.div>

      {/* ── Check Answer button ────────────────────────────────────── */}
      {phase === 'placing' && (
        <motion.div
          initial={prefersReduced ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: prefersReduced ? 0 : 0.2 }}
          className="flex justify-end"
        >
          <Button onClick={checkAnswer} size="lg" className="px-8">
            Check Answer
          </Button>
        </motion.div>
      )}

      {/* ── Feedback overlay ───────────────────────────────────────── */}
      {phase === 'feedback' && (
        <FeedbackOverlay
          isCorrect={correct}
          explanation={screen.explanation}
          onContinue={handleContinue}
          onRetry={handleRetry}
        />
      )}

      {/* ── Revealed state ─────────────────────────────────────────── */}
      {phase === 'revealed' && (
        <motion.div
          initial={prefersReduced ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            duration: prefersReduced ? 0 : 0.3,
            ease: [0.25, 0.4, 0.25, 1],
          }}
          className="space-y-4"
        >
          <div className="rounded-xl border border-[var(--glass-border)] bg-[var(--glass-bg-subtle)] p-5">
            <p className="text-sm font-medium text-muted-foreground">
              Here&apos;s the correct placement:
            </p>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              {screen.explanation}
            </p>
          </div>
          <div className="flex justify-end">
            <Button onClick={handleRevealedContinue} size="lg" className="px-8">
              Continue
            </Button>
          </div>
        </motion.div>
      )}

      {/* ── Hint drawer ────────────────────────────────────────────── */}
      {phase === 'placing' && (
        <HintDrawer hints={screen.hints} onHintUsed={handleHintUsed} />
      )}
    </div>
  )
}
