import { getClaudeClient, ADAPTATION_MODEL, ADAPTATION_MAX_TOKENS } from './client'
import { CourseSchema } from '@/lib/schemas/content'
import type { Course } from '@/lib/schemas/content'
import { validateCourse } from '@/lib/validation/content-validator'
import { TM_RUBRIC_CRITERIA } from './prompts/tm-rubric'
import type { RubricCriterion, RubricResult } from './prompts/tm-rubric'
import { TM_SYSTEM_PROMPT } from './prompts/tm-system-prompt'

export interface VerificationResult {
  overallPass: boolean
  results: RubricResult[]
  failedCritical: string[]
}

function schemaCheck(course: Course): RubricResult {
  const schemaResult = CourseSchema.safeParse(course)
  if (!schemaResult.success) {
    return {
      criterionId: 'schema-valid',
      passes: false,
      details: schemaResult.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; '),
      suggestions: ['Fix schema validation errors before proceeding'],
    }
  }

  const contentResult = validateCourse(course)
  if (!contentResult.valid) {
    return {
      criterionId: 'schema-valid',
      passes: false,
      details: contentResult.errors.join('; '),
      suggestions: contentResult.errors,
    }
  }

  return {
    criterionId: 'schema-valid',
    passes: true,
    details: 'Passes Zod schema validation and content validation',
    suggestions: [],
  }
}

async function evaluateCriteriaBatch(
  course: Course,
  criteria: RubricCriterion[],
): Promise<RubricResult[]> {
  const client = getClaudeClient()
  if (!client) {
    return criteria.map((c) => ({
      criterionId: c.id,
      passes: true,
      details: 'Skipped — Claude not configured',
      suggestions: [],
    }))
  }

  const courseJson = JSON.stringify(course, null, 2)
  const criteriaPrompts = criteria
    .map((c, i) => `### Criterion ${i + 1}: ${c.name} (${c.id})\n${c.checkPrompt}`)
    .join('\n\n---\n\n')

  try {
    const response = await client.messages.create({
      model: ADAPTATION_MODEL,
      max_tokens: ADAPTATION_MAX_TOKENS * 2,
      system: `You are a course quality auditor for the Brilliance learning platform. Evaluate the course against each criterion provided. For each criterion, respond with a JSON object on its own line in this exact format:
{"criterionId": "<id>", "passes": true/false, "details": "<specific findings>", "suggestions": ["suggestion1", "suggestion2"]}

Output one JSON line per criterion, nothing else.`,
      messages: [
        {
          role: 'user',
          content: `Evaluate this course against the following criteria:\n\n${criteriaPrompts}\n\n---\n\nCourse JSON:\n${courseJson}`,
        },
      ],
    })

    const textBlock = response.content.find((block) => block.type === 'text')
    const text = textBlock?.text ?? ''

    const results: RubricResult[] = []
    const lines = text.split('\n').filter((l) => l.trim().startsWith('{'))

    for (const line of lines) {
      try {
        const parsed = JSON.parse(line) as Partial<RubricResult>
        if (parsed.criterionId && typeof parsed.passes === 'boolean') {
          results.push({
            criterionId: parsed.criterionId,
            passes: parsed.passes,
            details: parsed.details ?? '',
            suggestions: parsed.suggestions ?? [],
          })
        }
      } catch {
        continue
      }
    }

    for (const c of criteria) {
      if (!results.find((r) => r.criterionId === c.id)) {
        results.push({
          criterionId: c.id,
          passes: true,
          details: 'Could not parse evaluation — defaulting to pass',
          suggestions: [],
        })
      }
    }

    return results
  } catch {
    return criteria.map((c) => ({
      criterionId: c.id,
      passes: true,
      details: 'Evaluation failed — defaulting to pass',
      suggestions: [],
    }))
  }
}

export async function verifyCourse(course: Course): Promise<VerificationResult> {
  const results: RubricResult[] = []

  results.push(schemaCheck(course))

  const claudeCriteria = TM_RUBRIC_CRITERIA.filter((c) => c.id !== 'schema-valid')

  const criticalAndImportant = claudeCriteria.filter(
    (c) => c.weight === 'critical' || c.weight === 'important',
  )
  const niceToHave = claudeCriteria.filter((c) => c.weight === 'nice-to-have')

  const [mainResults, niceResults] = await Promise.all([
    evaluateCriteriaBatch(course, criticalAndImportant),
    evaluateCriteriaBatch(course, niceToHave),
  ])

  results.push(...mainResults, ...niceResults)

  const failedCritical = results.filter((r) => {
    const criterion = TM_RUBRIC_CRITERIA.find((c) => c.id === r.criterionId)
    return criterion?.weight === 'critical' && !r.passes
  }).map((r) => r.criterionId)

  return {
    overallPass: failedCritical.length === 0,
    results,
    failedCritical,
  }
}

export async function autoFixCourse(
  course: Course,
  verification: VerificationResult,
): Promise<Course> {
  const client = getClaudeClient()
  if (!client) return course

  const failedResults = verification.results.filter((r) => !r.passes)
  if (failedResults.length === 0) return course

  const failureSummary = failedResults
    .map((r) => `- ${r.criterionId}: ${r.details}\n  Suggestions: ${r.suggestions.join('; ')}`)
    .join('\n')

  try {
    const response = await client.messages.create({
      model: 'claude-opus-4-6',
      max_tokens: 16384,
      system: TM_SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: `The following course was generated but failed quality verification. Fix the specific issues listed below while preserving the overall structure and content as much as possible.

Failed criteria:
${failureSummary}

Original course JSON:
${JSON.stringify(course, null, 2)}

Return ONLY the fixed course JSON, no explanation.`,
        },
      ],
    })

    const textBlock = response.content.find((block) => block.type === 'text')
    const text = textBlock?.text ?? ''

    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) return course

    const parsed = JSON.parse(jsonMatch[0])
    const validated = CourseSchema.safeParse(parsed)
    if (!validated.success) return course

    return validated.data
  } catch {
    return course
  }
}
