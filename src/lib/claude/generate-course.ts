import { z } from 'zod'
import { getClaudeClient, GENERATION_MODEL, GENERATION_MAX_TOKENS, ADAPTATION_MODEL } from './client'
import { CourseSchema } from '@/lib/schemas/content'
import type { Course } from '@/lib/schemas/content'
import { validateCourse } from '@/lib/validation/content-validator'
import { TM_SYSTEM_PROMPT } from './prompts/tm-system-prompt'
import { researchTopic } from '@/lib/exa/research'
import type { ResearchResult } from '@/lib/exa/research'
import { verifyCourse, autoFixCourse } from './verify-course'
import { prisma } from '@/lib/db'

const COURSE_TOOL_SCHEMA = z.toJSONSchema(CourseSchema) as {
  type: 'object'
  properties: Record<string, unknown>
  [key: string]: unknown
}

export type GenerationPhase = 'researching' | 'planning' | 'generating' | 'verifying' | 'fixing' | 'saving' | 'complete'

export type GenerationEvent =
  | { type: 'phase'; phase: GenerationPhase; message: string }
  | { type: 'progress'; percent: number }
  | { type: 'course_preview'; title: string; description: string; moduleCount: number }
  | { type: 'complete'; courseId: string }
  | { type: 'error'; message: string }

export interface GenerationParams {
  topic: string
  interviewSummary: string
  userId: string
}

const rateLimitMap = new Map<string, number[]>()
const MAX_GENERATIONS_PER_HOUR = 5

function checkRateLimit(userId: string): boolean {
  const now = Date.now()
  const hourAgo = now - 60 * 60 * 1000
  const timestamps = (rateLimitMap.get(userId) ?? []).filter((t) => t > hourAgo)
  rateLimitMap.set(userId, timestamps)
  return timestamps.length < MAX_GENERATIONS_PER_HOUR
}

function recordGeneration(userId: string): void {
  const timestamps = rateLimitMap.get(userId) ?? []
  timestamps.push(Date.now())
  rateLimitMap.set(userId, timestamps)
}

function buildCourseId(topic: string, userId: string): string {
  const slug = topic
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .slice(0, 40)
  const userPrefix = userId.slice(0, 6)
  const timestamp = Date.now().toString(36)
  return `ai-${slug}-${userPrefix}-${timestamp}`
}

function summarizeResearch(research: ResearchResult): string {
  const parts: string[] = []
  if (research.keyConcepts.length > 0) {
    parts.push(`Key concepts: ${research.keyConcepts.slice(0, 5).join('; ')}`)
  }
  if (research.commonMisconceptions.length > 0) {
    parts.push(`Common misconceptions: ${research.commonMisconceptions.slice(0, 3).join('; ')}`)
  }
  if (research.prerequisites.length > 0) {
    parts.push(`Prerequisites: ${research.prerequisites.slice(0, 3).join('; ')}`)
  }
  if (research.teachingApproaches.length > 0) {
    parts.push(`Teaching approaches: ${research.teachingApproaches.slice(0, 3).join('; ')}`)
  }
  if (research.rawSources.length > 0) {
    parts.push(
      `Sources consulted:\n${research.rawSources.slice(0, 5).map((s) => `- ${s.title} (${s.url})`).join('\n')}`,
    )
  }
  return parts.join('\n\n') || 'No research data available.'
}

async function planCourseStructure(
  client: NonNullable<ReturnType<typeof getClaudeClient>>,
  topic: string,
  interviewSummary: string,
  researchSummary: string,
): Promise<string> {
  const response = await client.messages.create({
    model: ADAPTATION_MODEL,
    max_tokens: 2048,
    system: `You are a Thinking Method course planner. Given a topic, learner context, and research, produce a course outline that follows The Thinking Method's weaving principle.

Output a structured outline in this format:
- Course title and description (2-3 sentences)
- Number of modules (2-8, based on topic complexity)
- For each module: title, description, and lesson titles
- For each lesson: the primary concept AND which secondary concepts from other lessons it will revisit (weaving)
- Note where you will pre-insert concepts, where cognitive load peaks and valleys fall, and where you will import the learner's existing knowledge

This is a PLAN ONLY — do not write screen content. Focus on the teaching ORDER and weaving structure.`,
    messages: [
      {
        role: 'user',
        content: `Topic: ${topic}

Learner context (from interview):
${interviewSummary}

Research findings:
${researchSummary}

Design a course outline following The Thinking Method. Consider how many modules are appropriate for this topic's complexity and the learner's starting point.`,
      },
    ],
  })

  const textBlock = response.content.find((block) => block.type === 'text')
  return textBlock?.text ?? ''
}

const MAX_GENERATION_RETRIES = 2

