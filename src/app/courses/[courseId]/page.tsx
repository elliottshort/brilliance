import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { getCourse } from '@/lib/content/loader'
import { CourseOverviewClient } from '@/components/course/course-overview-client'

type PageParams = { params: Promise<{ courseId: string }> }

export async function generateMetadata({ params }: PageParams): Promise<Metadata> {
  const { courseId } = await params

  try {
    const course = await getCourse(courseId)
    return {
      title: `${course.title} — Brilliance`,
      description: course.description,
    }
  } catch {
    return {
      title: 'Course not found — Brilliance',
    }
  }
}

export default async function CoursePage({ params }: PageParams) {
  const { courseId } = await params

  let course
  try {
    course = await getCourse(courseId)
  } catch {
    return (
      <div className="mx-auto flex min-h-[calc(100vh-3.5rem)] max-w-3xl flex-col items-center justify-center px-4 sm:px-6">
        <p className="text-6xl font-bold text-muted-foreground/20">404</p>
        <h1 className="mt-4 text-xl font-semibold tracking-tight text-foreground">
          Course not found
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          The course you&apos;re looking for doesn&apos;t exist or couldn&apos;t be loaded.
        </p>
        <Link
          href="/"
          className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to home
        </Link>
      </div>
    )
  }

  return (
    <>
      <div className="mx-auto max-w-3xl px-4 pt-6 sm:px-6">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          All courses
        </Link>
      </div>
      <CourseOverviewClient course={course} />
    </>
  )
}
