import { z } from 'zod'
import { auth } from '@/lib/auth'
import { buildCourseId } from '@/lib/claude/generate-course'
import { getTemporalClient } from '@/temporal/client'
import { TASK_QUEUE } from '@/temporal/connection'
import type { courseGenerationWorkflow } from '@/temporal/workflows/course-generation'
import { prisma } from '@/lib/db'
import { WorkflowExecutionAlreadyStartedError } from '@temporalio/client'

const MAX_GENERATIONS_PER_HOUR = 5

const GenerateRequestSchema = z.object({
  topic: z.string().min(1).max(500),
  interviewSummary: z.string().min(1).max(5000),
  learnerProfile: z.record(z.string(), z.unknown()).optional(),
})

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = GenerateRequestSchema.safeParse(body)
  if (!parsed.success) {
    return Response.json(
      { error: 'Invalid request body', details: parsed.error.issues },
      { status: 400 },
    )
  }

  const { topic, interviewSummary, learnerProfile } = parsed.data
  const userId = session.user.id

  const hourAgo = new Date(Date.now() - 60 * 60 * 1000)
  const recentCount = await prisma.generatedCourse.count({
    where: { userId, createdAt: { gte: hourAgo } },
  })

  if (recentCount >= MAX_GENERATIONS_PER_HOUR) {
    return Response.json(
      { error: 'Rate limit exceeded. You can generate up to 5 courses per hour. Please try again later.' },
      { status: 429 },
    )
  }

  const courseId = buildCourseId(topic, userId)
  const workflowId = `course-gen-${courseId}`

  try {
    const client = await getTemporalClient()

    await client.start<typeof courseGenerationWorkflow>('courseGenerationWorkflow', {
      workflowId,
      taskQueue: TASK_QUEUE,
      args: [{ courseId, topic, interviewSummary, userId, learnerProfile }],
    })

    return Response.json({ workflowId, courseId })
  } catch (err) {
    if (err instanceof WorkflowExecutionAlreadyStartedError) {
      return Response.json({ workflowId, courseId })
    }

    const message = err instanceof Error ? err.message : 'Failed to start course generation'
    return Response.json({ error: message }, { status: 500 })
  }
}
