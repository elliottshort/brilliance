import { z } from 'zod'
import { getClaudeClient, GENERATION_MODEL, GENERATION_MAX_TOKENS, ADAPTATION_MODEL } from './client'
import { CourseSchema, ScreenSchema } from '@/lib/schemas/content'
import type { Course, Screen } from '@/lib/schemas/content'
import { validateCourse } from '@/lib/validation/content-validator'
import { TM_SYSTEM_PROMPT } from './prompts/tm-system-prompt'
import { researchTopic } from '@/lib/exa/research'
import type { ResearchResult } from '@/lib/exa/research'
import { verifyCourse, autoFixCourse } from './verify-course'
import { prisma } from '@/lib/db'

const CourseSkeletonSchema = z.object({
  title: z.string(),
  description: z.string(),
  coverImage: z.string().optional(),
  modules: z.array(
    z.object({
      id: z.string(),
      title: z.string(),
      description: z.string(),
      lessons: z.array(
        z.object({
          id: z.string(),
          title: z.string(),
          description: z.string(),
          screenCount: z.number().describe('How many screens this lesson should have (5-8)'),
          primaryConcept: z.string().describe('The main concept this lesson teaches'),
          weavedConcepts: z.array(z.string()).describe('Concepts from other lessons revisited here'),
        }),
      ),
    }),
  ),
})
type CourseSkeleton = z.infer<typeof CourseSkeletonSchema>

const LessonScreensSchema = z.object({
  screens: z.array(ScreenSchema).min(1),
})

const SKELETON_TOOL_SCHEMA = z.toJSONSchema(CourseSkeletonSchema) as {
  type: 'object'
  properties: Record<string, unknown>
  [key: string]: unknown
}

const LESSON_SCREENS_TOOL_SCHEMA = z.toJSONSchema(LessonScreensSchema) as {
  type: 'object'
  properties: Record<string, unknown>
  [key: string]: unknown
}

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

function extractToolInput<T>(
  response: { stop_reason: string | null; content: Array<{ type: string; input?: unknown }> },
  schema: z.ZodType<T>,
): T | null {
  if (response.stop_reason === 'max_tokens') return null
  const toolBlock = response.content.find((b) => b.type === 'tool_use')
  if (!toolBlock?.input) return null
  const result = schema.safeParse(toolBlock.input)
  return result.success ? result.data : null
}

async function generateSkeleton(
  client: NonNullable<ReturnType<typeof getClaudeClient>>,
  courseId: string,
  topic: string,
  interviewSummary: string,
  researchSummary: string,
  outline: string,
): Promise<CourseSkeleton | null> {
  const response = await client.messages.create({
    model: GENERATION_MODEL,
    max_tokens: 4096,
    system: TM_SYSTEM_PROMPT,
    tools: [
      {
        name: 'create_course_skeleton',
        description: 'Create the course structure: title, description, modules, and lesson metadata (without screen content). Include what each lesson teaches and which concepts it weaves from other lessons.',
        input_schema: SKELETON_TOOL_SCHEMA,
      },
    ],
    tool_choice: { type: 'tool' as const, name: 'create_course_skeleton' },
    messages: [
      {
        role: 'user',
        content: `Design the STRUCTURE of a Brilliance course (no screen content yet — just modules and lesson metadata).

Topic: ${topic}
Course ID: "${courseId}"

Learner context: ${interviewSummary}

Research: ${researchSummary}

Outline to follow: ${outline}

For each lesson, specify:
- primaryConcept: the main thing this lesson teaches
- weavedConcepts: which concepts from OTHER lessons are revisited here (Thinking Method weaving)
- screenCount: how many screens (5-8)

Call the create_course_skeleton tool with the structure.`,
      },
    ],
  })

  return extractToolInput(response, CourseSkeletonSchema)
}

interface LessonContext {
  moduleTitle: string
  lessonId: string
  lessonTitle: string
  lessonDescription: string
  screenCount: number
  primaryConcept: string
  weavedConcepts: string[]
  lessonIndex: number
  totalLessons: number
}

