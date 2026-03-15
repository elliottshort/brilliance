import { getCourse, getLesson, getLearnerProfile } from '@/lib/content/loader'
import { LessonPlayer } from '@/components/lesson/lesson-player'

export default async function LessonPage({
  params,
}: {
  params: Promise<{ courseId: string; lessonId: string }>
}) {
  const { courseId, lessonId } = await params

  try {
    const [course, lesson, learnerProfile] = await Promise.all([
      getCourse(courseId),
      getLesson(courseId, lessonId),
      getLearnerProfile(courseId),
    ])

    let nextLesson: { id: string; title: string } | null = null
    const allLessons = course.modules.flatMap((m) => m.lessons)
    const currentIdx = allLessons.findIndex((l) => l.id === lessonId)
    if (currentIdx !== -1 && currentIdx < allLessons.length - 1) {
      const next = allLessons[currentIdx + 1]
      nextLesson = { id: next.id, title: next.title }
    }

    return (
      <div className="min-h-[calc(100vh-3.5rem)]">
        <div className="border-b border-[var(--glass-border)] bg-[var(--glass-bg-subtle)] px-4 py-3 sm:px-6">
          <div className="mx-auto max-w-3xl">
            <p className="text-xs font-medium text-muted-foreground">
              {course.title}
            </p>
            <h1 className="mt-0.5 text-sm font-semibold tracking-tight text-foreground">
              {lesson.title}
            </h1>
          </div>
        </div>

        <LessonPlayer lesson={lesson} courseId={courseId} nextLesson={nextLesson} learnerProfile={learnerProfile} />
      </div>
    )
  } catch {
    return (
      <div className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center px-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Lesson not found
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            The lesson you&apos;re looking for doesn&apos;t exist or couldn&apos;t be loaded.
          </p>
        </div>
      </div>
    )
  }
}
