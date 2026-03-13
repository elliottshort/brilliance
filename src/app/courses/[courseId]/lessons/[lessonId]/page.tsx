export default async function LessonPage({
  params,
}: {
  params: Promise<{ courseId: string; lessonId: string }>
}) {
  const { courseId, lessonId } = await params

  return (
    <div className="mx-auto flex min-h-[calc(100vh-3.5rem)] max-w-3xl flex-col items-center justify-center px-4 sm:px-6">
      <p className="text-sm font-medium text-muted-foreground">
        {courseId} / Lesson
      </p>
      <h1 className="mt-1 text-2xl font-semibold tracking-tight text-foreground">
        {lessonId}
      </h1>
    </div>
  )
}
