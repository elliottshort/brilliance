'use client'

import { ExplanationScreen } from './explanation-screen'
import { MultipleChoiceScreenRenderer } from './multiple-choice-screen'
import { FillInBlankScreen } from './fill-in-blank-screen'
import { OrderingScreenRenderer } from './ordering-screen'
import { CodeBlockScreen } from './code-block-screen'
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
}

export function ScreenRenderer({ screen, onComplete }: ScreenRendererProps) {
  switch (screen.type) {
    case 'explanation':
      return (
        <ExplanationScreen
          screen={screen}
          onComplete={() => onComplete()}
        />
      )

    case 'multiple_choice':
      return (
        <MultipleChoiceScreenRenderer
          screen={screen}
          onComplete={onComplete}
        />
      )

    case 'fill_in_blank':
      return (
        <FillInBlankScreen
          screen={screen}
          onComplete={onComplete}
        />
      )

    case 'ordering':
      return (
        <OrderingScreenRenderer
          screen={screen}
          onComplete={onComplete}
        />
      )

    case 'code_block':
      return (
        <CodeBlockScreen
          screen={screen}
          onComplete={onComplete}
        />
      )
  }
}
