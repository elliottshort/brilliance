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

/**
 * MatchingScreen — learner connects related pairs by drawing lines or dragging.
 * Universal: works for any subject (term↔definition, tool↔purpose, cause↔effect).
 */
export const MatchingScreenSchema = z.object({
  id: z
    .string()
    .describe('Unique screen identifier within the lesson, e.g. "match-tools-jobs"'),
  type: z
    .literal('matching')
    .describe('Screen type discriminator — learner connects related pairs'),
  title: z
    .string()
    .min(1)
    .describe('The prompt asking the learner to match items, e.g. "Match each tool to its purpose"'),
  pairs: z
    .array(
      z.object({
        id: z
          .string()
          .describe('Unique pair identifier within this screen, e.g. "pair-1"'),
        left: z
          .string()
          .min(1)
          .describe('The left-side item text, e.g. "Wrench" or "f(x) = x²"'),
        right: z
          .string()
          .min(1)
          .describe('The right-side item text that correctly pairs with the left, e.g. "Tighten bolts" or "Parabola"'),
      })
    )
    .min(2)
    .max(8)
    .describe(
      'The correct pairings. Left items appear in original order, right items are shuffled by the renderer. 2-8 pairs recommended. Each pair defines one correct left↔right connection.'
    ),
  instruction: z
    .string()
    .optional()
    .describe(
      'Optional context or instruction for the learner, e.g. "Match each tool to its purpose" or "Connect the equations to their graph shapes"'
    ),
  explanation: z
    .string()
    .min(20)
    .describe(
      'Detailed explanation shown after the learner answers. Explains WHY each pairing is correct. Must be at least 20 characters.'
    ),
  hints: z
    .array(z.string().min(1))
    .min(1)
    .max(3)
    .describe(
      'Progressive hints revealed one at a time. 1-3 hints required. e.g. ["Look for items that are used together", "A wrench is for fasteners"]'
    ),
  difficulty: z
    .enum(['easy', 'medium', 'hard'])
    .describe(
      'Difficulty level — "easy": obvious pairings, "medium": requires understanding, "hard": requires deep knowledge'
    ),
})

export const CategorizationScreenSchema = z.object({
  id: z.string().describe('Unique screen identifier, e.g. "cat-sort-tools"'),
  type: z.literal('categorization').describe('Screen type discriminator — learner sorts items into labeled buckets'),
  title: z.string().min(1).describe('The prompt, e.g. "Sort these items into the correct category"'),
  categories: z.array(z.object({
    id: z.string().describe('Unique category identifier, e.g. "cat-hand-tools"'),
    label: z.string().min(1).describe('Category name shown to learner, e.g. "Hand Tools" or "Mammals"'),
  })).min(2).max(4).describe('The category buckets. 2-4 categories.'),
  items: z.array(z.object({
    id: z.string().describe('Unique item identifier, e.g. "item-wrench"'),
    text: z.string().min(1).describe('Item text shown to learner, e.g. "Wrench" or "Whale"'),
    categoryId: z.string().describe('ID of the correct category this item belongs to'),
  })).min(4).max(12).describe('Items to sort into categories. 4-12 items. Each references a categoryId.'),
  instruction: z.string().optional().describe('Optional context, e.g. "Sort these animals by their class"'),
  explanation: z.string().min(20).describe('Explains why each item belongs to its category. Min 20 chars.'),
  hints: z.array(z.string().min(1)).min(1).max(3).describe('Progressive hints. 1-3 required.'),
  difficulty: z.enum(['easy', 'medium', 'hard']).describe('Difficulty level'),
})

export const HotspotScreenSchema = z.object({
  id: z.string().describe('Unique screen identifier, e.g. "hot-find-filter"'),
  type: z.literal('hotspot').describe('Screen type discriminator — learner clicks/taps regions on an image'),
  title: z.string().min(1).describe('The prompt, e.g. "Click on the oil filter"'),
  imageUrl: z.string().min(1).describe('URL to the image, e.g. "/images/engine-bay.png"'),
  imageAlt: z.string().min(1).describe('Alt text for accessibility, e.g. "Engine bay of a Dodge Ram"'),
  hotspots: z.array(z.object({
    id: z.string().describe('Unique hotspot identifier'),
    x: z.number().min(0).max(100).describe('Hotspot center X position as percentage (0-100)'),
    y: z.number().min(0).max(100).describe('Hotspot center Y position as percentage (0-100)'),
    width: z.number().min(1).max(100).describe('Hotspot width as percentage of image width'),
    height: z.number().min(1).max(100).describe('Hotspot height as percentage of image height'),
    label: z.string().min(1).describe('Label for this hotspot, e.g. "Oil filter"'),
  })).min(2).describe('Clickable regions on the image. At least 2 hotspots.'),
  correctHotspotIds: z.array(z.string()).min(1).describe('IDs of the correct hotspot(s) to click'),
  selectionMode: z.enum(['single', 'multiple']).describe('"single" = pick one, "multiple" = pick all correct'),
  instruction: z.string().min(1).describe('What to find, e.g. "Click on the oil filter in this engine photo"'),
  explanation: z.string().min(20).describe('Explains the correct answer. Min 20 chars.'),
  hints: z.array(z.string().min(1)).min(1).max(3).describe('Progressive hints. 1-3 required.'),
  difficulty: z.enum(['easy', 'medium', 'hard']).describe('Difficulty level'),
})

