'use client'

import { useState, useCallback, useMemo, useRef } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { FeedbackOverlay } from '@/components/lesson/feedback-overlay'
import { HintDrawer } from '@/components/lesson/hint-drawer'
import { cn } from '@/lib/utils'
import type { InteractiveGraphScreen } from '@/lib/schemas/content'

// ─── Types ──────────────────────────────────────────────────────────────

interface ScreenResult {
  screenId: string
  answeredCorrectly: boolean
  attempts: number
  hintsUsed: number
  answeredAt: string
}

// ─── Constants ──────────────────────────────────────────────────────────

const MAX_ATTEMPTS = 3
const SVG_W = 600
const SVG_H = 400
const PAD = { top: 30, right: 40, bottom: 50, left: 60 }
const PLOT_W = SVG_W - PAD.left - PAD.right
const PLOT_H = SVG_H - PAD.top - PAD.bottom
const POINT_HIT_RADIUS = 15 // SVG-space pixels

// ─── Coordinate helpers ─────────────────────────────────────────────────

function toSvgX(val: number, min: number, max: number) {
  return PAD.left + ((val - min) / (max - min)) * PLOT_W
}

function toSvgY(val: number, min: number, max: number) {
  return PAD.top + PLOT_H - ((val - min) / (max - min)) * PLOT_H
}

function toDataX(svgX: number, min: number, max: number) {
  return min + ((svgX - PAD.left) / PLOT_W) * (max - min)
}

function toDataY(svgY: number, min: number, max: number) {
  return min + ((PAD.top + PLOT_H - svgY) / PLOT_H) * (max - min)
}

/** Snap a value to the nearest step tick. */
function snap(val: number, min: number, max: number, step?: number) {
  if (!step) return Math.round(val * 10) / 10
  const s = Math.round((val - min) / step) * step + min
  return Math.max(min, Math.min(max, Math.round(s * 1e6) / 1e6))
}

/** Auto-calculate a nice step interval when none provided. */
function niceStep(min: number, max: number) {
  const range = max - min
  const mag = Math.pow(10, Math.floor(Math.log10(range)))
  const norm = range / mag
  if (norm <= 2) return mag / 4
  if (norm <= 5) return mag / 2
  return mag
}

/** Generate tick mark values along an axis. */
function makeTicks(min: number, max: number, step?: number): number[] {
  const s = step ?? niceStep(min, max)
  const out: number[] = []
  const start = Math.ceil(min / s) * s
  for (let v = start; v <= max + s * 0.001; v += s) {
    out.push(Math.round(v * 1e6) / 1e6)
  }
  return out
}

/** Euclidean distance in data space. */
function dist(a: { x: number; y: number }, b: { x: number; y: number }) {
  return Math.hypot(a.x - b.x, a.y - b.y)
}

/**
 * Check user points against target points within tolerance.
 * Uses greedy matching — each user point can match at most one target.
 * Returns the set of matched user-point indices.
 */
function checkPoints(
  user: { x: number; y: number }[],
  target: { x: number; y: number }[],
  tolerance: number
): { allCorrect: boolean; matched: Set<number> } {
  const matched = new Set<number>()
  for (const t of target) {
    let found = false
    for (let i = 0; i < user.length; i++) {
      if (matched.has(i)) continue
      if (dist(user[i], t) <= tolerance) {
        matched.add(i)
        found = true
        break
      }
    }
    if (!found) return { allCorrect: false, matched }
  }
  return { allCorrect: matched.size >= target.length, matched }
}

// ─── Component ──────────────────────────────────────────────────────────

