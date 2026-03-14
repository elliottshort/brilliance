import { auth } from '@/lib/auth'
import { getTemporalClient } from '@/temporal/client'
import { PROGRESS_QUERY } from '@/temporal/types'
import type { CourseGenerationProgress } from '@/temporal/types'
import { prisma } from '@/lib/db'
import { WorkflowNotFoundError } from '@temporalio/client'

export async function GET(request: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const workflowId = searchParams.get('workflowId')

  if (!workflowId) {
    return Response.json({ error: 'Missing workflowId parameter' }, { status: 400 })
  }

  try {
    const client = await getTemporalClient()
    const handle = client.getHandle(workflowId)

    const progress: CourseGenerationProgress = await handle.query(PROGRESS_QUERY)

    return Response.json(progress, {
      headers: { 'Cache-Control': 'no-store' },
    })
  } catch (err) {
    if (err instanceof WorkflowNotFoundError) {
      const courseId = workflowId.replace('course-gen-', '')
      const existing = await prisma.generatedCourse.findUnique({
        where: { courseId },
        select: { courseId: true, title: true },
      })

      if (existing) {
        const completedProgress: CourseGenerationProgress = {
          phase: 'complete',
          percent: 100,
          preview: null,
          courseId: existing.courseId,
          error: null,
          completedLessons: 0,
          totalLessons: 0,
        }
        return Response.json(completedProgress, {
          headers: { 'Cache-Control': 'no-store' },
        })
      }

      return Response.json(
        { error: 'Workflow not found' },
        { status: 404, headers: { 'Cache-Control': 'no-store' } },
      )
    }

    if (err instanceof Error && err.message.includes('ServiceError')) {
      const retryableProgress: CourseGenerationProgress = {
        phase: 'pending',
        percent: 0,
        preview: null,
        courseId: null,
        error: 'Checking status...',
        completedLessons: 0,
        totalLessons: 0,
      }
      return Response.json(retryableProgress, {
        status: 503,
        headers: { 'Cache-Control': 'no-store' },
      })
    }

    return Response.json(
      { error: 'Failed to check generation status' },
      { status: 500, headers: { 'Cache-Control': 'no-store' } },
    )
  }
}