export const DiagramLabelScreenSchema = z.object({
  id: z.string().describe('Unique screen identifier, e.g. "diag-engine-parts"'),
  type: z.literal('diagram_label').describe('Screen type discriminator — learner drags labels to positions on an image'),
  title: z.string().min(1).describe('The prompt, e.g. "Label the parts of the engine"'),
  imageUrl: z.string().min(1).describe('URL to the diagram image'),
  imageAlt: z.string().min(1).describe('Alt text for the diagram image'),
  labels: z.array(z.object({
    id: z.string().describe('Unique label identifier'),
    text: z.string().min(1).describe('Label text, e.g. "Oil filter" or "Mitochondria"'),
    targetX: z.number().min(0).max(100).describe('Correct X position as percentage (0-100)'),
    targetY: z.number().min(0).max(100).describe('Correct Y position as percentage (0-100)'),
  })).min(2).max(10).describe('Labels with their correct positions on the image. 2-10 labels.'),
  instruction: z.string().min(1).describe('Context, e.g. "Drag each label to the correct part of the engine"'),
  explanation: z.string().min(20).describe('Explains correct placements. Min 20 chars.'),
  hints: z.array(z.string().min(1)).min(1).max(3).describe('Progressive hints. 1-3 required.'),
  difficulty: z.enum(['easy', 'medium', 'hard']).describe('Difficulty level'),
})

export const InteractiveGraphScreenSchema = z.object({
  id: z.string().describe('Unique screen identifier, e.g. "graph-plot-growth"'),
  type: z.literal('interactive_graph').describe('Screen type discriminator — learner manipulates a graph'),
  title: z.string().min(1).describe('The prompt, e.g. "Plot the growth curve"'),
  graphType: z.enum(['plot_points', 'adjust_slider', 'draw_line']).describe('Interaction mode'),
  xAxis: z.object({
    label: z.string().min(1).describe('X-axis label, e.g. "Time (days)"'),
    min: z.number().describe('X-axis minimum value'),
    max: z.number().describe('X-axis maximum value'),
    step: z.number().optional().describe('Optional tick interval'),
  }).describe('X-axis configuration'),
  yAxis: z.object({
    label: z.string().min(1).describe('Y-axis label, e.g. "Height (cm)"'),
    min: z.number().describe('Y-axis minimum value'),
    max: z.number().describe('Y-axis maximum value'),
    step: z.number().optional().describe('Optional tick interval'),
  }).describe('Y-axis configuration'),
  existingData: z.array(z.object({
    x: z.number(), y: z.number(), label: z.string().optional(),
  })).optional().describe('Pre-plotted points/lines shown to the learner'),
  targetData: z.array(z.object({
    x: z.number(), y: z.number(),
  })).min(1).describe('Correct answer positions the learner must match'),
  tolerance: z.number().min(0).describe('How close user answer must be in axis units'),
  sliders: z.array(z.object({
    id: z.string(), label: z.string().min(1),
    min: z.number(), max: z.number(), step: z.number(), defaultValue: z.number(),
  })).optional().describe('Sliders for adjust_slider mode'),
  instruction: z.string().min(1).describe('What to do, e.g. "Plot the data points"'),
  explanation: z.string().min(20).describe('Explains the correct answer. Min 20 chars.'),
  hints: z.array(z.string().min(1)).min(1).max(3).describe('Progressive hints. 1-3 required.'),
  difficulty: z.enum(['easy', 'medium', 'hard']).describe('Difficulty level'),
})

