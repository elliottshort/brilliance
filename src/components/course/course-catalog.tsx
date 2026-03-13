'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
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

export function CourseCatalog({ courses }: { courses: CourseMeta[] }) {
  return (
    <motion.div
      className="grid gap-5 sm:grid-cols-1 lg:grid-cols-2"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {courses.map((course) => (
        <motion.div key={course.id} variants={cardVariants}>
          <Link href={`/courses/${course.id}`} className="group block h-full">
            <Card
              className={cn(
                'relative h-full overflow-hidden rounded-xl',
                'border-border/50 transition-all duration-300',
                'shadow-sm hover:shadow-lg hover:shadow-black/[0.06]',
                'dark:hover:shadow-black/30',
                'hover:-translate-y-0.5'
              )}
            >
              <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />

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

                <ArrowRight className="h-4 w-4 text-muted-foreground/50 transition-all duration-200 group-hover:text-primary group-hover:translate-x-0.5" />
              </CardFooter>
            </Card>
          </Link>
        </motion.div>
      ))}
    </motion.div>
  )
}
