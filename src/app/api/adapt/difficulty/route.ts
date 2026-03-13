import { NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { getClaudeClient, ADAPTATION_MODEL, ADAPTATION_MAX_TOKENS } from '@/lib/claude/client'
import { ScreenResultSchema } from '@/lib/schemas/progress'

const DifficultyRequestSchema = z.object({
  courseId: z.string(),
  lessonId: z.string(),
  recentResults: z.array(ScreenResultSchema).min(1),
})

type Recommendation = 'continue' | 'review' | 'skip'

interface DifficultyResponse {
  recommendation: Recommendation
  message: string
  targetLessonId?: string
  fallback?: boolean
}

const FALLBACK_RESPONSE: DifficultyResponse = {
  recommendation: 'continue',
  message: 'Keep going!',
  fallback: true,
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

  const parsed = DifficultyRequestSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid request body', details: parsed.error.issues },
      { status: 400 },
    )
  }

  const { courseId, lessonId, recentResults } = parsed.data
  const client = getClaudeClient()

  if (!client) {
    return NextResponse.json(FALLBACK_RESPONSE)
  }

  const totalScreens = recentResults.length
  const correctCount = recentResults.filter((r) => r.answeredCorrectly).length
  const avgAttempts =
    recentResults.reduce((sum, r) => sum + r.attempts, 0) / totalScreens
  const totalHints = recentResults.reduce((sum, r) => sum + r.hintsUsed, 0)
  const accuracy = Math.round((correctCount / totalScreens) * 100)

  try {
    const message = await client.messages.create({
      model: ADAPTATION_MODEL,
      max_tokens: ADAPTATION_MAX_TOKENS,
      system: `You are an adaptive learning system analyzing a learner's performance.
Based on their results, recommend ONE of these actions:
- "continue": They're doing well, proceed to the next lesson
- "review": They're struggling, suggest reviewing this lesson or a prerequisite
- "skip": They're finding it too easy, suggest skipping ahead

Respond in this exact JSON format (no markdown, no code fences):
{"recommendation": "continue" | "review" | "skip", "message": "A brief encouraging message explaining the recommendation"}`,
      messages: [
        {
          role: 'user',
          content: `Course: ${courseId}
Lesson: ${lessonId}
Results summary:
- ${totalScreens} screens attempted
- ${accuracy}% accuracy (${correctCount}/${totalScreens} correct)
- Average ${avgAttempts.toFixed(1)} attempts per screen
- ${totalHints} total hints used

Raw results: ${JSON.stringify(recentResults)}

Analyze their performance and recommend next steps.`,
        },
      ],
    })

    const textBlock = message.content.find((block) => block.type === 'text')
    if (!textBlock?.text) {
      return NextResponse.json(FALLBACK_RESPONSE)
    }

    try {
      const parsed = JSON.parse(textBlock.text) as {
        recommendation?: string
        message?: string
        targetLessonId?: string
      }
      const validRecommendations: Recommendation[] = ['continue', 'review', 'skip']
      const recommendation = validRecommendations.includes(
        parsed.recommendation as Recommendation,
      )
        ? (parsed.recommendation as Recommendation)
        : 'continue'

      const response: DifficultyResponse = {
        recommendation,
        message: parsed.message || 'Keep going!',
      }
      if (parsed.targetLessonId) {
        response.targetLessonId = parsed.targetLessonId
      }
      return NextResponse.json(response)
    } catch {
      return NextResponse.json(FALLBACK_RESPONSE)
    }
  } catch {
    return NextResponse.json(FALLBACK_RESPONSE)
  }
}