export const NumberLineScreenSchema = z.object({
  id: z.string().describe('Unique screen identifier, e.g. "nl-place-fraction"'),
  type: z.literal('number_line').describe('Screen type discriminator — learner places markers on a line/scale'),
  title: z.string().min(1).describe('The prompt, e.g. "Place 3/4 on the number line"'),
  min: z.number().describe('Left end of the number line'),
  max: z.number().describe('Right end of the number line'),
  step: z.number().describe('Tick mark interval'),
  showLabels: z.boolean().describe('Whether tick marks show their value'),
  markers: z.array(z.object({
    id: z.string().describe('Unique marker identifier'),
    correctValue: z.number().describe('Correct position value'),
    label: z.string().optional().describe('Optional marker label, e.g. "3/4"'),
    color: z.string().optional().describe('Optional marker color'),
  })).min(1).describe('Markers the learner must place. At least 1.'),
  tolerance: z.number().min(0).describe('How close placement must be'),
  displayMode: z.enum(['integer', 'decimal', 'fraction', 'custom_labels']).describe('How tick labels are formatted'),
  customLabels: z.record(z.string(), z.string()).optional().describe('Map of position→label for custom_labels mode (timelines, events)'),
  instruction: z.string().min(1).describe('What to do, e.g. "Place the marker at 3/4"'),
  explanation: z.string().min(20).describe('Explains correct placement. Min 20 chars.'),
  hints: z.array(z.string().min(1)).min(1).max(3).describe('Progressive hints. 1-3 required.'),
  difficulty: z.enum(['easy', 'medium', 'hard']).describe('Difficulty level'),
})

export const PatternBuilderScreenSchema = z.object({
  id: z.string().describe('Unique screen identifier, e.g. "pat-next-shape"'),
  type: z.literal('pattern_builder').describe('Screen type discriminator — learner predicts/constructs the next in a sequence'),
  title: z.string().min(1).describe('The prompt, e.g. "What comes next in this pattern?"'),
  sequence: z.array(z.object({
    position: z.number().int().min(1).describe('Position in sequence (1-indexed)'),
    value: z.string().min(1).describe('Value at this position — text, number, or image key'),
    revealed: z.boolean().describe('Whether this position is shown (true) or hidden for the learner to fill (false)'),
  })).min(3).describe('The pattern sequence. At least 3 items. Some revealed, some hidden.'),
  options: z.array(z.object({
    id: z.string().describe('Unique option identifier'),
    value: z.string().min(1).describe('Option value — must match a hidden position value for correct answers'),
  })).min(2).describe('Choices the learner selects from. Includes correct answers + distractors.'),
  patternType: z.enum(['visual', 'numeric', 'text']).describe('How values render — images, numbers, or text'),
  visualAssets: z.record(z.string(), z.string()).optional().describe('Map of value→imageUrl for visual mode'),
  instruction: z.string().min(1).describe('Context, e.g. "Fill in the missing items in this pattern"'),
  explanation: z.string().min(20).describe('Explains the pattern rule. Min 20 chars.'),
  hints: z.array(z.string().min(1)).min(1).max(3).describe('Progressive hints. 1-3 required.'),
  difficulty: z.enum(['easy', 'medium', 'hard']).describe('Difficulty level'),
})

export const ProcessStepperScreenSchema = z.object({
  id: z.string().describe('Unique screen identifier, e.g. "proc-oil-change"'),
  type: z.literal('process_stepper').describe('Screen type discriminator — learner builds procedures step by step'),
  title: z.string().min(1).describe('The prompt, e.g. "Put these oil change steps in order"'),
  steps: z.array(z.object({
    id: z.string().describe('Unique step identifier'),
    text: z.string().min(1).describe('Step description, e.g. "Drain the old oil"'),
    justification: z.string().optional().describe('Expected justification for this step position'),
  })).min(2).max(10).describe('Steps in correct order. 2-10 steps.'),
  requireJustification: z.boolean().describe('Whether learner must justify each step placement'),
  justificationPrompt: z.string().optional().describe('Prompt for justification input, e.g. "Why does this step come here?"'),
  instruction: z.string().min(1).describe('Context, e.g. "Arrange these steps and explain why"'),
  explanation: z.string().min(20).describe('Explains the correct order. Min 20 chars.'),
  hints: z.array(z.string().min(1)).min(1).max(3).describe('Progressive hints. 1-3 required.'),
  difficulty: z.enum(['easy', 'medium', 'hard']).describe('Difficulty level'),
})

