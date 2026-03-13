import { NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { getClaudeClient, ADAPTATION_MODEL, ADAPTATION_MAX_TOKENS } from '@/lib/claude/client'

const HintRequestSchema = z.object({
  courseId: z.string(),
  lessonId: z.string(),
  screenId: z.string(),
  userAnswer: z.string(),
  screenData: z.object({
    type: z.string(),
    title: z.string(),
    explanation: z.string().optional(),
    hints: z.array(z.string()).optional(),
  }),
})

const FALLBACK_HINT = 'Try re-reading the question carefully.'

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

  const parsed = HintRequestSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid request body', details: parsed.error.issues },
      { status: 400 },
    )
  }

  const { userAnswer, screenData } = parsed.data
  const client = getClaudeClient()

  if (!client) {
    return NextResponse.json({ hint: FALLBACK_HINT, fallback: true })
  }

  try {
    const message = await client.messages.create({
      model: ADAPTATION_MODEL,
      max_tokens: ADAPTATION_MAX_TOKENS,
      system: `You are a patient, encouraging tutor helping a learner who got a question wrong.
Generate a single helpful hint that guides them toward the correct answer WITHOUT giving it away.
Keep the hint to 1-2 sentences. Be specific to what they got wrong.
Respond with ONLY the hint text, no preamble.`,
      messages: [
        {
          role: 'user',
          content: `Screen type: ${screenData.type}
Question: ${screenData.title}
${screenData.hints ? `Existing hints: ${screenData.hints.join(' | ')}` : ''}
User's incorrect answer: ${userAnswer}

Generate a personalized hint based on their specific wrong answer.`,
        },
      ],
    })

    const textBlock = message.content.find((block) => block.type === 'text')
    const hint = textBlock?.text || FALLBACK_HINT

    return NextResponse.json({ hint })
  } catch {
    return NextResponse.json({ hint: FALLBACK_HINT, fallback: true })
  }
}
