import { NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { getClaudeClient, GENERATION_MODEL } from '@/lib/claude/client'
import { AssessmentPuzzleSchema } from '@/lib/schemas/assessment'
import type { AssessmentPuzzle } from '@/lib/schemas/assessment'
import { ASSESSMENT_SYSTEM_PROMPT } from '@/lib/claude/prompts/assessment-prompt'

const AssessRequestSchema = z.object({
  topic: z.string().min(1).max(500),
})

const AssessmentPuzzlesSchema = z.object({
  puzzles: z.array(AssessmentPuzzleSchema).min(1).max(10),
})

const ASSESSMENT_TOOL_SCHEMA = z.toJSONSchema(AssessmentPuzzlesSchema) as {
  type: 'object'
  properties: Record<string, unknown>
  [key: string]: unknown
}

const FALLBACK_PUZZLES: AssessmentPuzzle[] = [
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
  {
    type: 'what_happens_next' as const,
    id: 'fallback-scenario',
    scenario:
      'Imagine you need to explain this topic to a friend who has never heard of it. Where would you start?',
    options: [
      { id: 'opt-a', text: 'Start with the formal definition' },
      { id: 'opt-b', text: 'Give a real-world example first' },
      { id: 'opt-c', text: 'Ask what they already know' },
      { id: 'opt-d', text: 'Show them a diagram' },
    ],
    correctId: 'opt-c',
    explanation:
      'Starting by understanding what someone already knows helps you build on their existing mental models.',
  },
]

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

  const { topic } = parsed.data
  const client = getClaudeClient()

  if (!client) {
    return NextResponse.json({ puzzles: FALLBACK_PUZZLES })
  }

  try {
    const response = await client.messages.create({
      model: GENERATION_MODEL,
      max_tokens: 8192,
      system: ASSESSMENT_SYSTEM_PROMPT,
      tools: [
        {
          name: 'generate_assessment_puzzles',
          description:
            'Generate exactly 7 assessment puzzles to diagnose a learner\'s existing knowledge of a topic before they take a course.',
          input_schema: ASSESSMENT_TOOL_SCHEMA,
        },
      ],
      tool_choice: { type: 'tool' as const, name: 'generate_assessment_puzzles' },
      messages: [
        {
          role: 'user',
          content: `Generate 7 assessment puzzles for the topic: "${topic}"`,
        },
      ],
    })

    if (response.stop_reason === 'max_tokens') {
      console.error('Assessment generation hit max_tokens limit')
      return NextResponse.json({ puzzles: FALLBACK_PUZZLES })
    }

    const toolBlock = response.content.find((b) => b.type === 'tool_use')
    if (!toolBlock || toolBlock.type !== 'tool_use') {
      console.error('No tool_use block found in assessment response')
      return NextResponse.json({ puzzles: FALLBACK_PUZZLES })
    }

    const result = AssessmentPuzzlesSchema.safeParse(toolBlock.input)
    if (!result.success) {
      console.error('Assessment puzzle validation failed:', result.error.issues)
      return NextResponse.json({ puzzles: FALLBACK_PUZZLES })
    }

    return NextResponse.json({ puzzles: result.data.puzzles })
  } catch (error) {
    console.error('Assessment generation failed:', error)
    return NextResponse.json({ puzzles: FALLBACK_PUZZLES })
  }
}