export const SimulationScreenSchema = z.object({
  id: z.string().describe('Unique screen identifier, e.g. "sim-drop-ball"'),
  type: z.literal('simulation').describe('Screen type discriminator — learner predicts then observes a simulation'),
  title: z.string().min(1).describe('The prompt, e.g. "Which ball lands first?"'),
  scenario: z.object({
    objects: z.array(z.object({
      id: z.string(), type: z.string().min(1), label: z.string().min(1),
      x: z.number(), y: z.number(),
      properties: z.record(z.string(), z.number()).describe('Named properties like mass, velocity, temperature'),
    })).min(1).describe('Objects in the simulation scene'),
    parameters: z.array(z.object({
      id: z.string(), label: z.string().min(1),
      min: z.number(), max: z.number(), step: z.number(), defaultValue: z.number(),
      unit: z.string().optional(),
    })).optional().describe('User-adjustable parameters (sliders)'),
    rules: z.array(z.object({
      trigger: z.string().min(1), action: z.string().min(1), target: z.string().min(1),
    })).min(1).describe('Simplified cause-effect rules, e.g. trigger:"drop", action:"fall", target:"ball"'),
  }).describe('The simulation setup — objects, parameters, and rules'),
  prediction: z.object({
    question: z.string().min(1).describe('What to predict, e.g. "Which ball hits the ground first?"'),
    options: z.union([z.array(z.string().min(1)).min(2), z.literal('numeric')]).describe('Multiple choice options or "numeric" for number input'),
    correctAnswer: z.union([z.string(), z.number()]).describe('The correct prediction'),
    tolerance: z.number().optional().describe('For numeric answers — how close is acceptable'),
  }).describe('The prediction the learner must make before observing'),
  instruction: z.string().min(1).describe('Context for the simulation'),
  explanation: z.string().min(20).describe('Explains what happened and why. Min 20 chars.'),
  hints: z.array(z.string().min(1)).min(1).max(3).describe('Progressive hints. 1-3 required.'),
  difficulty: z.enum(['easy', 'medium', 'hard']).describe('Difficulty level'),
})

export const BlockCodingScreenSchema = z.object({
  id: z.string().describe('Unique screen identifier, e.g. "block-maze-nav"'),
  type: z.literal('block_coding').describe('Screen type discriminator — learner arranges pseudocode blocks'),
  title: z.string().min(1).describe('The challenge, e.g. "Navigate the robot to the flag"'),
  availableBlocks: z.array(z.object({
    id: z.string().describe('Unique block identifier'),
    text: z.string().min(1).describe('Plain-English block text, e.g. "Move forward"'),
    type: z.enum(['action', 'condition', 'loop', 'variable']).describe('Block category for color coding'),
  })).min(2).describe('Available pseudocode blocks in the toolbox'),
  correctSequence: z.array(z.string()).min(2).describe('Block IDs in the correct order'),
  goal: z.string().min(1).describe('What the program should do, e.g. "Navigate to the flag"'),
  maxBlocks: z.number().int().optional().describe('Optional max blocks the learner can use'),
  distractorBlocks: z.array(z.string()).optional().describe('Block IDs available but not in solution'),
  instruction: z.string().min(1).describe('Context for the challenge'),
  explanation: z.string().min(20).describe('Explains the correct solution. Min 20 chars.'),
  hints: z.array(z.string().min(1)).min(1).max(3).describe('Progressive hints. 1-3 required.'),
  difficulty: z.enum(['easy', 'medium', 'hard']).describe('Difficulty level'),
})

export const ScreenSchema = z
  .discriminatedUnion('type', [
    ExplanationScreenSchema,
    MultipleChoiceScreenSchema,
    FillInBlankScreenSchema,
    OrderingScreenSchema,
    CodeBlockScreenSchema,
    MatchingScreenSchema,
    CategorizationScreenSchema,
    HotspotScreenSchema,
    DiagramLabelScreenSchema,
    InteractiveGraphScreenSchema,
    NumberLineScreenSchema,
    PatternBuilderScreenSchema,
    ProcessStepperScreenSchema,
    SimulationScreenSchema,
    BlockCodingScreenSchema,
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
export type MatchingScreen = z.infer<typeof MatchingScreenSchema>
export type CategorizationScreen = z.infer<typeof CategorizationScreenSchema>
export type HotspotScreen = z.infer<typeof HotspotScreenSchema>
export type DiagramLabelScreen = z.infer<typeof DiagramLabelScreenSchema>
export type InteractiveGraphScreen = z.infer<typeof InteractiveGraphScreenSchema>
export type NumberLineScreen = z.infer<typeof NumberLineScreenSchema>
export type PatternBuilderScreen = z.infer<typeof PatternBuilderScreenSchema>
export type ProcessStepperScreen = z.infer<typeof ProcessStepperScreenSchema>
export type SimulationScreen = z.infer<typeof SimulationScreenSchema>
export type BlockCodingScreen = z.infer<typeof BlockCodingScreenSchema>
export type Screen = z.infer<typeof ScreenSchema>
export type Lesson = z.infer<typeof LessonSchema>
export type Module = z.infer<typeof ModuleSchema>
export type Course = z.infer<typeof CourseSchema>
