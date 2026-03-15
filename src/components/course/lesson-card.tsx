'use client'

import Link from 'next/link'
import { motion, useReducedMotion } from 'framer-motion'
import { CheckCircle2, PlayCircle, Circle } from 'lucide-react'
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

interface LessonCardProps {
  title: string
  description: string
  screenCount: number
  status: 'not_started' | 'in_progress' | 'completed'
  href: string
}

const statusConfig = {
  not_started: {
    label: 'Not started',
    icon: Circle,
    badgeClass: 'bg-muted text-muted-foreground border-transparent',
  },
  in_progress: {
    label: 'In progress',
    icon: PlayCircle,
    badgeClass:
      'bg-blue-500/10 text-blue-700 border-transparent dark:bg-blue-500/[0.08] dark:text-blue-300',
  },
  completed: {
    label: 'Completed',
    icon: CheckCircle2,
    badgeClass:
      'bg-emerald-500/10 text-emerald-700 border-transparent dark:bg-emerald-500/[0.08] dark:text-emerald-300',
  },
} as const

export function LessonCard({
  title,
  description,
  screenCount,
  status,
  href,
}: LessonCardProps) {
  const { label, icon: StatusIcon, badgeClass } = statusConfig[status]
  const prefersReduced = useReducedMotion() ?? false

  return (
    <Link
      href={href}
      className={cn(
        'group block rounded-xl',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background'
      )}
    >
      <motion.div
        whileHover={prefersReduced ? undefined : { y: -3, scale: 1.01 }}
        whileTap={prefersReduced ? undefined : { scale: 0.99 }}
        transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      >
        <Card
          className={cn(
            'rounded-xl border-[var(--glass-border)] transition-all duration-200',
            'shadow-sm hover:shadow-[var(--glass-shadow-outer)]',
            'hover:border-[var(--glass-border-strong)]',
            status === 'completed' && 'border-emerald-500/20 dark:border-emerald-500/15'
          )}
        >
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold leading-snug group-hover:text-primary transition-colors">
              {title}
            </CardTitle>
            <CardDescription className="text-sm leading-relaxed line-clamp-2">
              {description}
            </CardDescription>
          </CardHeader>

          <CardFooter className="flex items-center justify-between pt-0">
            <Badge variant="secondary" className="text-xs font-normal">
              {screenCount} {screenCount === 1 ? 'screen' : 'screens'}
            </Badge>

            <Badge
              className={cn(
                'gap-1.5 text-xs font-medium',
                badgeClass
              )}
            >
              <StatusIcon className="h-3 w-3" />
              {label}
            </Badge>
          </CardFooter>
        </Card>
      </motion.div>
    </Link>
  )
}
