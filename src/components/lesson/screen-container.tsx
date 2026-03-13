'use client'

import { motion } from 'framer-motion'
import { ArrowRight, Check } from 'lucide-react'
import { Card, CardContent, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface ScreenContainerProps {
  children: React.ReactNode
  currentScreen: number
  totalScreens: number
  onNext: () => void
  onCheck?: () => void
  showCheck?: boolean
  checkDisabled?: boolean
  className?: string
}

export function ScreenContainer({
  children,
  currentScreen,
  totalScreens,
  onNext,
  onCheck,
  showCheck = false,
  checkDisabled = false,
  className,
}: ScreenContainerProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.25, 0.4, 0.25, 1] }}
    >
      <Card
        className={cn(
          'rounded-xl border-border/50 shadow-sm shadow-black/[0.03] dark:shadow-black/20',
          'bg-card/80 backdrop-blur-sm',
          className
        )}
      >
        <div className="px-6 pt-5 pb-1">
          <span className="text-xs font-medium tracking-wide text-muted-foreground/70 uppercase">
            {currentScreen} of {totalScreens}
          </span>
        </div>

        <CardContent className="p-6 pt-4">{children}</CardContent>

        <CardFooter className="flex justify-end gap-3 border-t border-border/40 px-6 py-4">
          {showCheck ? (
            <Button
              onClick={onCheck}
              disabled={checkDisabled}
              className="gap-2"
              size="lg"
            >
              <Check className="h-4 w-4" />
              Check Answer
            </Button>
          ) : (
            <Button onClick={onNext} className="gap-2" size="lg">
              Continue
              <ArrowRight className="h-4 w-4" />
            </Button>
          )}
        </CardFooter>
      </Card>
    </motion.div>
  )
}