export async function* generateCourse(
  params: GenerationParams,
): AsyncGenerator<GenerationEvent> {
  const { topic, interviewSummary, userId } = params

  if (!checkRateLimit(userId)) {
    yield { type: 'error', message: 'Rate limit exceeded. You can generate up to 5 courses per hour. Please try again later.' }
    return
  }

  const client = getClaudeClient()
  if (!client) {
    yield { type: 'error', message: 'AI service is not configured. Please check the API key.' }
    return
  }

  const courseId = buildCourseId(topic, userId)

  try {
    // Phase 1: Research
    yield { type: 'phase', phase: 'researching', message: 'Researching your topic...' }
    yield { type: 'progress', percent: 5 }

    const research = await researchTopic(topic, interviewSummary)
    const researchSummary = summarizeResearch(research)

    yield { type: 'progress', percent: 15 }

    // Phase 2: Plan structure
    yield { type: 'phase', phase: 'planning', message: 'Planning course structure...' }
    yield { type: 'progress', percent: 20 }

    const outline = await planCourseStructure(client, topic, interviewSummary, researchSummary)

    yield { type: 'progress', percent: 30 }

    // Phase 3: Generate full course via tool_use (schema-guided, no grammar compilation)
    yield { type: 'phase', phase: 'generating', message: 'Crafting lessons and exercises...' }

    const coursePrompt = `Generate a complete Brilliance course.

Topic: ${topic}
Course ID to use: "${courseId}"

Learner context (from interview):
${interviewSummary}

Research findings:
${researchSummary}

Course outline (follow this structure, but you may adjust details):
${outline}

IMPORTANT REQUIREMENTS:
1. Follow The Thinking Method principles — especially WEAVING concepts across lessons
2. Use adaptive sizing: simple topics get 1-2 modules, complex topics get 3-8 modules
3. Each lesson should have 5-8 screens with tension contours (peaks and valleys of difficulty)
4. Every concept introduced must be revisited in a later lesson in a different context
5. Import the learner's existing knowledge wherever possible
6. Start lesson 1 with the learner DOING something, not reading theory

Call the create_course tool with the complete course data.`

    let course: Course | null = null
    let lastValidationError = ''

    for (let attempt = 0; attempt <= MAX_GENERATION_RETRIES; attempt++) {
      const messages: Array<{ role: 'user' | 'assistant'; content: string }> = [
        { role: 'user', content: attempt === 0
          ? coursePrompt
          : `${coursePrompt}\n\nYour previous attempt had validation errors:\n${lastValidationError}\n\nFix these specific issues and try again.`,
        },
      ]

      try {
        const response = await client.messages.create({
          model: GENERATION_MODEL,
          max_tokens: GENERATION_MAX_TOKENS,
          system: TM_SYSTEM_PROMPT,
          tools: [
            {
              name: 'create_course',
              description: 'Create a complete Brilliance course with modules, lessons, and interactive screens following The Thinking Method pedagogy.',
              input_schema: COURSE_TOOL_SCHEMA,
            },
          ],
          tool_choice: { type: 'tool' as const, name: 'create_course' },
          messages,
        })

        if (response.stop_reason === 'max_tokens') {
          lastValidationError = 'Response was truncated. Generate a smaller course with fewer modules/lessons.'
          if (attempt >= MAX_GENERATION_RETRIES) {
            yield { type: 'error', message: 'Course was too large to generate. Try a simpler or narrower topic.' }
            return
          }
          continue
        }

        const toolBlock = response.content.find(
          (block): block is Extract<typeof response.content[number], { type: 'tool_use' }> =>
            block.type === 'tool_use',
        )

        if (!toolBlock) {
          lastValidationError = 'No tool call was produced. You MUST call the create_course tool.'
          if (attempt >= MAX_GENERATION_RETRIES) {
            yield { type: 'error', message: 'Failed to generate course structure. Please try again.' }
            return
          }
          continue
        }

        const parsed = CourseSchema.safeParse(toolBlock.input)
        if (!parsed.success) {
          lastValidationError = parsed.error.issues
            .slice(0, 10)
            .map((i) => `${i.path.join('.')}: ${i.message}`)
            .join('\n')
          if (attempt >= MAX_GENERATION_RETRIES) {
            yield { type: 'error', message: `Course failed validation after ${MAX_GENERATION_RETRIES + 1} attempts. Try a different topic.` }
            return
          }
          continue
        }

        course = { ...parsed.data, id: courseId }
        break
      } catch (err) {
        const detail = err instanceof Error ? err.message : 'Unknown error'
        if (attempt >= MAX_GENERATION_RETRIES) {
          yield { type: 'error', message: `Course generation failed: ${detail}` }
          return
        }
        lastValidationError = detail
      }
    }

    if (!course) {
      yield { type: 'error', message: 'Failed to generate a valid course. Please try again.' }
      return
    }

    yield { type: 'progress', percent: 70 }

    yield {
      type: 'course_preview',
      title: course.title,
      description: course.description,
      moduleCount: course.modules.length,
    }

    // Phase 4: Verify
    yield { type: 'phase', phase: 'verifying', message: 'Checking quality...' }
    yield { type: 'progress', percent: 80 }

    let verification = await verifyCourse(course)
    let fixAttempts = 0
    const MAX_FIX_ATTEMPTS = 2

    while (!verification.overallPass && fixAttempts < MAX_FIX_ATTEMPTS) {
      fixAttempts++
      yield { type: 'phase', phase: 'fixing', message: 'Polishing...' }
      yield { type: 'progress', percent: 80 + fixAttempts * 5 }

      course = await autoFixCourse(course, verification)
      verification = await verifyCourse(course)
    }

    yield { type: 'progress', percent: 92 }

    // Phase 5: Validate content
    const contentValidation = validateCourse(course)
    if (!contentValidation.valid) {
      yield { type: 'error', message: `Course has content issues: ${contentValidation.errors.slice(0, 3).join('; ')}` }
      return
    }

    // Phase 6: Save
    yield { type: 'phase', phase: 'saving', message: 'Saving your course...' }
    yield { type: 'progress', percent: 95 }

    const lessonCount = course.modules.reduce((sum, mod) => sum + mod.lessons.length, 0)

    await prisma.generatedCourse.create({
      data: {
        courseId: course.id,
        userId,
        title: course.title,
        description: course.description,
        courseData: JSON.parse(JSON.stringify(course)),
        moduleCount: course.modules.length,
        lessonCount,
        topic,
      },
    })

    recordGeneration(userId)

    yield { type: 'progress', percent: 100 }
    yield { type: 'phase', phase: 'complete', message: 'Your course is ready!' }
    yield { type: 'complete', courseId: course.id }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'An unexpected error occurred'
    yield { type: 'error', message: `Course generation failed: ${message}` }
  }
}
