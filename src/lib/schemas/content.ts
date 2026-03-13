import { z } from 'zod'

/**
 * ExplanationScreen — pure content, no interaction required.
 * Used for introducing concepts, providing context, or summarizing.
 */
export const ExplanationScreenSchema = z.object({
  id: z
    .string()
    .describe('Unique screen identifier within the lesson, e.g. "intro-1" or "explain-variables"'),
  type: z
    .literal('explanation')
    .describe('Screen type discriminator — this is a read-only content screen'),
  title: z
    .string()
    .min(1)
    .describe('Short screen heading shown to the learner, e.g. "What is a Variable?"'),
  content: z
    .string()
    .min(20)
    .describe(
      'Markdown-formatted explanation text. Supports headings, bold, italic, code blocks, and lists. Should be concise — aim for 2-4 short paragraphs.'
    ),
  callout: z
    .string()
    .optional()
    .describe(
      'Optional highlighted tip, warning, or fun fact. Rendered in a colored callout box. e.g. "Did you know? Python was named after Monty Python!"'
    ),
})

/**
 * MultipleChoiceScreen — single correct answer from a list of options.
 */
export const MultipleChoiceScreenSchema = z.object({
  id: z
    .string()
    .describe('Unique screen identifier within the lesson, e.g. "mc-data-types"'),
  type: z
    .literal('multiple_choice')
    .describe('Screen type discriminator — learner picks one correct answer'),
  title: z
    .string()
    .min(1)
    .describe('The question or prompt shown to the learner, e.g. "Which of these is a string?"'),
  options: z
    .array(
      z.object({
        id: z
          .string()
          .describe('Unique option identifier within this screen, e.g. "opt-a", "opt-b"'),
        text: z
          .string()
          .min(1)
          .describe('The answer text shown to the learner, e.g. "42" or "Hello World"'),
        isCorrect: z
          .boolean()
          .describe('Whether this option is the correct answer — exactly one option must be true'),
      })
    )
    .min(2)
    .max(6)
    .describe('List of answer options. Must contain exactly one correct option. 2-6 options recommended.'),
  explanation: z
    .string()
    .min(20)
    .describe(
      'Detailed explanation shown after the learner answers. Explains WHY the correct answer is right and why distractors are wrong. Must be at least 20 characters.'
    ),
  hints: z
    .array(z.string().min(1))
    .min(1)
    .max(3)
    .describe(
      'Progressive hints revealed one at a time. First hint is gentle, last is nearly the answer. 1-3 hints required. e.g. ["Think about what type uses quotes", "Strings are text values"]'
    ),
  difficulty: z
    .enum(['easy', 'medium', 'hard'])
    .describe(
      'Difficulty level — "easy": recall/recognition, "medium": application/understanding, "hard": analysis/synthesis'
    ),
})

/**
 * FillInBlankScreen — learner fills in one or more blanks in a prompt.
 * Blanks are marked with {{blank}} in the prompt text.
 */
export const FillInBlankScreenSchema = z.object({
  id: z
    .string()
    .describe('Unique screen identifier within the lesson, e.g. "fib-loop-syntax"'),
  type: z
    .literal('fill_in_blank')
    .describe('Screen type discriminator — learner types answers into blank slots'),
  title: z
    .string()
    .min(1)
    .describe('The screen heading, e.g. "Complete the Code"'),
  prompt: z
    .string()
    .min(1)
    .describe(
      'The text with {{blank}} markers where the learner fills in answers. Each {{blank}} corresponds to one entry in the blanks array, in order. e.g. "A {{blank}} loop runs while a condition is {{blank}}."'
    ),
  blanks: z
    .array(
      z.object({
        id: z
          .string()
          .describe('Unique blank identifier within this screen, e.g. "blank-1", "blank-2"'),
        acceptedAnswers: z
          .array(z.string().min(1))
          .min(1)
          .describe(
            'List of accepted answers for this blank. Include common variations. e.g. ["while", "While", "WHILE"] or ["true", "True"]'
          ),
        caseSensitive: z
          .boolean()
          .describe(
            'Whether answer matching is case-sensitive. Set false for natural language, true for code syntax.'
          ),
      })
    )
    .min(1)
    .describe(
      'Array of blanks in the same order as {{blank}} markers appear in the prompt. Each blank defines accepted answers.'
    ),
  explanation: z
    .string()
    .min(20)
    .describe(
      'Detailed explanation shown after the learner answers. Explains the correct answers and why they fit. Must be at least 20 characters.'
    ),
  hints: z
    .array(z.string().min(1))
    .min(1)
    .max(3)
    .describe(
      'Progressive hints revealed one at a time. 1-3 hints required. e.g. ["This keyword starts a conditional loop", "It rhymes with pile"]'
    ),
  difficulty: z
    .enum(['easy', 'medium', 'hard'])
    .describe(
      'Difficulty level — "easy": recall/recognition, "medium": application/understanding, "hard": analysis/synthesis'
    ),
})

