import { NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { getClaudeClient, ADAPTATION_MODEL } from '@/lib/claude/client'
import { PROFILE_NARRATIVE_PROMPT } from '@/lib/claude/prompts/profile-prompt'
import { scoreProfile } from '@/lib/assessment/scoring'
import {
  AssessmentPuzzleSchema,
  AssessmentResponseSchema,
} from '@/lib/schemas/assessment'
import type { LearnerProfileDimensions } from '@/lib/schemas/assessment'

const ProfileRequestSchema = z.object({
  topic: z.string().min(1),
  puzzles: z.array(AssessmentPuzzleSchema).min(1),
  responses: z.array(AssessmentResponseSchema).min(1),
})

const DIMENSION_LABELS: Record<keyof LearnerProfileDimensions, { low: string; high: string }> = {
  priorKnowledge: {
    low: 'approaching this topic with fresh eyes',
    high: 'bringing significant existing knowledge',
  },
  patternRecognition: {
    low: 'preferring explicit, step-by-step guidance',
    high: 'naturally spotting patterns and structural relationships',
  },
  abstractionComfort: {
    low: 'learning best from concrete examples first',
    high: 'comfortable reasoning with abstract concepts',
  },
  reasoningStyle: {
    low: 'a methodical, step-by-step reasoning approach',
    high: 'a big-picture, conceptual reasoning approach',
  },
  cognitiveStamina: {
    low: 'benefiting from shorter, focused learning sessions',
    high: 'sustaining focus and accuracy throughout longer sessions',
  },
  selfAwareness: {
    low: 'still calibrating self-assessment of their knowledge',
    high: 'accurately gauging their own understanding',
  },
}

function interpretDimension(key: keyof LearnerProfileDimensions, value: number): string {
  const labels = DIMENSION_LABELS[key]
  return value >= 0.5 ? labels.high : labels.low
}

function buildFallbackNarrative(dimensions: LearnerProfileDimensions): string {
  const entries = Object.entries(dimensions) as [keyof LearnerProfileDimensions, number][]
  const sorted = [...entries].sort((a, b) => b[1] - a[1])
  const highest = sorted[0]
  const lowest = sorted[sorted.length - 1]

  return `Based on your responses, you showed ${interpretDimension(highest[0], highest[1])} and have room to grow in ${interpretDimension(lowest[0], lowest[1])}. Your course will be tailored accordingly.`
}

function buildDimensionSummary(dimensions: LearnerProfileDimensions): string {
  return (Object.entries(dimensions) as [keyof LearnerProfileDimensions, number][])
    .map(([key, value]) => `- ${key}: ${value.toFixed(2)} — ${interpretDimension(key, value)}`)
    .join('\n')
}

function buildPuzzleResponseSummary(
  puzzles: z.infer<typeof ProfileRequestSchema>['puzzles'],
  responses: z.infer<typeof ProfileRequestSchema>['responses'],
): string {
  return responses
    .map((r) => {
      const puzzle = puzzles.find((p) => p.id === r.puzzleId)
      const label = puzzle ? ('title' in puzzle ? puzzle.title : 'statement' in puzzle ? puzzle.statement : puzzle.type) : r.puzzleType
      const correctLabel = r.correct === true ? 'correct' : r.correct === false ? 'incorrect' : 'unscored'
      return `- [${r.puzzleType}] "${label}" — ${correctLabel}, ${r.responseTimeMs}ms, ${r.hintsUsed} hints`
    })
    .join('\n')
}

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = ProfileRequestSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid request body', details: parsed.error.issues },
      { status: 400 },
    )
  }

  const { topic, puzzles, responses } = parsed.data

  const dimensions = scoreProfile(responses, puzzles)

  const client = getClaudeClient()
  let narrative: string

  if (!client) {
    narrative = buildFallbackNarrative(dimensions)
  } else {
    try {
      const dimensionSummary = buildDimensionSummary(dimensions)
      const puzzleResponseSummary = buildPuzzleResponseSummary(puzzles, responses)

      const message = await client.messages.create({
        model: ADAPTATION_MODEL,
        max_tokens: 1024,
        system: PROFILE_NARRATIVE_PROMPT,
        messages: [
          {
            role: 'user',
            content: `Topic: ${topic}

Dimension Scores:
${dimensionSummary}

Assessment Activity Summary (${responses.length} responses across ${puzzles.length} puzzles):
${puzzleResponseSummary}

Write the learner's narrative portrait.`,
          },
        ],
      })

      const textBlock = message.content.find((block) => block.type === 'text')
      narrative = textBlock?.text || buildFallbackNarrative(dimensions)
    } catch {
      narrative = buildFallbackNarrative(dimensions)
    }
  }

  const profile = {
    dimensions,
    topic,
    narrative,
    assessedAt: new Date().toISOString(),
  }

  return NextResponse.json({ profile })
}
