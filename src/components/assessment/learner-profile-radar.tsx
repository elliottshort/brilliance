'use client'

import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  Radar,
  ResponsiveContainer,
} from 'recharts'
import { useReducedMotion } from 'framer-motion'
import { useTheme } from 'next-themes'
import type { LearnerProfileDimensions } from '@/lib/schemas/assessment'
import { cn } from '@/lib/utils'

interface LearnerProfileRadarProps {
  dimensions: LearnerProfileDimensions
  className?: string
}

const THEME_COLORS = {
  light: {
    primary: '#2563eb',
    primaryFill: 'rgba(37, 99, 235, 0.2)',
    muted: '#64748b',
    grid: '#e2e8f0',
  },
  dark: {
    primary: '#3b82f6',
    primaryFill: 'rgba(59, 130, 246, 0.2)',
    muted: '#94a3b8',
    grid: '#1e293b',
  },
} as const

function formatPercent(value: number): string {
  return `${Math.round(value * 100)}%`
}

export function LearnerProfileRadar({
  dimensions,
  className,
}: LearnerProfileRadarProps) {
  const prefersReduced = useReducedMotion()
  const { resolvedTheme } = useTheme()

  const colors = THEME_COLORS[resolvedTheme === 'dark' ? 'dark' : 'light']

  const data = [
    { axis: 'Prior Knowledge', value: dimensions.priorKnowledge },
    { axis: 'Pattern Recognition', value: dimensions.patternRecognition },
    { axis: 'Abstraction', value: dimensions.abstractionComfort },
    { axis: 'Reasoning Style', value: dimensions.reasoningStyle },
    { axis: 'Cognitive Stamina', value: dimensions.cognitiveStamina },
    { axis: 'Self-Awareness', value: dimensions.selfAwareness },
  ]

  const ariaLabel = `Learner profile radar chart showing 6 dimensions: ${data
    .map((d) => `${d.axis} ${formatPercent(d.value)}`)
    .join(', ')}`

  return (
    <div
      className={cn('min-w-[280px] w-full', className)}
      aria-label={ariaLabel}
      role="img"
    >
      <ResponsiveContainer width="100%" aspect={1}>
        <RadarChart cx="50%" cy="50%" outerRadius="70%" data={data}>
          <PolarGrid stroke={colors.grid} strokeOpacity={0.6} />
          <PolarAngleAxis
            dataKey="axis"
            tick={{
              fill: colors.muted,
              fontSize: 12,
            }}
            tickLine={false}
          />
          <Radar
            name="Profile"
            dataKey="value"
            stroke={colors.primary}
            fill={colors.primaryFill}
            strokeWidth={2}
            isAnimationActive={!prefersReduced}
            animationDuration={800}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  )
}
