import { promises as fs } from 'fs'
import path from 'path'
import { CourseSchema } from '@/lib/schemas/content'
import type { Course, Lesson } from '@/lib/schemas/content'
import { prisma } from '@/lib/db'

export type CourseMeta = {
  id: string
  title: string
  description: string
  moduleCount: number
  lessonCount: number
  isGenerated?: boolean
}

export type CourseProgressSummary = {
  completedLessons: number
  startedLessons: number
}

const COURSES_DIR = path.join(process.cwd(), 'src', 'content', 'courses')

export async function getCourses(): Promise<CourseMeta[]> {
  let entries: string[]
  try {
    entries = await fs.readdir(COURSES_DIR)
  } catch {
    return []
  }

  const metas: CourseMeta[] = []

  for (const entry of entries) {
    // Skip hidden files and non-directories
    if (entry.startsWith('.')) continue

    const courseJsonPath = path.join(COURSES_DIR, entry, 'course.json')
    try {
      const raw = await fs.readFile(courseJsonPath, 'utf-8')
      const json = JSON.parse(raw)
      const result = CourseSchema.safeParse(json)
      if (!result.success) continue

      const course = result.data
      const lessonCount = course.modules.reduce(
        (sum, mod) => sum + mod.lessons.length,
        0
      )

      metas.push({
        id: course.id,
        title: course.title,
        description: course.description,
        moduleCount: course.modules.length,
        lessonCount,
      })
    } catch {
      // Skip courses that can't be read or parsed
      continue
    }
  }

  try {
    const generated = await prisma.generatedCourse.findMany({
      select: {
        courseId: true,
        title: true,
        description: true,
        moduleCount: true,
        lessonCount: true,
      },
      orderBy: { createdAt: 'desc' },
    })

    for (const g of generated) {
      metas.push({
        id: g.courseId,
        title: g.title,
        description: g.description,
        moduleCount: g.moduleCount,
        lessonCount: g.lessonCount,
        isGenerated: true,
      })
    }
  } catch {
    // DB unavailable — return filesystem courses only
  }

  return metas
}

export async function getCourse(courseId: string): Promise<Course> {
  const courseJsonPath = path.join(COURSES_DIR, courseId, 'course.json')

  try {
    const raw = await fs.readFile(courseJsonPath, 'utf-8')
    const json = JSON.parse(raw)
    const result = CourseSchema.safeParse(json)
    if (result.success) return result.data
  } catch {
    // Not on filesystem — try database
  }

  const generated = await prisma.generatedCourse.findUnique({
    where: { courseId },
  })

  if (generated) {
    const result = CourseSchema.safeParse(generated.courseData)
    if (result.success) return result.data
    throw new Error(`Generated course "${courseId}" has invalid data in database`)
  }

  throw new Error(`Course not found: "${courseId}"`)
}

export async function getLearnerProfile(
  courseId: string,
): Promise<Record<string, unknown> | null> {
  try {
    const generated = await prisma.generatedCourse.findUnique({
      where: { courseId },
      select: { learnerProfile: true },
    })

    if (!generated?.learnerProfile) return null
    return generated.learnerProfile as Record<string, unknown>
  } catch {
    return null
  }
}

export async function getLesson(courseId: string, lessonId: string): Promise<Lesson> {
  const course = await getCourse(courseId)

  for (const mod of course.modules) {
    const lesson = mod.lessons.find((l) => l.id === lessonId)
    if (lesson) return lesson
  }

  throw new Error(`Lesson "${lessonId}" not found in course "${courseId}"`)
}

export type LastAccessedCourse = {
  courseId: string
  courseTitle: string
  lessonId: string
  lessonTitle: string
  completedScreens: number
  totalScreens: number
}

export async function getLastAccessedCourse(
  userId: string
): Promise<LastAccessedCourse | null> {
  try {
    const records = await prisma.courseProgress.findMany({
      where: { userId },
      orderBy: { lastAccessedAt: 'desc' },
      include: {
        lessons: {
          select: {
            lessonId: true,
            completedAt: true,
            screenResults: { select: { id: true } },
          },
        },
      },
    })

    for (const record of records) {
      let course: Course
      try {
        course = await getCourse(record.courseId)
      } catch {
        continue
      }

      const completedLessonIds = new Set(
        record.lessons
          .filter((l) => l.completedAt != null)
          .map((l) => l.lessonId)
      )

      const allLessons = course.modules.flatMap((m) => m.lessons)

      if (allLessons.every((l) => completedLessonIds.has(l.id))) {
        continue
      }

      const resumeLesson = allLessons.find(
        (l) => !completedLessonIds.has(l.id)
      )
      if (!resumeLesson) continue

      const completedScreens = record.lessons.reduce(
        (sum, l) => sum + l.screenResults.length,
        0
      )
      const totalScreens = allLessons.reduce(
        (sum, l) => sum + l.screens.length,
        0
      )

      return {
        courseId: course.id,
        courseTitle: course.title,
        lessonId: resumeLesson.id,
        lessonTitle: resumeLesson.title,
        completedScreens,
        totalScreens,
      }
    }

    return null
  } catch {
    return null
  }
}

export async function getProgressSummaries(
  userId: string
): Promise<Record<string, CourseProgressSummary>> {
  try {
    const records = await prisma.courseProgress.findMany({
      where: { userId },
      include: {
        lessons: {
          select: {
            lessonId: true,
            completedAt: true,
            screenResults: { select: { id: true } },
          },
        },
      },
    })

    const summaries: Record<string, CourseProgressSummary> = {}

    for (const record of records) {
      const completedLessons = record.lessons.filter(
        (l) => l.completedAt != null
      ).length
      const startedLessons = record.lessons.filter(
        (l) => l.screenResults.length > 0 || l.completedAt != null
      ).length

      if (startedLessons > 0) {
        summaries[record.courseId] = { completedLessons, startedLessons }
      }
    }

    return summaries
  } catch {
    return {}
  }
}
