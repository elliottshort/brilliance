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
import type { ScreenResult } from './shared/screen-utils'

export type { ScreenResult }

export interface ScreenRendererProps {
  screen: Screen
  onComplete: (result?: ScreenResult) => void
  readOnly?: boolean
  courseId?: string
  lessonId?: string
}

export function ScreenRenderer({ screen, onComplete, readOnly, courseId, lessonId }: ScreenRendererProps) {
  let content: React.ReactNode

  switch (screen.type) {
    case 'explanation':
      content = (
        <ExplanationScreen
          screen={screen}
          onComplete={() => onComplete()}
        />
      )
      break

    case 'multiple_choice':
      content = (
        <MultipleChoiceScreenRenderer
          screen={screen}
          onComplete={onComplete}
          courseId={courseId}
          lessonId={lessonId}
        />
      )
      break

    case 'fill_in_blank':
      content = (
        <FillInBlankScreen
          screen={screen}
          onComplete={onComplete}
          courseId={courseId}
          lessonId={lessonId}
        />
      )
      break

    case 'ordering':
      content = (
        <OrderingScreenRenderer
          screen={screen}
          onComplete={onComplete}
          courseId={courseId}
          lessonId={lessonId}
        />
      )
      break

    case 'code_block':
      content = (
        <CodeBlockScreen
          screen={screen}
          onComplete={onComplete}
        />
      )
      break

    case 'matching':
      content = (
        <MatchingScreenRenderer
          screen={screen}
          onComplete={onComplete}
        />
      )
      break

    case 'hotspot':
      content = (
        <HotspotScreenRenderer
          screen={screen}
          onComplete={onComplete}
        />
      )
      break

    case 'diagram_label':
      content = (
        <DiagramLabelScreenRenderer
          screen={screen}
          onComplete={onComplete}
        />
      )
      break

    case 'pattern_builder':
      content = (
        <PatternBuilderScreenRenderer
          screen={screen}
          onComplete={onComplete}
        />
      )
      break

    case 'categorization':
      content = (
        <CategorizationScreenRenderer
          screen={screen}
          onComplete={onComplete}
        />
      )
      break

    case 'process_stepper':
      content = (
        <ProcessStepperScreenRenderer
          screen={screen}
          onComplete={onComplete}
        />
      )
      break

    case 'number_line':
      content = (
        <NumberLineScreenRenderer
          screen={screen}
          onComplete={onComplete}
        />
      )
      break

    case 'interactive_graph':
      content = (
        <InteractiveGraphScreenRenderer
          screen={screen}
          onComplete={onComplete}
        />
      )
      break

    case 'block_coding':
      content = (
        <BlockCodingScreenRenderer
          screen={screen}
          onComplete={onComplete}
        />
      )
      break

    case 'simulation':
      content = (
        <SimulationScreenRenderer
          screen={screen}
          onComplete={onComplete}
        />
      )
      break
  }

  if (readOnly) {
    return (
      <div className="pointer-events-none opacity-90" aria-disabled="true">
        {content}
      </div>
    )
  }

  return <>{content}</>
}
