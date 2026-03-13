'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
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
      'bg-blue-100 text-blue-700 border-transparent dark:bg-blue-950/50 dark:text-blue-300',
  },
  completed: {
    label: 'Completed',
    icon: CheckCircle2,
    badgeClass:
      'bg-emerald-100 text-emerald-700 border-transparent dark:bg-emerald-950/50 dark:text-emerald-300',
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

  return (
    <Link href={href} className="group block">
      <motion.div whileHover={{ y: -2 }} transition={{ duration: 0.2 }}>
        <Card
          className={cn(
            'rounded-xl border-border/50 transition-shadow duration-200',
            'shadow-sm hover:shadow-lg hover:shadow-black/[0.06]',
            'dark:hover:shadow-black/30',
            status === 'completed' && 'border-emerald-200/50 dark:border-emerald-800/30'
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
