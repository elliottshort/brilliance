import Link from 'next/link'
import { ArrowRight, BookOpen, PlayCircle, Sparkles, Wand2 } from 'lucide-react'
import { getCourses, getLastAccessedCourse, getProgressSummaries } from '@/lib/content/loader'
import { auth } from '@/lib/auth'
import { CourseCatalog } from '@/components/course/course-catalog'
import { CreateCourseWizard } from '@/components/course/create-course-wizard'

export default async function HomePage() {
  const [courses, session] = await Promise.all([getCourses(), auth()])
  const userId = session?.user?.id
  const [progress, lastAccessed] = userId
    ? await Promise.all([
        getProgressSummaries(userId),
        getLastAccessedCourse(userId),
      ])
    : [{}, null]

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6">
      <section className="py-20 sm:py-28">
        <div className="flex flex-col items-center text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-[var(--glass-border)] bg-[var(--glass-bg-subtle)] px-4 py-1.5 text-xs font-medium text-muted-foreground mb-8">
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

      <section className="pb-8">
        <CreateCourseWizard>
            <div className="group cursor-pointer rounded-xl border border-[var(--glass-border)] bg-gradient-to-br from-primary/[0.04] to-transparent p-6 transition-all duration-300 hover:border-[var(--glass-border-strong)] hover:shadow-[var(--glass-shadow-outer)]">
            <div className="flex items-center gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-primary/10 transition-colors group-hover:bg-primary/15">
                <Wand2 className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="text-base font-semibold tracking-tight text-foreground group-hover:text-primary transition-colors">
                  Create Your Own Course
                </h3>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  Tell us what you want to learn, and AI will craft a personalized course for you.
                </p>
              </div>
            </div>
          </div>
        </CreateCourseWizard>
      </section>

      {lastAccessed && (
        <section className="pb-8">
          <Link
            href={`/courses/${lastAccessed.courseId}/lessons/${lastAccessed.lessonId}`}
            className="group block rounded-xl border border-[var(--glass-border)] bg-card p-6 transition-all duration-300 hover:border-[var(--glass-border-strong)] hover:shadow-[var(--glass-shadow-outer)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            <div className="flex items-center gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-primary/10 transition-colors group-hover:bg-primary/15">
                <PlayCircle className="h-5 w-5 text-primary" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-base font-semibold tracking-tight text-foreground group-hover:text-primary transition-colors">
                  Continue Learning
                </h3>
                <p className="mt-0.5 text-sm text-muted-foreground truncate">
                  {lastAccessed.courseTitle} &middot; {lastAccessed.lessonTitle}
                </p>
              </div>
              <div className="hidden sm:flex items-center gap-3">
                <div className="text-right">
                  <span className="text-sm tabular-nums font-medium text-foreground">
                    {lastAccessed.totalScreens > 0
                      ? Math.round(
                          (lastAccessed.completedScreens /
                            lastAccessed.totalScreens) *
                            100
                        )
                      : 0}
                    %
                  </span>
                  <div className="mt-1 h-1.5 w-24 overflow-hidden rounded-full bg-[var(--glass-bg-subtle)]">
                    <div
                      className="h-full rounded-full bg-primary transition-all duration-500"
                      style={{
                        width: `${
                          lastAccessed.totalScreens > 0
                            ? Math.round(
                                (lastAccessed.completedScreens /
                                  lastAccessed.totalScreens) *
                                  100
                              )
                            : 0
                        }%`,
                      }}
                    />
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground/50 transition-all duration-200 group-hover:text-primary group-hover:translate-x-0.5" />
              </div>
            </div>
          </Link>
        </section>
      )}

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

            <CourseCatalog courses={courses} progress={progress} />
          </>
        ) : (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[var(--glass-border)] bg-[var(--glass-bg-subtle)] py-20">
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
