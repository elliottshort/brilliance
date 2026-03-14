import { NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { getClaudeClient, INTERVIEW_MODEL, INTERVIEW_MAX_TOKENS } from '@/lib/claude/client'

const InterviewRequestSchema = z.object({
  topic: z.string().min(1).max(500),
  history: z
    .array(
      z.object({
        role: z.enum(['user', 'assistant']),
        content: z.string(),
      }),
    )
    .max(20)
    .default([]),
})

const INTERVIEW_SYSTEM_PROMPT = `You are a Thinking Method course designer preparing to author a personalized course on the Brilliance learning platform. Your goal is to understand the learner's mental theatre — what they already know, what they want to learn, what misconceptions they might have, and what existing knowledge you can build upon.

Conduct an adaptive interview:
- Start with 2-3 essential questions: confirm the topic, assess current knowledge level, and understand their learning goal.
- If the topic is complex or the learner's answers suggest nuance (they have partial knowledge, specific gaps, or domain expertise), ask deeper follow-up questions (up to 5-8 total exchanges).
- If the topic is simple and the learner is a clear beginner, you can wrap up after 2-3 exchanges.

When you have enough information to design a great course, end your message with this exact JSON on its own line:
{"ready": true, "summary": "<a concise paragraph capturing: the topic, what the learner knows, what they want to learn, their background, and any specific interests or gaps>"}

Guidelines:
- Keep responses conversational, warm, and brief (2-4 sentences + a question).
- You are interviewing, not lecturing. Ask open-ended questions.
- Probe for existing knowledge that can be imported (built upon) in the course.
- Identify potential misconceptions gently.
- Do NOT include the ready JSON until you genuinely have enough context.
- Do NOT ask more than one question per message.`

const FALLBACK_MESSAGE =
  "I'd love to help you learn! Could you tell me a bit about what you already know about this topic?"

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

  const parsed = InterviewRequestSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid request body', details: parsed.error.issues },
      { status: 400 },
    )
  }

  const { topic, history } = parsed.data
  const client = getClaudeClient()

  if (!client) {
    return NextResponse.json({
      message: FALLBACK_MESSAGE,
      ready: false,
      fallback: true,
    })
  }

  const priorMessages: Array<{ role: 'user' | 'assistant'; content: string }> =
    history.map((m) => ({ role: m.role, content: m.content }))

  const isFirstExchange = priorMessages.length === 0
  const userMessage = isFirstExchange
    ? `I want to learn about: ${topic}`
    : priorMessages[priorMessages.length - 1].content

  const messages: Array<{ role: 'user' | 'assistant'; content: string }> =
    isFirstExchange
      ? [{ role: 'user' as const, content: userMessage }]
      : priorMessages

  try {
    const response = await client.messages.create({
      model: INTERVIEW_MODEL,
      max_tokens: INTERVIEW_MAX_TOKENS,
      system: INTERVIEW_SYSTEM_PROMPT,
      messages,
    })

    const textBlock = response.content.find((block) => block.type === 'text')
    const rawText = textBlock?.text || FALLBACK_MESSAGE

    const readyMatch = rawText.match(/\{"ready":\s*true,\s*"summary":\s*"((?:[^"\\]|\\.)*)"\}/)
    if (readyMatch) {
      const messageWithoutJson = rawText.replace(readyMatch[0], '').trim()
      return NextResponse.json({
        message: messageWithoutJson || 'I have everything I need to create your course!',
        ready: true,
        summary: readyMatch[1].replace(/\\"/g, '"').replace(/\\n/g, '\n'),
      })
    }

    return NextResponse.json({
      message: rawText,
      ready: false,
    })
  } catch {
    return NextResponse.json({
      message: FALLBACK_MESSAGE,
      ready: false,
      fallback: true,
    })
  }
}
