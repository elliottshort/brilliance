import type {
  Course,
  Lesson,
  MultipleChoiceScreen,
  FillInBlankScreen,
  OrderingScreen,
  CodeBlockScreen,
} from '@/lib/schemas/content'

export interface ValidationResult {
  valid: boolean
  errors: string[]
  warnings: string[]
}

const SUPPORTED_LANGUAGES = [
  'python',
  'javascript',
  'typescript',
  'java',
  'c',
  'cpp',
  'c++',
  'csharp',
  'c#',
  'go',
  'rust',
  'ruby',
  'php',
  'swift',
  'kotlin',
  'scala',
  'r',
  'sql',
  'bash',
  'shell',
  'html',
  'css',
]

export function validateMultipleChoice(screen: MultipleChoiceScreen): ValidationResult {
  const errors: string[] = []
  const warnings: string[] = []

  if (screen.options.length < 2) {
    errors.push(`Screen "${screen.id}": Multiple choice must have at least 2 options.`)
  }

  const correctOptions = screen.options.filter((o) => o.isCorrect)
  if (correctOptions.length === 0) {
    errors.push(`Screen "${screen.id}": Multiple choice must have exactly one correct option (found 0).`)
  } else if (correctOptions.length > 1) {
    errors.push(
      `Screen "${screen.id}": Multiple choice must have exactly one correct option (found ${correctOptions.length}).`
    )
  }

  const texts = screen.options.map((o) => o.text.trim().toLowerCase())
  const seenTexts = new Set<string>()
  for (const text of texts) {
    if (seenTexts.has(text)) {
      errors.push(`Screen "${screen.id}": Duplicate option text found: "${text}".`)
      break
    }
    seenTexts.add(text)
  }

  return { valid: errors.length === 0, errors, warnings }
}

export function validateFillInBlank(screen: FillInBlankScreen): ValidationResult {
  const errors: string[] = []
  const warnings: string[] = []

  const markerMatches = screen.prompt.match(/\{\{blank\}\}/g)
  const markerCount = markerMatches ? markerMatches.length : 0

  if (markerCount === 0) {
    errors.push(`Screen "${screen.id}": Fill-in-blank prompt must contain at least one {{blank}} marker.`)
  }

  if (markerCount !== screen.blanks.length) {
    errors.push(
      `Screen "${screen.id}": Number of {{blank}} markers (${markerCount}) does not match blanks array length (${screen.blanks.length}).`
    )
  }

  for (const blank of screen.blanks) {
    if (blank.acceptedAnswers.length === 0) {
      errors.push(`Screen "${screen.id}", blank "${blank.id}": Must have at least one accepted answer.`)
    }
  }

  return { valid: errors.length === 0, errors, warnings }
}

export function validateOrdering(screen: OrderingScreen): ValidationResult {
  const errors: string[] = []
  const warnings: string[] = []

  if (screen.items.length < 2) {
    errors.push(`Screen "${screen.id}": Ordering must have at least 2 items.`)
  }

  const itemIds = screen.items.map((i) => i.id)
  const uniqueItemIds = new Set(itemIds)
  if (uniqueItemIds.size !== itemIds.length) {
    errors.push(`Screen "${screen.id}": Ordering items contain duplicate IDs.`)
  }

  const correctOrderSet = new Set(screen.correctOrder)
  const itemIdSet = new Set(itemIds)

  for (const id of correctOrderSet) {
    if (!itemIdSet.has(id)) {
      errors.push(`Screen "${screen.id}": correctOrder references ID "${id}" which does not exist in items.`)
    }
  }

  for (const id of itemIdSet) {
    if (!correctOrderSet.has(id)) {
      errors.push(`Screen "${screen.id}": Item ID "${id}" is missing from correctOrder.`)
    }
  }

  if (screen.correctOrder.length !== screen.items.length) {
    errors.push(
      `Screen "${screen.id}": correctOrder length (${screen.correctOrder.length}) does not match items length (${screen.items.length}).`
    )
  }

  return { valid: errors.length === 0, errors, warnings }
}

