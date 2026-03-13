import { NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { getClaudeClient, ADAPTATION_MODEL, ADAPTATION_MAX_TOKENS } from '@/lib/claude/client'

const ExplainRequestSchema = z.object({
  courseId: z.string(),
  lessonId: z.string(),
  screenId: z.string(),
  userAnswer: z.string(),
  correctAnswer: z.string(),
  screenData: z.object({
    type: z.string(),
    title: z.string(),
    explanation: z.string().optional(),
  }),
})

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

  const parsed = ExplainRequestSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid request body', details: parsed.error.issues },
      { status: 400 },
    )
  }

  const { userAnswer, correctAnswer, screenData } = parsed.data
  const fallbackExplanation = screenData.explanation || 'Review the material and try again.'
  const client = getClaudeClient()

  if (!client) {
    return NextResponse.json({ explanation: fallbackExplanation, fallback: true })
  }

  try {
    const message = await client.messages.create({
      model: ADAPTATION_MODEL,
      max_tokens: ADAPTATION_MAX_TOKENS,
      system: `You are a patient, encouraging tutor explaining why a learner's answer was wrong.
Explain clearly:
1. Why their answer is incorrect
2. Why the correct answer is right
3. A memorable way to remember the concept

Keep it to 2-4 short paragraphs. Use simple language. Be encouraging.
Respond with ONLY the explanation text, no preamble.`,
      messages: [
        {
          role: 'user',
          content: `Screen type: ${screenData.type}
Question: ${screenData.title}
User's answer: ${userAnswer}
Correct answer: ${correctAnswer}
${screenData.explanation ? `Original explanation: ${screenData.explanation}` : ''}

Generate a personalized explanation addressing their specific misconception.`,
        },
      ],
    })

    const textBlock = message.content.find((block) => block.type === 'text')
    const explanation = textBlock?.text || fallbackExplanation

    return NextResponse.json({ explanation })
  } catch {
    return NextResponse.json({ explanation: fallbackExplanation, fallback: true })
  }
}
