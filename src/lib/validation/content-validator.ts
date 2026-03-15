import type {
  Course,
  Lesson,
  MultipleChoiceScreen,
  FillInBlankScreen,
  OrderingScreen,
  CodeBlockScreen,
  MatchingScreen,
  CategorizationScreen,
  HotspotScreen,
  DiagramLabelScreen,
  InteractiveGraphScreen,
  NumberLineScreen,
  PatternBuilderScreen,
  ProcessStepperScreen,
  SimulationScreen,
  BlockCodingScreen,
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

export function validateMatching(screen: MatchingScreen): ValidationResult {
  const errors: string[] = []
  const warnings: string[] = []

  if (screen.pairs.length < 2) {
    errors.push(`Screen "${screen.id}": Matching must have at least 2 pairs.`)
  }

  const pairIds = screen.pairs.map((p) => p.id)
  const uniquePairIds = new Set(pairIds)
  if (uniquePairIds.size !== pairIds.length) {
    errors.push(`Screen "${screen.id}": Matching pairs contain duplicate IDs.`)
  }

  const leftValues = screen.pairs.map((p) => p.left.trim().toLowerCase())
  const seenLefts = new Set<string>()
  for (const left of leftValues) {
    if (seenLefts.has(left)) {
      errors.push(`Screen "${screen.id}": Duplicate left value found in matching pairs.`)
      break
    }
    seenLefts.add(left)
  }

  const rightValues = screen.pairs.map((p) => p.right.trim().toLowerCase())
  const seenRights = new Set<string>()
  for (const right of rightValues) {
    if (seenRights.has(right)) {
      errors.push(`Screen "${screen.id}": Duplicate right value found in matching pairs.`)
      break
    }
    seenRights.add(right)
  }

  return { valid: errors.length === 0, errors, warnings }
}

export function validateCategorization(screen: CategorizationScreen): ValidationResult {
  const errors: string[] = []
  const warnings: string[] = []

  const catIds = screen.categories.map((c) => c.id)
  const uniqueCatIds = new Set(catIds)
  if (uniqueCatIds.size !== catIds.length) {
    errors.push(`Screen "${screen.id}": Categories contain duplicate IDs.`)
  }

  const catIdSet = new Set(catIds)
  for (const item of screen.items) {
    if (!catIdSet.has(item.categoryId)) {
      errors.push(`Screen "${screen.id}": Item "${item.id}" references non-existent category "${item.categoryId}".`)
    }
  }

  const itemsPerCategory = new Map<string, number>()
  for (const item of screen.items) {
    itemsPerCategory.set(item.categoryId, (itemsPerCategory.get(item.categoryId) ?? 0) + 1)
  }
  for (const cat of screen.categories) {
    if (!itemsPerCategory.has(cat.id) || itemsPerCategory.get(cat.id) === 0) {
      errors.push(`Screen "${screen.id}": Category "${cat.label}" has no items assigned to it.`)
    }
  }

  const itemIds = screen.items.map((i) => i.id)
  if (new Set(itemIds).size !== itemIds.length) {
    errors.push(`Screen "${screen.id}": Items contain duplicate IDs.`)
  }

  return { valid: errors.length === 0, errors, warnings }
}

export function validateHotspot(screen: HotspotScreen): ValidationResult {
  const errors: string[] = []
  const warnings: string[] = []

  const hotspotIds = screen.hotspots.map((h) => h.id)
  if (new Set(hotspotIds).size !== hotspotIds.length) {
    errors.push(`Screen "${screen.id}": Hotspots contain duplicate IDs.`)
  }

  const hotspotIdSet = new Set(hotspotIds)
  for (const correctId of screen.correctHotspotIds) {
    if (!hotspotIdSet.has(correctId)) {
      errors.push(`Screen "${screen.id}": correctHotspotIds references non-existent hotspot "${correctId}".`)
    }
  }

  for (const hs of screen.hotspots) {
    if (hs.x < 0 || hs.x > 100 || hs.y < 0 || hs.y > 100) {
      errors.push(`Screen "${screen.id}": Hotspot "${hs.id}" has coordinates outside 0-100 range.`)
    }
  }

  return { valid: errors.length === 0, errors, warnings }
}

export function validateDiagramLabel(screen: DiagramLabelScreen): ValidationResult {
  const errors: string[] = []
  const warnings: string[] = []

  const labelIds = screen.labels.map((l) => l.id)
  if (new Set(labelIds).size !== labelIds.length) {
    errors.push(`Screen "${screen.id}": Labels contain duplicate IDs.`)
  }

  for (const label of screen.labels) {
    if (label.targetX < 0 || label.targetX > 100 || label.targetY < 0 || label.targetY > 100) {
      errors.push(`Screen "${screen.id}": Label "${label.id}" has coordinates outside 0-100 range.`)
    }
  }

  return { valid: errors.length === 0, errors, warnings }
}

export function validateInteractiveGraph(screen: InteractiveGraphScreen): ValidationResult {
  const errors: string[] = []
  const warnings: string[] = []

  if (screen.xAxis.min >= screen.xAxis.max) {
    errors.push(`Screen "${screen.id}": X-axis min must be less than max.`)
  }
  if (screen.yAxis.min >= screen.yAxis.max) {
    errors.push(`Screen "${screen.id}": Y-axis min must be less than max.`)
  }

  for (const point of screen.targetData) {
    if (point.x < screen.xAxis.min || point.x > screen.xAxis.max) {
      errors.push(`Screen "${screen.id}": Target data point x=${point.x} is outside x-axis range.`)
    }
    if (point.y < screen.yAxis.min || point.y > screen.yAxis.max) {
      errors.push(`Screen "${screen.id}": Target data point y=${point.y} is outside y-axis range.`)
    }
  }

  if (screen.graphType === 'adjust_slider' && (!screen.sliders || screen.sliders.length === 0)) {
    errors.push(`Screen "${screen.id}": adjust_slider mode requires at least one slider.`)
  }

  return { valid: errors.length === 0, errors, warnings }
}

export function validateNumberLine(screen: NumberLineScreen): ValidationResult {
  const errors: string[] = []
  const warnings: string[] = []

  if (screen.min >= screen.max) {
    errors.push(`Screen "${screen.id}": Number line min must be less than max.`)
  }
  if (screen.step <= 0) {
    errors.push(`Screen "${screen.id}": Number line step must be positive.`)
  }

  for (const marker of screen.markers) {
    if (marker.correctValue < screen.min || marker.correctValue > screen.max) {
      errors.push(`Screen "${screen.id}": Marker "${marker.id}" correctValue ${marker.correctValue} is outside range [${screen.min}, ${screen.max}].`)
    }
  }

  return { valid: errors.length === 0, errors, warnings }
}

export function validatePatternBuilder(screen: PatternBuilderScreen): ValidationResult {
  const errors: string[] = []
  const warnings: string[] = []

  const hiddenPositions = screen.sequence.filter((s) => !s.revealed)
  if (hiddenPositions.length === 0) {
    errors.push(`Screen "${screen.id}": Pattern must have at least 1 hidden position.`)
  }

  const optionValues = new Set(screen.options.map((o) => o.value))
  for (const pos of hiddenPositions) {
    if (!optionValues.has(pos.value)) {
      errors.push(`Screen "${screen.id}": Hidden position ${pos.position} value "${pos.value}" has no matching option.`)
    }
  }

  const positions = screen.sequence.map((s) => s.position)
  const sorted = [...positions].sort((a, b) => a - b)
  for (let i = 0; i < sorted.length; i++) {
    if (sorted[i] !== i + 1) {
      errors.push(`Screen "${screen.id}": Sequence positions must be consecutive starting from 1.`)
      break
    }
  }

  return { valid: errors.length === 0, errors, warnings }
}

export function validateProcessStepper(screen: ProcessStepperScreen): ValidationResult {
  const errors: string[] = []
  const warnings: string[] = []

  const stepIds = screen.steps.map((s) => s.id)
  if (new Set(stepIds).size !== stepIds.length) {
    errors.push(`Screen "${screen.id}": Steps contain duplicate IDs.`)
  }

  if (screen.requireJustification) {
    for (const step of screen.steps) {
      if (!step.justification) {
        errors.push(`Screen "${screen.id}": Step "${step.id}" requires justification but none is defined.`)
      }
    }
  }

  return { valid: errors.length === 0, errors, warnings }
}

export function validateSimulation(screen: SimulationScreen): ValidationResult {
  const errors: string[] = []
  const warnings: string[] = []

  const objectIds = screen.scenario.objects.map((o) => o.id)
  if (new Set(objectIds).size !== objectIds.length) {
    errors.push(`Screen "${screen.id}": Simulation objects contain duplicate IDs.`)
  }

  if (screen.scenario.parameters) {
    for (const param of screen.scenario.parameters) {
      if (param.min >= param.max) {
        errors.push(`Screen "${screen.id}": Parameter "${param.id}" min must be less than max.`)
      }
      if (param.defaultValue < param.min || param.defaultValue > param.max) {
        errors.push(`Screen "${screen.id}": Parameter "${param.id}" defaultValue is outside [min, max] range.`)
      }
    }
  }

  return { valid: errors.length === 0, errors, warnings }
}

export function validateBlockCoding(screen: BlockCodingScreen): ValidationResult {
  const errors: string[] = []
  const warnings: string[] = []

  const blockIds = screen.availableBlocks.map((b) => b.id)
  if (new Set(blockIds).size !== blockIds.length) {
    errors.push(`Screen "${screen.id}": Available blocks contain duplicate IDs.`)
  }

  const blockIdSet = new Set(blockIds)
  for (const seqId of screen.correctSequence) {
    if (!blockIdSet.has(seqId)) {
      errors.push(`Screen "${screen.id}": correctSequence references non-existent block "${seqId}".`)
    }
  }

  if (screen.distractorBlocks) {
    for (const distId of screen.distractorBlocks) {
      if (!blockIdSet.has(distId)) {
        errors.push(`Screen "${screen.id}": distractorBlocks references non-existent block "${distId}".`)
      }
    }
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
        screenResult.warnings.push(
          `Screen "${screen.id}": code_block should only be used for CS/programming subjects. For math, science, or other subjects, use interactive_graph, simulation, process_stepper, or other subject-appropriate types.`
        )
        break
      case 'matching':
        screenResult = validateMatching(screen)
        break
      case 'categorization':
        screenResult = validateCategorization(screen)
        break
      case 'hotspot':
        screenResult = validateHotspot(screen)
        break
      case 'diagram_label':
        screenResult = validateDiagramLabel(screen)
        break
      case 'interactive_graph':
        screenResult = validateInteractiveGraph(screen)
        break
      case 'number_line':
        screenResult = validateNumberLine(screen)
        break
      case 'pattern_builder':
        screenResult = validatePatternBuilder(screen)
        break
      case 'process_stepper':
        screenResult = validateProcessStepper(screen)
        break
      case 'simulation':
        screenResult = validateSimulation(screen)
        break
      case 'block_coding':
        screenResult = validateBlockCoding(screen)
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

function sanitizeOrdering(screen: OrderingScreen): OrderingScreen {
  const itemIds = screen.items.map((i) => i.id)
  const itemIdSet = new Set(itemIds)

  // Deduplicate correctOrder and remove IDs that don't exist in items
  const seen = new Set<string>()
  const cleaned: string[] = []
  for (const id of screen.correctOrder) {
    if (itemIdSet.has(id) && !seen.has(id)) {
      seen.add(id)
      cleaned.push(id)
    }
  }

  // Append any item IDs missing from correctOrder (preserves item array order as fallback)
  for (const id of itemIds) {
    if (!seen.has(id)) {
      cleaned.push(id)
    }
  }

  return { ...screen, correctOrder: cleaned }
}

function sanitizeMultipleChoice(screen: MultipleChoiceScreen): MultipleChoiceScreen {
  const seen = new Map<string, number>()
  const dedupedOptions: typeof screen.options = []

  for (const opt of screen.options) {
    const key = opt.text.trim().toLowerCase()
    const existingIdx = seen.get(key)

    if (existingIdx === undefined) {
      seen.set(key, dedupedOptions.length)
      dedupedOptions.push(opt)
    } else if (opt.isCorrect && !dedupedOptions[existingIdx].isCorrect) {
      dedupedOptions[existingIdx] = opt
    }
  }

  return { ...screen, options: dedupedOptions }
}

export function sanitizeCourse(course: Course): Course {
  return {
    ...course,
    modules: course.modules.map((mod) => ({
      ...mod,
      lessons: mod.lessons.map((lesson) => ({
        ...lesson,
        screens: lesson.screens.map((screen) => {
          if (screen.type === 'multiple_choice') {
            return sanitizeMultipleChoice(screen)
          }
          if (screen.type === 'ordering') {
            return sanitizeOrdering(screen)
          }
          return screen
        }),
      })),
    })),
  }
}