export function InteractiveGraphScreenRenderer({
  screen,
  onComplete,
}: {
  screen: InteractiveGraphScreen
  onComplete: (result: ScreenResult) => void
}) {
  const prefersReduced = useReducedMotion() ?? false
  const svgRef = useRef<SVGSVGElement>(null)

  // Phase machine
  const [phase, setPhase] = useState<'plotting' | 'feedback' | 'revealed'>(
    'plotting'
  )
  const [attempts, setAttempts] = useState(0)
  const [hintsUsed, setHintsUsed] = useState(0)
  const [lastCorrect, setLastCorrect] = useState(false)
  const [matched, setMatched] = useState<Set<number>>(new Set())

  // Interaction state — plot_points
  const [userPoints, setUserPoints] = useState<{ x: number; y: number }[]>([])
  // Interaction state — draw_line
  const [linePoints, setLinePoints] = useState<{ x: number; y: number }[]>([])
  // Interaction state — adjust_slider
  const [sliderVals, setSliderVals] = useState<Record<string, number>>(() => {
    const init: Record<string, number> = {}
    screen.sliders?.forEach((s) => {
      init[s.id] = s.defaultValue
    })
    return init
  })
  // Hover tooltip
  const [hover, setHover] = useState<{
    x: number
    y: number
    sx: number
    sy: number
  } | null>(null)

  // ── Derived values ────────────────────────────────────────────────────

  const xTicks = useMemo(
    () => makeTicks(screen.xAxis.min, screen.xAxis.max, screen.xAxis.step),
    [screen.xAxis]
  )
  const yTicks = useMemo(
    () => makeTicks(screen.yAxis.min, screen.yAxis.max, screen.yAxis.step),
    [screen.yAxis]
  )

  /** Points derived from slider positions (adjust_slider mode). */
  const sliderPts = useMemo(() => {
    if (screen.graphType !== 'adjust_slider' || !screen.sliders) return []
    return screen.targetData.map((t, i) => {
      const sl = screen.sliders?.[i]
      return { x: t.x, y: sl ? (sliderVals[sl.id] ?? sl.defaultValue) : 0 }
    })
  }, [screen.graphType, screen.targetData, screen.sliders, sliderVals])

  const canCheck = useMemo(() => {
    if (screen.graphType === 'plot_points')
      return userPoints.length === screen.targetData.length
    if (screen.graphType === 'draw_line') return linePoints.length === 2
    if (screen.graphType === 'adjust_slider') return true
    return false
  }, [
    screen.graphType,
    userPoints.length,
    linePoints.length,
    screen.targetData.length,
  ])

  // ── Event → data coords ──────────────────────────────────────────────

  const eventToData = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      const svg = svgRef.current
      if (!svg) return null
      const rect = svg.getBoundingClientRect()
      const sx = ((e.clientX - rect.left) / rect.width) * SVG_W
      const sy = ((e.clientY - rect.top) / rect.height) * SVG_H
      // Outside plot area
      if (sx < PAD.left || sx > SVG_W - PAD.right) return null
      if (sy < PAD.top || sy > SVG_H - PAD.bottom) return null
      return {
        x: snap(
          toDataX(sx, screen.xAxis.min, screen.xAxis.max),
          screen.xAxis.min,
          screen.xAxis.max,
          screen.xAxis.step
        ),
        y: snap(
          toDataY(sy, screen.yAxis.min, screen.yAxis.max),
          screen.yAxis.min,
          screen.yAxis.max,
          screen.yAxis.step
        ),
        sx,
        sy,
      }
    },
    [screen.xAxis, screen.yAxis]
  )

  // ── Handlers ──────────────────────────────────────────────────────────

  const handleClick = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      if (phase !== 'plotting') return
      const d = eventToData(e)
      if (!d) return

      if (screen.graphType === 'plot_points') {
        // Click near existing point → remove it
        const hitIdx = userPoints.findIndex((p) => {
          const px = toSvgX(p.x, screen.xAxis.min, screen.xAxis.max)
          const py = toSvgY(p.y, screen.yAxis.min, screen.yAxis.max)
          return Math.hypot(px - d.sx, py - d.sy) < POINT_HIT_RADIUS
        })
        if (hitIdx >= 0) {
          setUserPoints((prev) => prev.filter((_, i) => i !== hitIdx))
        } else if (userPoints.length < screen.targetData.length) {
          setUserPoints((prev) => [...prev, { x: d.x, y: d.y }])
        }
      } else if (screen.graphType === 'draw_line') {
        if (linePoints.length >= 2) {
          setLinePoints([{ x: d.x, y: d.y }])
        } else {
          setLinePoints((prev) => [...prev, { x: d.x, y: d.y }])
        }
      }
    },
    [
      phase,
      screen.graphType,
      screen.xAxis,
      screen.yAxis,
      screen.targetData.length,
      userPoints,
      linePoints,
      eventToData,
    ]
  )

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      if (phase !== 'plotting' || screen.graphType === 'adjust_slider') {
        setHover(null)
        return
      }
      setHover(eventToData(e))
    },
    [phase, screen.graphType, eventToData]
  )

  const handleMouseLeave = useCallback(() => setHover(null), [])

  const getAnswerPts = useCallback((): { x: number; y: number }[] => {
    if (screen.graphType === 'plot_points') return userPoints
    if (screen.graphType === 'draw_line') return linePoints
    if (screen.graphType === 'adjust_slider') return sliderPts
    return []
  }, [screen.graphType, userPoints, linePoints, sliderPts])

  const handleCheck = useCallback(() => {
    if (phase !== 'plotting') return
    const n = attempts + 1
    setAttempts(n)

    const { allCorrect, matched: m } = checkPoints(
      getAnswerPts(),
      screen.targetData,
      screen.tolerance
    )
    setMatched(m)
    setLastCorrect(allCorrect)

    if (allCorrect) {
      setPhase('feedback')
    } else if (n >= MAX_ATTEMPTS) {
      setPhase('revealed')
    } else {
      setPhase('feedback')
    }
  }, [phase, attempts, screen.targetData, screen.tolerance, getAnswerPts])

  const handleRetry = useCallback(() => {
    setPhase('plotting')
    setLastCorrect(false)
    setMatched(new Set())
  }, [])

  const handleContinue = useCallback(() => {
    onComplete({
      screenId: screen.id,
      answeredCorrectly: lastCorrect,
      attempts,
      hintsUsed,
      answeredAt: new Date().toISOString(),
    })
  }, [screen.id, lastCorrect, attempts, hintsUsed, onComplete])

  const handleRevealedContinue = useCallback(() => {
    onComplete({
      screenId: screen.id,
      answeredCorrectly: false,
      attempts,
      hintsUsed,
      answeredAt: new Date().toISOString(),
    })
  }, [screen.id, attempts, hintsUsed, onComplete])

  const handleHintUsed = useCallback((_hintIndex: number) => {
    setHintsUsed((prev) => prev + 1)
  }, [])

  // ── Render ────────────────────────────────────────────────────────────

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6">
      {/* Header */}
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
        <p className="mt-2 text-sm text-muted-foreground">
          {screen.instruction}
        </p>
      </motion.div>

      {/* ── SVG Coordinate Plane ─────────────────────────────────────── */}
      <motion.div
        initial={prefersReduced ? false : { opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{
          duration: prefersReduced ? 0 : 0.5,
          delay: prefersReduced ? 0 : 0.1,
          ease: [0.25, 0.4, 0.25, 1],
        }}
        className="rounded-xl border border-[var(--glass-border)] bg-card p-4"
      >
        <svg
          ref={svgRef}
          viewBox={`0 0 ${SVG_W} ${SVG_H}`}
          className={cn(
            'w-full select-none',
            phase === 'plotting' &&
              screen.graphType !== 'adjust_slider' &&
              'cursor-crosshair'
          )}
          onClick={handleClick}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          role="img"
          aria-label={`Interactive graph: ${screen.title}`}
        >
          {/* Plot area background */}
          <rect
            x={PAD.left}
            y={PAD.top}
            width={PLOT_W}
            height={PLOT_H}
            className="fill-background/50"
            rx={2}
          />

          {/* Grid — vertical lines */}
          {xTicks.map((v) => (
            <line
              key={`gv${v}`}
              x1={toSvgX(v, screen.xAxis.min, screen.xAxis.max)}
              y1={PAD.top}
              x2={toSvgX(v, screen.xAxis.min, screen.xAxis.max)}
              y2={PAD.top + PLOT_H}
              className="stroke-muted-foreground/15"
              strokeWidth={0.5}
            />
          ))}

          {/* Grid — horizontal lines */}
          {yTicks.map((v) => (
            <line
              key={`gh${v}`}
              x1={PAD.left}
              y1={toSvgY(v, screen.yAxis.min, screen.yAxis.max)}
              x2={PAD.left + PLOT_W}
              y2={toSvgY(v, screen.yAxis.min, screen.yAxis.max)}
              className="stroke-muted-foreground/15"
              strokeWidth={0.5}
            />
          ))}

          {/* Axes */}
          <line
            x1={PAD.left}
            y1={PAD.top + PLOT_H}
            x2={PAD.left + PLOT_W}
            y2={PAD.top + PLOT_H}
            className="stroke-foreground/60"
            strokeWidth={1.5}
          />
          <line
            x1={PAD.left}
            y1={PAD.top}
            x2={PAD.left}
            y2={PAD.top + PLOT_H}
            className="stroke-foreground/60"
            strokeWidth={1.5}
          />

          {/* X-axis ticks + labels */}
          {xTicks.map((v) => {
            const x = toSvgX(v, screen.xAxis.min, screen.xAxis.max)
            return (
              <g key={`xt${v}`}>
                <line
                  x1={x}
                  y1={PAD.top + PLOT_H}
                  x2={x}
                  y2={PAD.top + PLOT_H + 6}
                  className="stroke-foreground/60"
                  strokeWidth={1}
                />
                <text
                  x={x}
                  y={PAD.top + PLOT_H + 20}
                  textAnchor="middle"
                  className="fill-muted-foreground text-[11px]"
                >
                  {v}
                </text>
              </g>
            )
          })}

          {/* Y-axis ticks + labels */}
          {yTicks.map((v) => {
            const y = toSvgY(v, screen.yAxis.min, screen.yAxis.max)
            return (
              <g key={`yt${v}`}>
                <line
                  x1={PAD.left - 6}
                  y1={y}
                  x2={PAD.left}
                  y2={y}
                  className="stroke-foreground/60"
                  strokeWidth={1}
                />
                <text
                  x={PAD.left - 10}
                  y={y + 4}
                  textAnchor="end"
                  className="fill-muted-foreground text-[11px]"
                >
                  {v}
                </text>
              </g>
            )
          })}

          {/* Axis labels */}
          <text
            x={PAD.left + PLOT_W / 2}
            y={SVG_H - 5}
            textAnchor="middle"
            className="fill-foreground/70 text-xs font-medium"
          >
            {screen.xAxis.label}
          </text>
          <text
            x={14}
            y={PAD.top + PLOT_H / 2}
            textAnchor="middle"
            className="fill-foreground/70 text-xs font-medium"
            transform={`rotate(-90, 14, ${PAD.top + PLOT_H / 2})`}
          >
            {screen.yAxis.label}
          </text>

          {/* Existing data (gray, non-interactive) */}
          {screen.existingData?.map((pt, i) => {
            const cx = toSvgX(pt.x, screen.xAxis.min, screen.xAxis.max)
            const cy = toSvgY(pt.y, screen.yAxis.min, screen.yAxis.max)
            return (
              <g key={`ex${i}`}>
                <circle
                  cx={cx}
                  cy={cy}
                  r={5}
                  className="fill-muted-foreground/40"
                />
                {pt.label && (
                  <text
                    x={cx + 8}
                    y={cy - 8}
                    className="fill-muted-foreground text-[10px]"
                  >
                    {pt.label}
                  </text>
                )}
              </g>
            )
          })}

          {/* Target ghost circles (dashed outlines) */}
          {phase === 'plotting' &&
            screen.targetData.map((pt, i) => (
              <circle
                key={`tg${i}`}
                cx={toSvgX(pt.x, screen.xAxis.min, screen.xAxis.max)}
                cy={toSvgY(pt.y, screen.yAxis.min, screen.yAxis.max)}
                r={8}
                className="stroke-primary/30"
                strokeDasharray="4,4"
                fill="none"
                strokeWidth={1.5}
              />
            ))}

          {/* Target line ghost (draw_line mode) */}
          {phase === 'plotting' &&
            screen.graphType === 'draw_line' &&
            screen.targetData.length >= 2 && (
              <line
                x1={toSvgX(
                  screen.targetData[0].x,
                  screen.xAxis.min,
                  screen.xAxis.max
                )}
                y1={toSvgY(
                  screen.targetData[0].y,
                  screen.yAxis.min,
                  screen.yAxis.max
                )}
                x2={toSvgX(
                  screen.targetData[1].x,
                  screen.xAxis.min,
                  screen.xAxis.max
                )}
                y2={toSvgY(
                  screen.targetData[1].y,
                  screen.yAxis.min,
                  screen.yAxis.max
                )}
                className="stroke-primary/15"
                strokeWidth={1.5}
                strokeDasharray="6,4"
              />
            )}

          {/* Target curve ghost (adjust_slider mode) */}
          {phase === 'plotting' &&
            screen.graphType === 'adjust_slider' &&
            screen.targetData.length > 1 && (
              <polyline
                points={screen.targetData
                  .map(
                    (p) =>
                      `${toSvgX(p.x, screen.xAxis.min, screen.xAxis.max)},${toSvgY(p.y, screen.yAxis.min, screen.yAxis.max)}`
                  )
                  .join(' ')}
                fill="none"
                className="stroke-primary/15"
                strokeWidth={1.5}
                strokeDasharray="6,4"
                strokeLinejoin="round"
              />
            )}

          {/* ── User points — plot_points mode ─────────────────────── */}
          {screen.graphType === 'plot_points' &&
            userPoints.map((pt, i) => {
              const cx = toSvgX(pt.x, screen.xAxis.min, screen.xAxis.max)
              const cy = toSvgY(pt.y, screen.yAxis.min, screen.yAxis.max)
              const isOk = matched.has(i)
              return (
                <g
                  key={`up${i}`}
                  style={{
                    filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.15))',
                  }}
                >
                  <circle
                    cx={cx}
                    cy={cy}
                    r={6}
                    className={
                      isOk
                        ? 'fill-emerald-500 dark:fill-emerald-400'
                        : 'fill-primary'
                    }
                  />
                  <text
                    x={cx + 10}
                    y={cy - 10}
                    className="fill-foreground/70 text-[10px] font-medium"
                  >
                    ({pt.x}, {pt.y})
                  </text>
                </g>
              )
            })}

          {/* ── User line — draw_line mode ──────────────────────────── */}
          {screen.graphType === 'draw_line' && linePoints.length > 0 && (
            <>
              {linePoints.length === 2 && (
                <line
                  x1={toSvgX(
                    linePoints[0].x,
                    screen.xAxis.min,
                    screen.xAxis.max
                  )}
                  y1={toSvgY(
                    linePoints[0].y,
                    screen.yAxis.min,
                    screen.yAxis.max
                  )}
                  x2={toSvgX(
                    linePoints[1].x,
                    screen.xAxis.min,
                    screen.xAxis.max
                  )}
                  y2={toSvgY(
                    linePoints[1].y,
                    screen.yAxis.min,
                    screen.yAxis.max
                  )}
                  className="stroke-primary"
                  strokeWidth={2}
                  strokeLinecap="round"
                />
              )}
              {linePoints.map((pt, i) => {
                const cx = toSvgX(pt.x, screen.xAxis.min, screen.xAxis.max)
                const cy = toSvgY(pt.y, screen.yAxis.min, screen.yAxis.max)
                const isOk = matched.has(i)
                return (
                  <g
                    key={`lp${i}`}
                    style={{
                      filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.15))',
                    }}
                  >
                    <circle
                      cx={cx}
                      cy={cy}
                      r={6}
                      className={
                        isOk
                          ? 'fill-emerald-500 dark:fill-emerald-400'
                          : 'fill-primary'
                      }
                    />
                    <text
                      x={cx + 10}
                      y={cy - 10}
                      className="fill-foreground/70 text-[10px] font-medium"
                    >
                      ({pt.x}, {pt.y})
                    </text>
                  </g>
                )
              })}
            </>
          )}

          {/* ── Slider-derived points + curve ──────────────────────── */}
          {screen.graphType === 'adjust_slider' && sliderPts.length > 0 && (
            <>
              {sliderPts.length > 1 && (
                <polyline
                  points={sliderPts
                    .map(
                      (p) =>
                        `${toSvgX(p.x, screen.xAxis.min, screen.xAxis.max)},${toSvgY(p.y, screen.yAxis.min, screen.yAxis.max)}`
                    )
                    .join(' ')}
                  fill="none"
                  className="stroke-primary/50"
                  strokeWidth={1.5}
                  strokeLinejoin="round"
                />
              )}
              {sliderPts.map((pt, i) => {
                const cx = toSvgX(pt.x, screen.xAxis.min, screen.xAxis.max)
                const cy = toSvgY(pt.y, screen.yAxis.min, screen.yAxis.max)
                const isOk = matched.has(i)
                return (
                  <g
                    key={`sp${i}`}
                    style={{
                      filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.15))',
                    }}
                  >
                    {/* Guide lines */}
                    <line
                      x1={PAD.left}
                      y1={cy}
                      x2={cx}
                      y2={cy}
                      className="stroke-primary/20"
                      strokeWidth={0.5}
                      strokeDasharray="3,3"
                    />
                    <line
                      x1={cx}
                      y1={PAD.top + PLOT_H}
                      x2={cx}
                      y2={cy}
                      className="stroke-primary/20"
                      strokeWidth={0.5}
                      strokeDasharray="3,3"
                    />
                    <circle
                      cx={cx}
                      cy={cy}
                      r={6}
                      className={
                        isOk
                          ? 'fill-emerald-500 dark:fill-emerald-400'
                          : 'fill-primary'
                      }
                    />
                  </g>
                )
              })}
            </>
          )}

          {/* ── Revealed state — correct answers ───────────────────── */}
          {phase === 'revealed' &&
            screen.targetData.map((pt, i) => {
              const cx = toSvgX(pt.x, screen.xAxis.min, screen.xAxis.max)
              const cy = toSvgY(pt.y, screen.yAxis.min, screen.yAxis.max)
              return (
                <g key={`rv${i}`}>
                  <circle
                    cx={cx}
                    cy={cy}
                    r={6}
                    className="fill-emerald-500 dark:fill-emerald-400"
                    opacity={0.85}
                  />
                  <text
                    x={cx + 10}
                    y={cy - 10}
                    className="fill-emerald-700 dark:fill-emerald-300 text-[10px] font-medium"
                  >
                    ({pt.x}, {pt.y})
                  </text>
                </g>
              )
            })}

          {/* Revealed line (draw_line) */}
          {phase === 'revealed' &&
            screen.graphType === 'draw_line' &&
            screen.targetData.length >= 2 && (
              <line
                x1={toSvgX(
                  screen.targetData[0].x,
                  screen.xAxis.min,
                  screen.xAxis.max
                )}
                y1={toSvgY(
                  screen.targetData[0].y,
                  screen.yAxis.min,
                  screen.yAxis.max
                )}
                x2={toSvgX(
                  screen.targetData[1].x,
                  screen.xAxis.min,
                  screen.xAxis.max
                )}
                y2={toSvgY(
                  screen.targetData[1].y,
                  screen.yAxis.min,
                  screen.yAxis.max
                )}
                className="stroke-emerald-500 dark:stroke-emerald-400"
                strokeWidth={2}
                strokeLinecap="round"
                opacity={0.85}
              />
            )}

          {/* Revealed curve (adjust_slider) */}
          {phase === 'revealed' &&
            screen.graphType === 'adjust_slider' &&
            screen.targetData.length > 1 && (
              <polyline
                points={screen.targetData
                  .map(
                    (p) =>
                      `${toSvgX(p.x, screen.xAxis.min, screen.xAxis.max)},${toSvgY(p.y, screen.yAxis.min, screen.yAxis.max)}`
                  )
                  .join(' ')}
                fill="none"
                className="stroke-emerald-500 dark:stroke-emerald-400"
                strokeWidth={2}
                strokeLinejoin="round"
                opacity={0.85}
              />
            )}

          {/* ── Hover crosshair + tooltip ───────────────────────────── */}
          {hover && phase === 'plotting' && (
            <>
              <line
                x1={hover.sx}
                y1={PAD.top}
                x2={hover.sx}
                y2={PAD.top + PLOT_H}
                className="stroke-primary/20"
                strokeWidth={0.5}
                strokeDasharray="4,4"
              />
              <line
                x1={PAD.left}
                y1={hover.sy}
                x2={PAD.left + PLOT_W}
                y2={hover.sy}
                className="stroke-primary/20"
                strokeWidth={0.5}
                strokeDasharray="4,4"
              />
              {/* Tooltip */}
              {(() => {
                const label = `(${hover.x}, ${hover.y})`
                const w = label.length * 7 + 12
                const tx =
                  hover.sx + 12 + w > SVG_W - PAD.right
                    ? hover.sx - w - 4
                    : hover.sx + 12
                const ty =
                  hover.sy - 26 < PAD.top ? hover.sy + 8 : hover.sy - 26
                return (
                  <>
                    <rect
                      x={tx}
                      y={ty}
                      width={w}
                      height={22}
                      rx={4}
                      className="fill-card stroke-border"
                      strokeWidth={0.5}
                    />
                    <text
                      x={tx + w / 2}
                      y={ty + 15}
                      textAnchor="middle"
                      className="fill-foreground text-[11px] font-medium"
                    >
                      {label}
                    </text>
                  </>
                )
              })()}
            </>
          )}
        </svg>
      </motion.div>

      {/* Status text — plot_points */}
      {phase === 'plotting' && screen.graphType === 'plot_points' && (
        <p className="text-center text-xs text-muted-foreground">
          {userPoints.length} of {screen.targetData.length} points placed
          {userPoints.length > 0 && ' \u2014 click a point to remove it'}
        </p>
      )}

      {/* Status text — draw_line */}
      {phase === 'plotting' && screen.graphType === 'draw_line' && (
        <p className="text-center text-xs text-muted-foreground">
          {linePoints.length === 0 && 'Click to place the first endpoint'}
          {linePoints.length === 1 && 'Click to place the second endpoint'}
          {linePoints.length === 2 && 'Line drawn \u2014 click to redraw'}
        </p>
      )}

      {/* ── Sliders (adjust_slider mode) ───────────────────────────── */}
      {screen.graphType === 'adjust_slider' &&
        screen.sliders &&
        phase === 'plotting' && (
          <motion.div
            initial={prefersReduced ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: prefersReduced ? 0 : 0.3,
              delay: prefersReduced ? 0 : 0.2,
            }}
            className="space-y-4 rounded-xl border border-[var(--glass-border)] bg-[var(--glass-bg-subtle)] p-4"
          >
            {screen.sliders.map((sl) => (
              <div key={sl.id} className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label
                    htmlFor={`slider-${sl.id}`}
                    className="text-sm font-medium text-foreground/85"
                  >
                    {sl.label}
                  </label>
                  <span className="font-mono text-sm tabular-nums text-muted-foreground">
                    {sliderVals[sl.id] ?? sl.defaultValue}
                  </span>
                </div>
                <input
                  id={`slider-${sl.id}`}
                  type="range"
                  min={sl.min}
                  max={sl.max}
                  step={sl.step}
                  value={sliderVals[sl.id] ?? sl.defaultValue}
                  onChange={(e) =>
                    setSliderVals((prev) => ({
                      ...prev,
                      [sl.id]: parseFloat(e.target.value),
                    }))
                  }
                  className="h-2 w-full cursor-pointer appearance-none rounded-full bg-muted accent-primary"
                />
                <div className="flex justify-between text-[10px] text-muted-foreground/60">
                  <span>{sl.min}</span>
                  <span>{sl.max}</span>
                </div>
              </div>
            ))}
          </motion.div>
        )}

      {/* Check Answer button */}
      {phase === 'plotting' && (
        <motion.div
          initial={prefersReduced ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: prefersReduced ? 0 : 0.2 }}
          className="flex justify-end"
        >
          <Button
            onClick={handleCheck}
            size="lg"
            className="px-8"
            disabled={!canCheck}
          >
            Check Answer
          </Button>
        </motion.div>
      )}

      {/* Feedback overlay — correct or incorrect with retry */}
      {phase === 'feedback' && (
        <FeedbackOverlay
          isCorrect={lastCorrect}
          explanation={screen.explanation}
          onContinue={handleContinue}
          onRetry={handleRetry}
        />
      )}

      {/* Revealed state — after max attempts */}
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
              Here&apos;s the correct answer:
            </p>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              {screen.explanation}
            </p>
          </div>
          <div className="flex justify-end">
            <Button
              onClick={handleRevealedContinue}
              size="lg"
              className="px-8"
            >
              Continue
            </Button>
          </div>
        </motion.div>
      )}

      {/* Hint drawer */}
      {phase === 'plotting' && (
        <HintDrawer hints={screen.hints} onHintUsed={handleHintUsed} />
      )}
    </div>
  )
}
