import { z } from 'zod'
import { auth } from '@/lib/auth'
import { generateCourse } from '@/lib/claude/generate-course'
import type { GenerationEvent } from '@/lib/claude/generate-course'

const GenerateRequestSchema = z.object({
  topic: z.string().min(1).max(500),
  interviewSummary: z.string().min(1).max(5000),
})

function encodeSSE(event: GenerationEvent): string {
  return `data: ${JSON.stringify(event)}\n\n`
}

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const parsed = GenerateRequestSchema.safeParse(body)
  if (!parsed.success) {
    return new Response(
      JSON.stringify({ error: 'Invalid request body', details: parsed.error.issues }),
      { status: 400, headers: { 'Content-Type': 'application/json' } },
    )
  }

  const { topic, interviewSummary } = parsed.data
  const userId = session.user.id

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder()

      try {
        const generator = generateCourse({ topic, interviewSummary, userId })

        for await (const event of generator) {
          controller.enqueue(encoder.encode(encodeSSE(event)))

          if (event.type === 'complete' || event.type === 'error') {
            break
          }
        }
      } catch (err) {
        const errorEvent: GenerationEvent = {
          type: 'error',
          message: err instanceof Error ? err.message : 'Unexpected error',
        }
        controller.enqueue(encoder.encode(encodeSSE(errorEvent)))
      } finally {
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  })
}
