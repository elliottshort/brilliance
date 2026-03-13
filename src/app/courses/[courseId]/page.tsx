export default async function CoursePage({
  params,
}: {
  params: Promise<{ courseId: string }>
}) {
  const { courseId } = await params

  return (
    <div className="mx-auto flex min-h-[calc(100vh-3.5rem)] max-w-5xl flex-col items-center justify-center px-4 sm:px-6">
      <p className="text-sm font-medium text-muted-foreground">Course</p>
      <h1 className="mt-1 text-2xl font-semibold tracking-tight text-foreground">
        {courseId}
      </h1>
    </div>
  )
}
