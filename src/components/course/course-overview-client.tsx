'use client'

import { motion, useReducedMotion } from 'framer-motion'
import { BookOpen, Layers, Monitor } from 'lucide-react'
import type { Course } from '@/lib/schemas/content'
import { useProgress } from '@/lib/hooks/use-progress'
import { ProgressBar } from '@/components/lesson/progress-bar'
import { LessonCard } from '@/components/course/lesson-card'

function getLessonStatus(
  lessonId: string,
  getLessonProgress: (id: string) => { completedAt?: string; screenResults: Record<string, unknown> } | null
): 'not_started' | 'in_progress' | 'completed' {
  const lp = getLessonProgress(lessonId)
  if (!lp) return 'not_started'
  if (lp.completedAt) return 'completed'
  if (Object.keys(lp.screenResults).length > 0) return 'in_progress'
  return 'not_started'
}

interface CourseOverviewClientProps {
  course: Course
}

export function CourseOverviewClient({ course }: CourseOverviewClientProps) {
  const { getLessonProgress, progress, loading } = useProgress(course.id)
  const prefersReduced = useReducedMotion() ?? false

  if (loading) {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-3xl items-center justify-center">
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    )
  }

  const totalScreens = course.modules.reduce(
    (sum, mod) => sum + mod.lessons.reduce((s, l) => s + l.screens.length, 0),
    0
  )

  const completedScreens = Object.values(progress.lessonProgress).reduce(
    (sum, lp) => sum + Object.keys(lp.screenResults).length,
    0
  )

  const totalLessons = course.modules.reduce(
    (sum, mod) => sum + mod.lessons.length,
    0
  )

  const completedLessons = course.modules.reduce(
    (sum, mod) =>
      sum +
      mod.lessons.filter(
        (l) => getLessonStatus(l.id, getLessonProgress) === 'completed'
      ).length,
    0
  )

  return (
    <div className="mx-auto max-w-3xl px-4 pb-24 pt-10 sm:px-6">
      <motion.div
        initial={prefersReduced ? { opacity: 1 } : { opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={prefersReduced ? { duration: 0 } : { duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
      >
        <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          {course.title}
        </h1>
        <p className="mt-3 text-base leading-relaxed text-muted-foreground sm:text-lg">
          {course.description}
        </p>
      </motion.div>

      <motion.div
        className="mt-8 rounded-xl border border-[var(--glass-border)] bg-card p-5"
        initial={prefersReduced ? { opacity: 1 } : { opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={prefersReduced ? { duration: 0 } : { duration: 0.4, delay: 0.08, ease: [0.25, 0.46, 0.45, 0.94] }}
      >
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-foreground">Course progress</p>
          <p className="text-sm tabular-nums text-muted-foreground">
            {completedLessons}/{totalLessons} lessons
          </p>
        </div>
        <ProgressBar current={completedScreens} total={totalScreens} className="mt-3" />

        <div className="mt-5 flex flex-wrap gap-x-6 gap-y-2 border-t border-[var(--glass-border)] pt-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Layers className="h-4 w-4" />
            <span>
              {course.modules.length}{' '}
              {course.modules.length === 1 ? 'module' : 'modules'}
            </span>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <BookOpen className="h-4 w-4" />
            <span>
              {totalLessons} {totalLessons === 1 ? 'lesson' : 'lessons'}
            </span>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Monitor className="h-4 w-4" />
            <span>
              {totalScreens} {totalScreens === 1 ? 'screen' : 'screens'}
            </span>
          </div>
        </div>
      </motion.div>

      <div className="mt-12 space-y-12">
        {course.modules.map((mod, moduleIndex) => (
          <motion.section
            key={mod.id}
            initial={prefersReduced ? { opacity: 1 } : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={prefersReduced ? { duration: 0 } : {
              duration: 0.4,
              delay: 0.15 + moduleIndex * 0.06,
              ease: [0.25, 0.46, 0.45, 0.94],
            }}
          >
            <div className="flex items-start gap-4">
              <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-xs font-semibold text-primary">
                {moduleIndex + 1}
              </span>
              <div>
                <h2 className="text-lg font-semibold tracking-tight text-foreground">
                  {mod.title}
                </h2>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                  {mod.description}
                </p>
              </div>
            </div>

            <div className="mt-5 space-y-3 pl-11">
              {mod.lessons.map((lesson, lessonIndex) => (
                <motion.div
                  key={lesson.id}
                  initial={prefersReduced ? { opacity: 1 } : { opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={prefersReduced ? { duration: 0 } : {
                    duration: 0.3,
                    delay: 0.2 + moduleIndex * 0.06 + lessonIndex * 0.04,
                    ease: [0.25, 0.46, 0.45, 0.94],
                  }}
                >
                  <LessonCard
                    title={lesson.title}
                    description={lesson.description}
                    screenCount={lesson.screens.length}
                    status={getLessonStatus(lesson.id, getLessonProgress)}
                    href={`/courses/${course.id}/lessons/${lesson.id}`}
                  />
                </motion.div>
              ))}
            </div>
          </motion.section>
        ))}
      </div>
    </div>
  )
}
