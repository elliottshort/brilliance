import { CourseSchema } from '../../lib/schemas/content'
import type { Course } from '../../lib/schemas/content'
import { validateCourse, sanitizeCourse } from '../../lib/validation/content-validator'
import { prisma } from '../../lib/db'
import type { ValidationResult } from '../types'

export async function sanitizeCourseActivity(input: {
  course: Course
}): Promise<Course> {
  return sanitizeCourse(input.course)
}

export async function validateCourseActivity(input: {
  course: Course
}): Promise<ValidationResult> {
  const schemaResult = CourseSchema.safeParse(input.course)
  if (!schemaResult.success) {
    const issues = schemaResult.error.issues
      .slice(0, 5)
      .map((i) => `${i.path.join('.')}: ${i.message}`)
    return { valid: false, errors: [`Schema validation failed: ${issues.join('; ')}`] }
  }

  const contentResult = validateCourse(input.course)
  if (!contentResult.valid) {
    return { valid: false, errors: contentResult.errors }
  }

  return { valid: true, errors: [] }
}

export async function saveCourseActivity(input: {
  courseId: string
  userId: string
  course: Course
  topic: string
}): Promise<{ courseId: string }> {
  const lessonCount = input.course.modules.reduce(
    (sum, mod) => sum + mod.lessons.length,
    0,
  )

  await prisma.generatedCourse.create({
    data: {
      courseId: input.course.id,
      userId: input.userId,
      title: input.course.title,
      description: input.course.description,
      courseData: JSON.parse(JSON.stringify(input.course)),
      moduleCount: input.course.modules.length,
      lessonCount,
      topic: input.topic,
    },
  })

  return { courseId: input.courseId }
}

export async function updateCourseActivity(input: {
  courseId: string
  course: Course
}): Promise<void> {
  await prisma.generatedCourse.update({
    where: { courseId: input.courseId },
    data: {
      courseData: JSON.parse(JSON.stringify(input.course)),
    },
  })
}
