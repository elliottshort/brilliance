'use client'

import { ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { ExplanationScreen } from './explanation-screen'
import type { Screen } from '@/lib/schemas/content'

export interface ScreenResult {
  screenId: string
  answeredCorrectly: boolean
  attempts: number
  hintsUsed: number
  answeredAt: string
}

export interface ScreenRendererProps {
  screen: Screen
  onComplete: (result?: ScreenResult) => void
  onHintUsed?: (hintIndex: number) => void
}

function PlaceholderScreen({
  screenType,
  onContinue,
}: {
  screenType: string
  onContinue: () => void
}) {
  return (
    <div className="space-y-6">
      <div
        className={cn(
          'flex items-center justify-center rounded-xl border border-dashed',
          'border-border/60 bg-muted/30 px-6 py-16'
        )}
      >
        <p className="text-sm font-medium text-muted-foreground">
          <span className="rounded-md bg-muted px-2 py-1 font-mono text-xs">
            {screenType}
          </span>{' '}
          screen — coming soon
        </p>
      </div>
      <div className="flex justify-end">
        <Button onClick={onContinue} size="lg" className="gap-2">
          Continue
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}

export function ScreenRenderer({ screen, onComplete, onHintUsed: _onHintUsed }: ScreenRendererProps) {
  switch (screen.type) {
    case 'explanation':
      return (
        <ExplanationScreen
          screen={screen}
          onComplete={() => onComplete()}
        />
      )

    case 'multiple_choice':
    case 'fill_in_blank':
    case 'ordering':
    case 'code_block':
      return (
        <PlaceholderScreen
          screenType={screen.type}
          onContinue={() =>
            onComplete({
              screenId: screen.id,
              answeredCorrectly: true,
              attempts: 0,
              hintsUsed: 0,
              answeredAt: new Date().toISOString(),
            })
          }
        />
      )
  }
}