/**
 * OrderingScreen — learner arranges items into the correct sequence.
 */
export const OrderingScreenSchema = z.object({
  id: z
    .string()
    .describe('Unique screen identifier within the lesson, e.g. "order-algo-steps"'),
  type: z
    .literal('ordering')
    .describe('Screen type discriminator — learner drags items into correct order'),
  title: z
    .string()
    .min(1)
    .describe('The prompt asking the learner to order items, e.g. "Arrange these steps in the correct order"'),
  items: z
    .array(
      z.object({
        id: z
          .string()
          .describe('Unique item identifier used in correctOrder array, e.g. "step-1", "step-2"'),
        text: z
          .string()
          .min(1)
          .describe('The text content of this orderable item, e.g. "Initialize the variable"'),
      })
    )
    .min(2)
    .max(8)
    .describe(
      'The items to be ordered. Presented in randomized order to the learner. 2-8 items recommended.'
    ),
  correctOrder: z
    .array(z.string())
    .min(2)
    .describe(
      'Array of item IDs in the correct sequence. Must contain exactly the same IDs as the items array. e.g. ["step-1", "step-3", "step-2"]'
    ),
  explanation: z
    .string()
    .min(20)
    .describe(
      'Detailed explanation of why this is the correct order. Must be at least 20 characters.'
    ),
  hints: z
    .array(z.string().min(1))
    .min(1)
    .max(3)
    .describe(
      'Progressive hints revealed one at a time. 1-3 hints required. e.g. ["What must happen before you can use a variable?", "Think about: declare, assign, use"]'
    ),
  difficulty: z
    .enum(['easy', 'medium', 'hard'])
    .describe(
      'Difficulty level — "easy": recall/recognition, "medium": application/understanding, "hard": analysis/synthesis'
    ),
})

/**
 * CodeBlockScreen — learner writes or modifies code, validated against test cases.
 */
export const CodeBlockScreenSchema = z.object({
  id: z
    .string()
    .describe('Unique screen identifier within the lesson, e.g. "code-hello-world"'),
  type: z
    .literal('code_block')
    .describe('Screen type discriminator — learner writes or edits code'),
  title: z
    .string()
    .min(1)
    .describe('The coding challenge heading, e.g. "Write a Function to Add Two Numbers"'),
  language: z
    .string()
    .min(1)
    .describe(
      'Programming language for syntax highlighting and execution. e.g. "python", "javascript", "typescript"'
    ),
  starterCode: z
    .string()
    .describe(
      'Pre-filled code shown in the editor. Can be empty string for "write from scratch" challenges. Include comments as guidance. e.g. "# Write your function below\\ndef add(a, b):\\n  pass"'
    ),
  testCases: z
    .array(
      z.object({
        input: z
          .string()
          .describe(
            'The input passed to the learner\'s code. e.g. "add(2, 3)" or "hello" for stdin'
          ),
        expectedOutput: z
          .string()
          .describe(
            'The expected output to validate against. Compared as trimmed string. e.g. "5" or "Hello, World!"'
          ),
      })
    )
    .min(1)
    .describe(
      'Test cases to validate the learner\'s code. At least one required. Each test has an input and expected output.'
    ),
  explanation: z
    .string()
    .min(20)
    .describe(
      'Detailed explanation of the solution approach, shown after completion. Walks through the logic step by step. Must be at least 20 characters.'
    ),
  hints: z
    .array(z.string().min(1))
    .min(1)
    .max(3)
    .describe(
      'Progressive hints revealed one at a time. 1-3 hints required. e.g. ["Use the + operator", "The function should return a + b"]'
    ),
  difficulty: z
    .enum(['easy', 'medium', 'hard'])
    .describe(
      'Difficulty level — "easy": recall/recognition, "medium": application/understanding, "hard": analysis/synthesis'
    ),
})

