import { z } from 'zod'
import { getClaudeClient, GENERATION_MODEL, ADAPTATION_MODEL, ADAPTATION_MAX_TOKENS } from './client'
import { CourseSchema, ScreenSchema } from '@/lib/schemas/content'
import type { Screen } from '@/lib/schemas/content'
import { TM_SYSTEM_PROMPT } from './prompts/tm-system-prompt'
import type { ResearchResult } from '@/lib/exa/research'

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
export type CourseSkeleton = z.infer<typeof CourseSkeletonSchema>

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

export const COURSE_TOOL_SCHEMA = z.toJSONSchema(CourseSchema) as {
  type: 'object'
  properties: Record<string, unknown>
  [key: string]: unknown
}

export function buildCourseId(topic: string, userId: string): string {
  const slug = topic
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .slice(0, 40)
  const userPrefix = userId.slice(0, 6)
  const timestamp = Date.now().toString(36)
  return `ai-${slug}-${userPrefix}-${timestamp}`
}

export function summarizeResearch(research: ResearchResult): string {
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

export async function generateSkeleton(
  client: NonNullable<ReturnType<typeof getClaudeClient>>,
  courseId: string,
  topic: string,
  interviewSummary: string,
  researchSummary: string,
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
        content: `Design a complete Brilliance course structure.

Topic: ${topic}
Course ID: "${courseId}"

Learner context: ${interviewSummary}

Research: ${researchSummary}

Plan the FULL course structure following The Thinking Method:
- Decide number of modules (2-8 based on topic complexity and learner starting point)
- Plan lesson sequence with WEAVING: concepts from early lessons must be revisited in later ones
- Pre-insert supporting concepts before the lessons that need them
- Design cognitive load contours: alternate demanding and breathing-room lessons
- Import the learner's existing knowledge throughout

For each lesson, specify:
- primaryConcept: the main thing this lesson teaches
- weavedConcepts: concepts from OTHER lessons revisited here
- screenCount: how many screens (5-8)

Call the create_course_skeleton tool with the complete structure.`,
      },
    ],
  })

  return extractToolInput(response, CourseSkeletonSchema)
}

export interface LessonContext {
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

export async function generateLessonScreens(
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
    model: ADAPTATION_MODEL,
    max_tokens: ADAPTATION_MAX_TOKENS * 8,
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
