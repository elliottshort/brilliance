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

export async function getLesson(courseId: string, lessonId: string): Promise<Lesson> {
  const course = await getCourse(courseId)

  for (const mod of course.modules) {
    const lesson = mod.lessons.find((l) => l.id === lessonId)
    if (lesson) return lesson
  }

  throw new Error(`Lesson "${lessonId}" not found in course "${courseId}"`)
}
