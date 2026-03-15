'use client'

import { ExplanationScreen } from './explanation-screen'
import { MultipleChoiceScreenRenderer } from './multiple-choice-screen'
import { FillInBlankScreen } from './fill-in-blank-screen'
import { OrderingScreenRenderer } from './ordering-screen'
import { MatchingScreenRenderer } from './matching-screen'
import { HotspotScreenRenderer } from './hotspot-screen'
import { DiagramLabelScreenRenderer } from './diagram-label-screen'
import { PatternBuilderScreenRenderer } from './pattern-builder-screen'
import { CategorizationScreenRenderer } from './categorization-screen'
import { ProcessStepperScreenRenderer } from './process-stepper-screen'
import { NumberLineScreenRenderer } from './number-line-screen'
import { InteractiveGraphScreenRenderer } from './interactive-graph-screen'
import { BlockCodingScreenRenderer } from './block-coding-screen'
import { SimulationScreenRenderer } from './simulation-screen'
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

    case 'matching':
      return (
        <MatchingScreenRenderer
          screen={screen}
          onComplete={onComplete}
        />
      )

    case 'hotspot':
      return (
        <HotspotScreenRenderer
          screen={screen}
          onComplete={onComplete}
        />
      )

    case 'diagram_label':
      return (
        <DiagramLabelScreenRenderer
          screen={screen}
          onComplete={onComplete}
        />
      )

    case 'pattern_builder':
      return (
        <PatternBuilderScreenRenderer
          screen={screen}
          onComplete={onComplete}
        />
      )

    case 'categorization':
      return (
        <CategorizationScreenRenderer
          screen={screen}
          onComplete={onComplete}
        />
      )

    case 'process_stepper':
      return (
        <ProcessStepperScreenRenderer
          screen={screen}
          onComplete={onComplete}
        />
      )

    case 'number_line':
      return (
        <NumberLineScreenRenderer
          screen={screen}
          onComplete={onComplete}
        />
      )

    case 'interactive_graph':
      return (
        <InteractiveGraphScreenRenderer
          screen={screen}
          onComplete={onComplete}
        />
      )

    case 'block_coding':
      return (
        <BlockCodingScreenRenderer
          screen={screen}
          onComplete={onComplete}
        />
      )

    case 'simulation':
      return (
        <SimulationScreenRenderer
          screen={screen}
          onComplete={onComplete}
        />
      )
  }
}