export function validateCodeBlock(screen: CodeBlockScreen): ValidationResult {
  const errors: string[] = []
  const warnings: string[] = []

  if (screen.testCases.length === 0) {
    errors.push(`Screen "${screen.id}": Code block must have at least one test case.`)
  }

  if (!screen.starterCode || screen.starterCode.trim().length === 0) {
    errors.push(`Screen "${screen.id}": Code block starterCode must be non-empty.`)
  }

  const lang = screen.language.toLowerCase().trim()
  if (!SUPPORTED_LANGUAGES.includes(lang)) {
    errors.push(
      `Screen "${screen.id}": Language "${screen.language}" is not a supported value. Supported: ${SUPPORTED_LANGUAGES.join(', ')}.`
    )
  }

  return { valid: errors.length === 0, errors, warnings }
}

export function validateLesson(lesson: Lesson): ValidationResult {
  const errors: string[] = []
  const warnings: string[] = []

  if (lesson.screens.length < 2) {
    errors.push(`Lesson "${lesson.id}": Must have at least 2 screens (found ${lesson.screens.length}).`)
  }

  if (lesson.screens.length > 0 && lesson.screens[0].type !== 'explanation') {
    warnings.push(
      `Lesson "${lesson.id}": First screen is "${lesson.screens[0].type}" — recommended to start with an "explanation" screen.`
    )
  }

  const seenIds = new Set<string>()
  for (const screen of lesson.screens) {
    if (seenIds.has(screen.id)) {
      errors.push(`Lesson "${lesson.id}": Duplicate screen ID "${screen.id}".`)
    }
    seenIds.add(screen.id)
  }

  for (const screen of lesson.screens) {
    let screenResult: ValidationResult
    switch (screen.type) {
      case 'multiple_choice':
        screenResult = validateMultipleChoice(screen)
        break
      case 'fill_in_blank':
        screenResult = validateFillInBlank(screen)
        break
      case 'ordering':
        screenResult = validateOrdering(screen)
        break
      case 'code_block':
        screenResult = validateCodeBlock(screen)
        break
      default:
        screenResult = { valid: true, errors: [], warnings: [] }
    }
    errors.push(...screenResult.errors)
    warnings.push(...screenResult.warnings)
  }

  return { valid: errors.length === 0, errors, warnings }
}

export function validateCourse(course: Course): ValidationResult {
  const errors: string[] = []
  const warnings: string[] = []

  if (course.modules.length === 0) {
    errors.push(`Course "${course.id}": Must have at least 1 module.`)
  }

  for (const module of course.modules) {
    if (module.lessons.length === 0) {
      errors.push(`Module "${module.id}": Must have at least 1 lesson.`)
    }
  }

  const seenModuleIds = new Set<string>()
  for (const module of course.modules) {
    if (seenModuleIds.has(module.id)) {
      errors.push(`Course "${course.id}": Duplicate module ID "${module.id}".`)
    }
    seenModuleIds.add(module.id)
  }

  const seenLessonIds = new Set<string>()
  for (const module of course.modules) {
    for (const lesson of module.lessons) {
      if (seenLessonIds.has(lesson.id)) {
        errors.push(`Course "${course.id}": Duplicate lesson ID "${lesson.id}".`)
      }
      seenLessonIds.add(lesson.id)
    }
  }

  const seenScreenIds = new Set<string>()
  for (const module of course.modules) {
    for (const lesson of module.lessons) {
      for (const screen of lesson.screens) {
        if (seenScreenIds.has(screen.id)) {
          errors.push(`Course "${course.id}": Duplicate screen ID "${screen.id}" (in lesson "${lesson.id}").`)
        }
        seenScreenIds.add(screen.id)
      }
    }
  }

  for (const module of course.modules) {
    for (const lesson of module.lessons) {
      const lessonResult = validateLesson(lesson)
      errors.push(...lessonResult.errors)
      warnings.push(...lessonResult.warnings)
    }
  }

  return { valid: errors.length === 0, errors, warnings }
}

export function validateContent(course: Course): ValidationResult {
  return validateCourse(course)
}