export const ScreenSchema = z
  .discriminatedUnion('type', [
    ExplanationScreenSchema,
    MultipleChoiceScreenSchema,
    FillInBlankScreenSchema,
    OrderingScreenSchema,
    CodeBlockScreenSchema,
  ])
  .describe(
    'A single screen in a lesson. Discriminated by the "type" field. Each lesson is a sequence of screens mixing explanation and interactive types.'
  )

export const LessonSchema = z.object({
  id: z
    .string()
    .describe('Unique lesson identifier within the course, e.g. "lesson-variables-intro"'),
  title: z
    .string()
    .min(1)
    .describe('Lesson title shown in navigation and cards, e.g. "Introduction to Variables"'),
  description: z
    .string()
    .min(1)
    .describe(
      'Brief lesson summary (1-2 sentences) shown in lesson cards. e.g. "Learn what variables are and how to use them to store data."'
    ),
  screens: z
    .array(ScreenSchema)
    .min(1)
    .describe(
      'Ordered sequence of screens in this lesson. Recommended rhythm: explanation → interactive → explanation → interactive → summary. 3-8 screens per lesson.'
    ),
})

export const ModuleSchema = z.object({
  id: z
    .string()
    .describe('Unique module identifier within the course, e.g. "module-basics"'),
  title: z
    .string()
    .min(1)
    .describe('Module title shown in course navigation, e.g. "Python Basics"'),
  description: z
    .string()
    .min(1)
    .describe(
      'Brief module summary (1-2 sentences). e.g. "Learn the fundamental building blocks of Python programming."'
    ),
  lessons: z
    .array(LessonSchema)
    .min(1)
    .describe('Ordered list of lessons in this module. 2-6 lessons per module recommended.'),
})

export const CourseSchema = z.object({
  id: z
    .string()
    .describe('Unique course identifier, used in URLs and storage keys. e.g. "python-101"'),
  title: z
    .string()
    .min(1)
    .describe('Course title shown on the course card and header, e.g. "Python for Beginners"'),
  description: z
    .string()
    .min(1)
    .describe(
      'Course summary (2-3 sentences) shown on the course listing page. Describes what the learner will achieve.'
    ),
  coverImage: z
    .string()
    .optional()
    .describe(
      'Optional URL or path to a course cover image. Used on course cards. e.g. "/images/python-cover.png"'
    ),
  modules: z
    .array(ModuleSchema)
    .min(1)
    .describe('Ordered list of modules in this course. 2-8 modules per course recommended.'),
})

export type ExplanationScreen = z.infer<typeof ExplanationScreenSchema>
export type MultipleChoiceScreen = z.infer<typeof MultipleChoiceScreenSchema>
export type FillInBlankScreen = z.infer<typeof FillInBlankScreenSchema>
export type OrderingScreen = z.infer<typeof OrderingScreenSchema>
export type CodeBlockScreen = z.infer<typeof CodeBlockScreenSchema>
export type Screen = z.infer<typeof ScreenSchema>
export type Lesson = z.infer<typeof LessonSchema>
export type Module = z.infer<typeof ModuleSchema>
export type Course = z.infer<typeof CourseSchema>
