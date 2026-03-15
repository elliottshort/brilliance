'use client'

import Link from 'next/link'
import { motion, useReducedMotion } from 'framer-motion'
import { BookOpen, Layers, ArrowRight } from 'lucide-react'
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from '@/components/ui/card'
import { cn } from '@/lib/utils'
import type { CourseMeta } from '@/lib/content/loader'

const containerVariants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.1,
    },
  },
}

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
      ease: [0.25, 0.1, 0.25, 1] as const,
    },
  },
}

const cardVariantsReduced = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { duration: 0 },
  },
}

function CourseCard({ course, reduced }: { course: CourseMeta; reduced: boolean }) {
  return (
    <Link
      href={`/courses/${course.id}`}
      className={cn(
        'group block h-full rounded-xl',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background'
      )}
    >
      <motion.div
        whileHover={reduced ? undefined : { y: -3, scale: 1.015 }}
        whileTap={reduced ? undefined : { scale: 0.99 }}
        transition={{ type: 'spring', stiffness: 400, damping: 25 }}
        className="h-full"
      >
        <Card
          className={cn(
            'relative h-full overflow-hidden rounded-xl',
            'border-[var(--glass-border)] transition-all duration-300',
            'shadow-sm hover:shadow-[var(--glass-shadow-outer)]',
            'hover:border-[var(--glass-border-strong)]'
          )}
        >
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/15 to-transparent" />

          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-semibold leading-snug tracking-tight group-hover:text-primary transition-colors duration-200">
              {course.title}
            </CardTitle>
            <CardDescription className="text-sm leading-relaxed line-clamp-2 mt-1">
              {course.description}
            </CardDescription>
          </CardHeader>

          <CardFooter className="flex items-center justify-between pt-0">
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <Layers className="h-3.5 w-3.5" />
                {course.moduleCount} {course.moduleCount === 1 ? 'module' : 'modules'}
              </span>
              <span className="flex items-center gap-1.5">
                <BookOpen className="h-3.5 w-3.5" />
                {course.lessonCount} {course.lessonCount === 1 ? 'lesson' : 'lessons'}
              </span>
            </div>

            <ArrowRight
              className={cn(
                'h-4 w-4 text-muted-foreground/50 transition-all duration-200',
                'group-hover:text-primary group-hover:translate-x-0.5'
              )}
            />
          </CardFooter>
        </Card>
      </motion.div>
    </Link>
  )
}

export function CourseCatalog({ courses }: { courses: CourseMeta[] }) {
  const prefersReduced = useReducedMotion() ?? false

  return (
    <motion.div
      className="grid gap-5 sm:grid-cols-1 lg:grid-cols-2"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {courses.map((course) => (
        <motion.div
          key={course.id}
          variants={prefersReduced ? cardVariantsReduced : cardVariants}
        >
          <CourseCard course={course} reduced={prefersReduced} />
        </motion.div>
      ))}
    </motion.div>
  )
}
