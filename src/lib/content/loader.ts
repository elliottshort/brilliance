import { promises as fs } from 'fs'
import path from 'path'
import { CourseSchema } from '@/lib/schemas/content'
import type { Course, Lesson } from '@/lib/schemas/content'

export type CourseMeta = {
  id: string
  title: string
  description: string
  moduleCount: number
  lessonCount: number
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

  return metas
}

export async function getCourse(courseId: string): Promise<Course> {
  const courseJsonPath = path.join(COURSES_DIR, courseId, 'course.json')

  let raw: string
  try {
    raw = await fs.readFile(courseJsonPath, 'utf-8')
  } catch {
    throw new Error(`Course not found: "${courseId}". No course.json at ${courseJsonPath}`)
  }

  let json: unknown
  try {
    json = JSON.parse(raw)
  } catch (err) {
    throw new Error(`Invalid JSON in course "${courseId}": ${err instanceof Error ? err.message : String(err)}`)
  }

  const result = CourseSchema.safeParse(json)
  if (!result.success) {
    const issues = result.error.issues
      .map((i) => `  - ${i.path.join('.')}: ${i.message}`)
      .join('\n')
    throw new Error(`Course "${courseId}" failed schema validation:\n${issues}`)
  }

  return result.data
}

export async function getLesson(courseId: string, lessonId: string): Promise<Lesson> {
  const course = await getCourse(courseId)

  for (const mod of course.modules) {
    const lesson = mod.lessons.find((l) => l.id === lessonId)
    if (lesson) return lesson
  }

  throw new Error(`Lesson "${lessonId}" not found in course "${courseId}"`)
}
