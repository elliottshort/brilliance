import { z } from 'zod'
import {
  MultipleChoiceScreenSchema,
  FillInBlankScreenSchema,
  OrderingScreenSchema,
  CodeBlockScreenSchema,
} from '@/lib/schemas/content'

export const LearnerProfileDimensionsSchema = z.object({
  priorKnowledge: z.number().min(0).max(1),
  patternRecognition: z.number().min(0).max(1),
  abstractionComfort: z.number().min(0).max(1),
  reasoningStyle: z.number().min(0).max(1),
  cognitiveStamina: z.number().min(0).max(1),
  selfAwareness: z.number().min(0).max(1),
})

export const LearnerProfileSchema = z.object({
  dimensions: LearnerProfileDimensionsSchema,
  topic: z.string().min(1),
  narrative: z.string().min(1),
  assessedAt: z.string(),
})

export const ConceptSortPuzzleSchema = z.object({
  type: z.literal('concept_sort'),
  id: z.string(),
  title: z.string(),
  concepts: z.array(z.object({ id: z.string(), text: z.string() })).min(3).max(12),
  categories: z.array(z.string()).length(3),
})

export const ConfidenceProbePuzzleSchema = z.object({
  type: z.literal('confidence_probe'),
  id: z.string(),
  statement: z.string().min(1),
  topicContext: z.string().optional(),
})

export const WhatHappensNextPuzzleSchema = z.object({
  type: z.literal('what_happens_next'),
  id: z.string(),
  scenario: z.string().min(1),
  options: z.array(z.object({
    id: z.string(),
    text: z.string(),
  })).min(2).max(5),
  correctId: z.string(),
  explanation: z.string(),
})

export const AssessmentMultipleChoiceSchema = MultipleChoiceScreenSchema.extend({
  abstract: z.boolean().optional(),
})

export const AssessmentFillInBlankSchema = FillInBlankScreenSchema.extend({
  abstract: z.boolean().optional(),
})

export const AssessmentOrderingSchema = OrderingScreenSchema.extend({
  abstract: z.boolean().optional(),
})

export const AssessmentCodeBlockSchema = CodeBlockScreenSchema.extend({
  abstract: z.boolean().optional(),
})

export const AssessmentPuzzleSchema = z.discriminatedUnion('type', [
  ConceptSortPuzzleSchema,
  ConfidenceProbePuzzleSchema,
  WhatHappensNextPuzzleSchema,
  AssessmentMultipleChoiceSchema,
  AssessmentFillInBlankSchema,
  AssessmentOrderingSchema,
  AssessmentCodeBlockSchema,
])

export const AssessmentResponseSchema = z.object({
  puzzleId: z.string(),
  puzzleType: z.string(),
  response: z.unknown(),
  responseTimeMs: z.number().min(0),
  hintsUsed: z.number().int().min(0).default(0),
  correct: z.boolean().nullable(),
})

export type LearnerProfileDimensions = z.infer<typeof LearnerProfileDimensionsSchema>
export type LearnerProfile = z.infer<typeof LearnerProfileSchema>
export type ConceptSortPuzzle = z.infer<typeof ConceptSortPuzzleSchema>
export type ConfidenceProbePuzzle = z.infer<typeof ConfidenceProbePuzzleSchema>
export type WhatHappensNextPuzzle = z.infer<typeof WhatHappensNextPuzzleSchema>
export type AssessmentMultipleChoice = z.infer<typeof AssessmentMultipleChoiceSchema>
export type AssessmentFillInBlank = z.infer<typeof AssessmentFillInBlankSchema>
export type AssessmentOrdering = z.infer<typeof AssessmentOrderingSchema>
export type AssessmentCodeBlock = z.infer<typeof AssessmentCodeBlockSchema>
export type AssessmentPuzzle = z.infer<typeof AssessmentPuzzleSchema>
export type AssessmentResponse = z.infer<typeof AssessmentResponseSchema>