async function generateLessonScreens(
  client: NonNullable<ReturnType<typeof getClaudeClient>>,
  topic: string,
  interviewSummary: string,
  lesson: LessonContext,
  allLessons: LessonContext[],
): Promise<Screen[]> {
  const priorLessons = allLessons
    .filter((l) => l.lessonIndex < lesson.lessonIndex)
    .map((l) => `- "${l.lessonTitle}": ${l.primaryConcept}`)
    .join('\n')

  const upcomingLessons = allLessons
    .filter((l) => l.lessonIndex > lesson.lessonIndex)
    .map((l) => `- "${l.lessonTitle}": ${l.primaryConcept}`)
    .join('\n')

  const response = await client.messages.create({
    model: GENERATION_MODEL,
    max_tokens: 8192,
    system: TM_SYSTEM_PROMPT,
    tools: [
      {
        name: 'create_lesson_screens',
        description: 'Create the interactive screens for a single lesson.',
        input_schema: LESSON_SCREENS_TOOL_SCHEMA,
      },
    ],
    tool_choice: { type: 'tool' as const, name: 'create_lesson_screens' },
    messages: [
      {
        role: 'user',
        content: `Generate ${lesson.screenCount} screens for this lesson.

Course topic: ${topic}
Module: "${lesson.moduleTitle}"
Lesson: "${lesson.lessonTitle}" — ${lesson.lessonDescription}
Learner context: ${interviewSummary}

Primary concept to teach: ${lesson.primaryConcept}
Concepts to WEAVE IN from other lessons: ${lesson.weavedConcepts.join(', ') || 'none'}

${priorLessons ? `Lessons BEFORE this one (learner already knows these):\n${priorLessons}` : 'This is the FIRST lesson — start with the learner DOING something, not reading theory.'}

${upcomingLessons ? `Lessons AFTER this one (pre-insert concepts for these):\n${upcomingLessons}` : 'This is the LAST lesson — tie everything together.'}

Lesson position: ${lesson.lessonIndex + 1} of ${lesson.totalLessons}

Use screen IDs prefixed with the lesson ID: "${lesson.lessonId}-explain-1", "${lesson.lessonId}-mc-1", etc.

Call the create_lesson_screens tool with the screens array.`,
      },
    ],
  })

  const result = extractToolInput(response, LessonScreensSchema)
  return result?.screens ?? []
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

export { COURSE_TOOL_SCHEMA }

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

    // Phase 3a: Generate course skeleton (modules + lesson metadata, no screens)
    yield { type: 'phase', phase: 'generating', message: 'Designing course structure...' }

    const skeleton = await generateSkeleton(client, courseId, topic, interviewSummary, researchSummary, outline)

    if (!skeleton) {
      yield { type: 'error', message: 'Failed to generate course structure. Please try again.' }
      return
    }

    yield { type: 'progress', percent: 40 }
    yield {
      type: 'course_preview',
      title: skeleton.title,
      description: skeleton.description,
      moduleCount: skeleton.modules.length,
    }

    // Phase 3b: Generate all lesson screens in parallel
    yield { type: 'phase', phase: 'generating', message: 'Crafting lessons and exercises...' }

    const allLessonContexts: LessonContext[] = []
    let lessonIndex = 0
    for (const mod of skeleton.modules) {
      for (const lesson of mod.lessons) {
        allLessonContexts.push({
          moduleTitle: mod.title,
          lessonId: lesson.id,
          lessonTitle: lesson.title,
          lessonDescription: lesson.description,
          screenCount: Math.min(Math.max(lesson.screenCount, 3), 10),
          primaryConcept: lesson.primaryConcept,
          weavedConcepts: lesson.weavedConcepts,
          lessonIndex,
          totalLessons: 0,
        })
        lessonIndex++
      }
    }
    for (const ctx of allLessonContexts) {
      ctx.totalLessons = allLessonContexts.length
    }

    const totalLessons = allLessonContexts.length
    const screenResults = await Promise.all(
      allLessonContexts.map(async (lessonCtx, i) => {
        const screens = await generateLessonScreens(client, topic, interviewSummary, lessonCtx, allLessonContexts)
        return { lessonId: lessonCtx.lessonId, screens, index: i }
      }),
    )

    yield { type: 'progress', percent: 70 }

    const screensByLesson = new Map<string, Screen[]>()
    for (const result of screenResults) {
      screensByLesson.set(result.lessonId, result.screens)
    }

    const course: Course = {
      id: courseId,
      title: skeleton.title,
      description: skeleton.description,
      coverImage: skeleton.coverImage,
      modules: skeleton.modules.map((mod) => ({
        id: mod.id,
        title: mod.title,
        description: mod.description,
        lessons: mod.lessons.map((lesson) => ({
          id: lesson.id,
          title: lesson.title,
          description: lesson.description,
          screens: screensByLesson.get(lesson.id) ?? [],
        })),
      })),
    }

    const assemblyResult = CourseSchema.safeParse(course)
    if (!assemblyResult.success) {
      const issues = assemblyResult.error.issues.slice(0, 5).map((i) => `${i.path.join('.')}: ${i.message}`).join('; ')
      yield { type: 'error', message: `Course assembly failed validation: ${issues}` }
      return
    }

    let validatedCourse = assemblyResult.data

    // Phase 4: Verify
    yield { type: 'phase', phase: 'verifying', message: 'Checking quality...' }
    yield { type: 'progress', percent: 80 }

    let verification = await verifyCourse(validatedCourse)
    let fixAttempts = 0
    const MAX_FIX_ATTEMPTS = 2

    while (!verification.overallPass && fixAttempts < MAX_FIX_ATTEMPTS) {
      fixAttempts++
      yield { type: 'phase', phase: 'fixing', message: 'Polishing...' }
      yield { type: 'progress', percent: 80 + fixAttempts * 5 }

      validatedCourse = await autoFixCourse(validatedCourse, verification)
      verification = await verifyCourse(validatedCourse)
    }

    yield { type: 'progress', percent: 92 }

    // Phase 5: Validate content
    const contentValidation = validateCourse(validatedCourse)
    if (!contentValidation.valid) {
      yield { type: 'error', message: `Course has content issues: ${contentValidation.errors.slice(0, 3).join('; ')}` }
      return
    }

    // Phase 6: Save
    yield { type: 'phase', phase: 'saving', message: 'Saving your course...' }
    yield { type: 'progress', percent: 95 }

    const lessonCount = validatedCourse.modules.reduce((sum, mod) => sum + mod.lessons.length, 0)

    await prisma.generatedCourse.create({
      data: {
        courseId: validatedCourse.id,
        userId,
        title: validatedCourse.title,
        description: validatedCourse.description,
        courseData: JSON.parse(JSON.stringify(validatedCourse)),
        moduleCount: validatedCourse.modules.length,
        lessonCount,
        topic,
      },
    })

    recordGeneration(userId)

    yield { type: 'progress', percent: 100 }
    yield { type: 'phase', phase: 'complete', message: 'Your course is ready!' }
    yield { type: 'complete', courseId: validatedCourse.id }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'An unexpected error occurred'
    yield { type: 'error', message: `Course generation failed: ${message}` }
  }
}
