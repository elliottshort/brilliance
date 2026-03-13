import { BookOpen, Sparkles } from 'lucide-react'
import { getCourses } from '@/lib/content/loader'
import { CourseCatalog } from '@/components/course/course-catalog'

export default async function HomePage() {
  const courses = await getCourses()

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6">
      <section className="relative py-20 sm:py-28">
        <div className="absolute inset-0 -z-10 overflow-hidden">
          <div className="absolute -top-32 left-1/2 -translate-x-1/2 h-64 w-[40rem] rounded-full bg-primary/[0.07] blur-3xl" />
        </div>

        <div className="flex flex-col items-center text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-muted/50 px-4 py-1.5 text-xs font-medium text-muted-foreground mb-8">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            Interactive learning, reimagined
          </div>

          <h1 className="text-5xl sm:text-6xl font-bold tracking-tight bg-gradient-to-b from-foreground to-foreground/60 bg-clip-text text-transparent">
            Brilliance
          </h1>

          <p className="mt-5 max-w-lg text-lg text-muted-foreground leading-relaxed">
            Master concepts through interactive lessons crafted by AI.
            A focused learning experience that adapts to the way you think.
          </p>
        </div>
      </section>

      <section className="pb-20">
        {courses.length > 0 ? (
          <>
            <div className="mb-8">
              <h2 className="text-xl font-semibold tracking-tight text-foreground">
                Your Learning Journey
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Pick a course and start building real understanding.
              </p>
            </div>

            <CourseCatalog courses={courses} />
          </>
        ) : (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border/60 bg-muted/20 py-20">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted/60">
              <BookOpen className="h-6 w-6 text-muted-foreground/70" />
            </div>
            <p className="mt-5 text-base font-medium text-foreground/80">
              No courses available yet
            </p>
            <p className="mt-1.5 text-sm text-muted-foreground">
              Check back soon for interactive learning experiences.
            </p>
          </div>
        )}
      </section>
    </div>
  )
}
