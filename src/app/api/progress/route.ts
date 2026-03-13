import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { auth } from '@/lib/auth'
import { ProgressGetQuerySchema, ProgressPutBodySchema } from '@/lib/schemas/progress'
import type { Prisma } from '@prisma/client'

type ScreenResultResponse = {
  screenId: string
  answeredCorrectly: boolean
  attempts: number
  hintsUsed: number
  answeredAt: string
}

type LessonProgressResponse = {
  lessonId: string
  currentScreenIndex: number
  startedAt: string
  completedAt?: string
  screenResults: Record<string, ScreenResultResponse>
}

type CourseProgressResponse = {
  courseId: string
  lastAccessedAt: string
  lessonProgress: Record<string, LessonProgressResponse>
}

type CourseProgressWithRelations = Prisma.CourseProgressGetPayload<{
  include: { lessons: { include: { screenResults: true } } }
}>

const progressInclude = {
  lessons: {
    include: {
      screenResults: true,
    },
  },
} satisfies Prisma.CourseProgressInclude

function toNestedProgress(
  dbRecord: CourseProgressWithRelations,
): CourseProgressResponse {
  const lessonProgress: Record<string, LessonProgressResponse> = {}

  for (const lp of dbRecord.lessons) {
    const screenResults: Record<string, ScreenResultResponse> = {}

    for (const sr of lp.screenResults) {
      screenResults[sr.screenId] = {
        screenId: sr.screenId,
        answeredCorrectly: sr.answeredCorrectly,
        attempts: sr.attempts,
        hintsUsed: sr.hintsUsed,
        answeredAt: sr.answeredAt.toISOString(),
      }
    }

    lessonProgress[lp.lessonId] = {
      lessonId: lp.lessonId,
      currentScreenIndex: lp.currentScreenIndex,
      startedAt: lp.startedAt.toISOString(),
      completedAt: lp.completedAt?.toISOString(),
      screenResults,
    }
  }

  return {
    courseId: dbRecord.courseId,
    lastAccessedAt: dbRecord.lastAccessedAt.toISOString(),
    lessonProgress,
  }
}

function makeInitialProgress(courseId: string): CourseProgressResponse {
  return {
    courseId,
    lessonProgress: {},
    lastAccessedAt: new Date().toISOString(),
  }
}

export async function GET(request: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const userId = session.user.id

  const searchParams = new URL(request.url).searchParams

  const parsed = ProgressGetQuerySchema.safeParse({
    courseId: searchParams.get('courseId'),
  })
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid query parameters', details: parsed.error.issues },
      { status: 400 },
    )
  }

  const { courseId } = parsed.data

  try {
    const record = await prisma.courseProgress.findUnique({
      where: { userId_courseId: { userId, courseId } },
      include: progressInclude,
    })

    if (!record) {
      return NextResponse.json(makeInitialProgress(courseId))
    }

    return NextResponse.json(toNestedProgress(record))
  } catch (error) {
    console.error('[GET /api/progress] Database error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    )
  }
}

export async function PUT(request: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const userId = session.user.id

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = ProgressPutBodySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid request body', details: parsed.error.issues },
      { status: 400 },
    )
  }

  const { courseId, lessonId, action } = parsed.data

  try {
    const updated = await prisma.$transaction(async (tx) => {
      const courseProgress = await tx.courseProgress.upsert({
        where: { userId_courseId: { userId, courseId } },
        create: { userId, courseId, lastAccessedAt: new Date() },
        update: { lastAccessedAt: new Date() },
      })

      switch (action.type) {
        case 'screen_complete': {
          const lessonProgress = await tx.lessonProgress.upsert({
            where: {
              courseProgressId_lessonId: {
                courseProgressId: courseProgress.id,
                lessonId,
              },
            },
            create: {
              courseProgressId: courseProgress.id,
              lessonId,
              currentScreenIndex: 0,
              startedAt: new Date(),
            },
            update: {},
          })

          await tx.screenResult.upsert({
            where: {
              lessonProgressId_screenId: {
                lessonProgressId: lessonProgress.id,
                screenId: action.screenId,
              },
            },
            create: {
              lessonProgressId: lessonProgress.id,
              screenId: action.screenId,
              answeredCorrectly: action.answeredCorrectly,
              attempts: action.attempts,
              hintsUsed: action.hintsUsed,
              answeredAt: new Date(),
            },
            update: {
              answeredCorrectly: action.answeredCorrectly,
              attempts: action.attempts,
              hintsUsed: action.hintsUsed,
              answeredAt: new Date(),
            },
          })
          break
        }

        case 'update_index': {
          await tx.lessonProgress.upsert({
            where: {
              courseProgressId_lessonId: {
                courseProgressId: courseProgress.id,
                lessonId,
              },
            },
            create: {
              courseProgressId: courseProgress.id,
              lessonId,
              currentScreenIndex: action.currentScreenIndex,
              startedAt: new Date(),
            },
            update: {
              currentScreenIndex: action.currentScreenIndex,
            },
          })
          break
        }

        case 'lesson_complete': {
          const existing = await tx.lessonProgress.findUnique({
            where: {
              courseProgressId_lessonId: {
                courseProgressId: courseProgress.id,
                lessonId,
              },
            },
          })

          if (existing) {
            await tx.lessonProgress.update({
              where: { id: existing.id },
              data: { completedAt: new Date() },
            })
          }
          break
        }
      }

      return tx.courseProgress.findUniqueOrThrow({
        where: { id: courseProgress.id },
        include: progressInclude,
      })
    })

    return NextResponse.json(toNestedProgress(updated))
  } catch (error) {
    console.error('[PUT /api/progress] Database error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    )
  }
}
