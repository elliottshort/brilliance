import { NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { getClaudeClient, ADAPTATION_MODEL } from '@/lib/claude/client'
import {
  ConceptSortPuzzleSchema,
  ConfidenceProbePuzzleSchema,
  AssessmentMultipleChoiceSchema,
  AssessmentFillInBlankSchema,
  AssessmentOrderingSchema,
  AssessmentCodeBlockSchema,
} from '@/lib/schemas/assessment'
import type { AssessmentPuzzle } from '@/lib/schemas/assessment'
import {
  ACT1_ASSESSMENT_PROMPT,
  ACT2_ASSESSMENT_PROMPT,
} from '@/lib/claude/prompts/assessment-prompt'

const AssessRequestSchema = z.object({
  topic: z.string().min(1).max(500),
  act: z.union([z.literal(1), z.literal(2)]),
})

const Act1PuzzlesSchema = z.object({
  puzzles: z.array(
    z.discriminatedUnion('type', [
      ConceptSortPuzzleSchema,
      ConfidenceProbePuzzleSchema,
    ]),
  ).min(1).max(2),
})

const Act2PuzzlesSchema = z.object({
  puzzles: z.array(
    z.discriminatedUnion('type', [
      AssessmentMultipleChoiceSchema,
      AssessmentFillInBlankSchema,
      AssessmentOrderingSchema,
      AssessmentCodeBlockSchema,
    ]),
  ).min(1).max(2),
})

const ACT1_TOOL_SCHEMA = z.toJSONSchema(Act1PuzzlesSchema) as {
  type: 'object'
  properties: Record<string, unknown>
  [key: string]: unknown
}

const ACT2_TOOL_SCHEMA = z.toJSONSchema(Act2PuzzlesSchema) as {
  type: 'object'
  properties: Record<string, unknown>
  [key: string]: unknown
}

const ACT1_FALLBACK_PUZZLES: AssessmentPuzzle[] = [
  {
    type: 'concept_sort' as const,
    id: 'fallback-sort',
    title: 'What do you already know?',
    concepts: [
      { id: 'c1', text: 'Core fundamentals' },
      { id: 'c2', text: 'Basic terminology' },
      { id: 'c3', text: 'Advanced applications' },
      { id: 'c4', text: 'Common patterns' },
      { id: 'c5', text: 'Best practices' },
    ],
    categories: ['Know it', 'Heard of it', 'New to me'],
  },
  {
    type: 'confidence_probe' as const,
    id: 'fallback-confidence',
    statement: 'I have a good understanding of the basics of this topic.',
    topicContext: 'General self-assessment',
  },
]

const ACT2_FALLBACK_PUZZLES: AssessmentPuzzle[] = [
  {
    type: 'multiple_choice' as const,
    id: 'fallback-mc-1',
    title: 'Which of these best describes a foundational concept of this topic?',
    options: [
      { id: 'mc1-a', text: 'The most common approach', isCorrect: true },
      { id: 'mc1-b', text: 'A rarely used technique', isCorrect: false },
      { id: 'mc1-c', text: 'An outdated method', isCorrect: false },
    ],
    difficulty: 'easy' as const,
    hints: ['Think about what beginners learn first.'],
    explanation: 'Foundational concepts are the building blocks that most practitioners use regularly.',
    abstract: false,
  },
  {
    type: 'multiple_choice' as const,
    id: 'fallback-mc-2',
    title: 'What is the most likely consequence of misapplying a core concept?',
    options: [
      { id: 'mc2-a', text: 'No noticeable effect', isCorrect: false },
      { id: 'mc2-b', text: 'Subtle errors that compound over time', isCorrect: true },
      { id: 'mc2-c', text: 'Immediate and obvious failure', isCorrect: false },
      { id: 'mc2-d', text: 'Improved performance in some cases', isCorrect: false },
    ],
    difficulty: 'hard' as const,
    hints: [
      'Think about how small mistakes propagate.',
      'Consider the difference between immediate and delayed consequences.',
    ],
    explanation: 'Misapplied fundamentals often create subtle, compounding errors that are hard to diagnose later.',
    abstract: true,
  },
]

function getActConfig(act: 1 | 2) {
  if (act === 1) {
    return {
      prompt: ACT1_ASSESSMENT_PROMPT,
      toolName: 'generate_act1_puzzles',
      toolDescription: 'Generate exactly 2 Act 1 assessment puzzles to begin diagnosing a learner\'s existing knowledge.',
      toolSchema: ACT1_TOOL_SCHEMA,
      validationSchema: Act1PuzzlesSchema,
      fallback: ACT1_FALLBACK_PUZZLES,
      maxTokens: 4096,
    }
  }
  return {
    prompt: ACT2_ASSESSMENT_PROMPT,
    toolName: 'generate_act2_puzzles',
      toolDescription: 'Generate exactly 2 Act 2 interactive assessment puzzles at increasing difficulty.',
    toolSchema: ACT2_TOOL_SCHEMA,
    validationSchema: Act2PuzzlesSchema,
    fallback: ACT2_FALLBACK_PUZZLES,
    maxTokens: 4096,
  }
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

  const parsed = AssessRequestSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid request body', details: parsed.error.issues },
      { status: 400 },
    )
  }

  const { topic, act } = parsed.data
  const config = getActConfig(act)
  const client = getClaudeClient()

  if (!client) {
    return NextResponse.json({ puzzles: config.fallback })
  }

  try {
    const response = await client.messages.create({
      model: ADAPTATION_MODEL,
      max_tokens: config.maxTokens,
      system: config.prompt,
      tools: [
        {
          name: config.toolName,
          description: config.toolDescription,
          input_schema: config.toolSchema,
        },
      ],
      tool_choice: { type: 'tool' as const, name: config.toolName },
      messages: [
        {
          role: 'user',
          content: `Generate assessment puzzles for the topic: "${topic}"`,
        },
      ],
    })

    if (response.stop_reason === 'max_tokens') {
      console.error(`Act ${act} assessment generation hit max_tokens limit`)
      return NextResponse.json({ puzzles: config.fallback })
    }

    const toolBlock = response.content.find((b) => b.type === 'tool_use')
    if (!toolBlock || toolBlock.type !== 'tool_use') {
      console.error(`No tool_use block found in act ${act} assessment response`)
      return NextResponse.json({ puzzles: config.fallback })
    }

    const result = config.validationSchema.safeParse(toolBlock.input)
    if (!result.success) {
      console.error(`Act ${act} puzzle validation failed:`, result.error.issues)
      return NextResponse.json({ puzzles: config.fallback })
    }

    return NextResponse.json({ puzzles: result.data.puzzles })
  } catch (error) {
    console.error(`Act ${act} assessment generation failed:`, error)
    return NextResponse.json({ puzzles: config.fallback })
  }
}
