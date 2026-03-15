import { NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { getClaudeClient, ADAPTATION_MODEL } from '@/lib/claude/client'

const AskRequestSchema = z.object({
  courseId: z.string().min(1),
  lessonId: z.string().min(1),
  screenId: z.string().min(1),
  question: z.string().min(1).max(2000),
  screenData: z.object({
    type: z.string(),
    title: z.string(),
    content: z.string().optional(),
    explanation: z.string().optional(),
  }),
  history: z
    .array(
      z.object({
        role: z.enum(['user', 'assistant']),
        content: z.string(),
      }),
    )
    .max(10)
    .optional(),
  learnerProfile: z.record(z.string(), z.unknown()).nullish(),
  screenAttempts: z
    .object({
      attempts: z.number(),
      hintsUsed: z.number(),
    })
    .optional(),
})

const FALLBACK_ANSWER =
  'I can\'t answer right now. Try reviewing the lesson content or using the hints.'

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

  const parsed = AskRequestSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid request body', details: parsed.error.issues },
      { status: 400 },
    )
  }

  const { question, screenData, history, learnerProfile, screenAttempts } = parsed.data
  const client = getClaudeClient()

  if (!client) {
    return NextResponse.json({ answer: FALLBACK_ANSWER, fallback: true })
  }

  const screenContext = [
    `Screen type: ${screenData.type}`,
    `Topic: ${screenData.title}`,
    screenData.content && `Content:\n${screenData.content}`,
    screenData.explanation && `Explanation:\n${screenData.explanation}`,
  ]
    .filter(Boolean)
    .join('\n\n')

  let profileSection = ''
  if (learnerProfile) {
    const d = learnerProfile as Record<string, unknown>
    const dims = (d.dimensions ?? d) as Record<string, number>
    if (dims.priorKnowledge != null) {
      profileSection = `

This learner has the following profile:
- Prior Knowledge: ${dims.priorKnowledge}/1
- Pattern Recognition: ${dims.patternRecognition}/1
- Abstraction Comfort: ${dims.abstractionComfort}/1
- Reasoning Style: ${dims.reasoningStyle}/1 (lower = procedural, higher = intuitive)
- Cognitive Stamina: ${dims.cognitiveStamina}/1
- Self Awareness: ${dims.selfAwareness}/1

Adapt your explanations accordingly. If priorKnowledge is low, use foundational explanations. If abstractionComfort is low, prefer concrete examples. If reasoningStyle is low (procedural), give step-by-step instructions.`
    }
  }

  let attemptsSection = ''
  if (screenAttempts) {
    attemptsSection = `\nThe student has attempted this question ${screenAttempts.attempts} time${screenAttempts.attempts !== 1 ? 's' : ''}. They have used ${screenAttempts.hintsUsed} hint${screenAttempts.hintsUsed !== 1 ? 's' : ''}.`
  }

  const priorMessages: Array<{ role: 'user' | 'assistant'; content: string }> =
    (history ?? []).map((m) => ({ role: m.role, content: m.content }))

  try {
    const message = await client.messages.create({
      model: ADAPTATION_MODEL,
      max_tokens: 1024,
      system: `You are a helpful, encouraging tutor embedded in an interactive learning platform.
The learner is on a specific lesson screen and has a question about the material.

Screen context:
${screenContext}${profileSection}${attemptsSection}

Guidelines:
- Answer based on the screen content provided above
- Be concise — 1-3 short paragraphs max
- Use simple, clear language
- If the screen is a question/exercise, guide them toward understanding without giving away the answer directly
- Use markdown formatting when helpful (bold, code, lists)
- Stay on topic — if the question is unrelated to the lesson, gently redirect`,
      messages: [
        ...priorMessages,
        { role: 'user', content: question },
      ],
    })

    const textBlock = message.content.find((block) => block.type === 'text')
    const answer = textBlock?.text || FALLBACK_ANSWER

    return NextResponse.json({ answer })
  } catch {
    return NextResponse.json({ answer: FALLBACK_ANSWER, fallback: true })
  }
}
