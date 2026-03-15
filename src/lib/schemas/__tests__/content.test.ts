import { describe, it, expect } from 'vitest'
import {
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
  ScreenSchema,
} from '@/lib/schemas/content'

function makeExplanation(overrides = {}) {
  return {
    id: 'explain-1',
    type: 'explanation' as const,
    title: 'What is a Variable?',
    content: 'A variable is a named container for storing data values in memory.',
    callout: 'Did you know? Variables are like labeled boxes!',
    ...overrides,
  }
}

function makeMultipleChoice(overrides = {}) {
  return {
    id: 'mc-1',
    type: 'multiple_choice' as const,
    title: 'Which of these is a string?',
    options: [
      { id: 'a', text: 'Hello World', isCorrect: true },
      { id: 'b', text: '42', isCorrect: false },
      { id: 'c', text: 'true', isCorrect: false },
      { id: 'd', text: '3.14', isCorrect: false },
    ],
    explanation: 'Hello World is a string because it is wrapped in quotes.',
    hints: ['Think about what type uses quotes'],
    difficulty: 'easy' as const,
    ...overrides,
  }
}

function makeFillInBlank(overrides = {}) {
  return {
    id: 'fib-1',
    type: 'fill_in_blank' as const,
    title: 'Complete the Code',
    prompt: 'A {{blank}} loop runs while a condition is {{blank}}.',
    blanks: [
      { id: 'blank-1', acceptedAnswers: ['while', 'While'], caseSensitive: false },
      { id: 'blank-2', acceptedAnswers: ['true', 'True'], caseSensitive: false },
    ],
    explanation: 'A while loop continues executing as long as the condition remains true.',
    hints: ['This keyword starts a conditional loop'],
    difficulty: 'medium' as const,
    ...overrides,
  }
}

function makeOrdering(overrides = {}) {
  return {
    id: 'order-1',
    type: 'ordering' as const,
    title: 'Arrange these steps in the correct order',
    items: [
      { id: 'step-1', text: 'Declare the variable' },
      { id: 'step-2', text: 'Assign a value' },
      { id: 'step-3', text: 'Use the variable' },
      { id: 'step-4', text: 'Print the result' },
    ],
    correctOrder: ['step-1', 'step-2', 'step-3', 'step-4'],
    explanation: 'You must declare a variable before assigning and using it in your code.',
    hints: ['What must happen before you can use a variable?'],
    difficulty: 'easy' as const,
    ...overrides,
  }
}

function makeCodeBlock(overrides = {}) {
  return {
    id: 'code-1',
    type: 'code_block' as const,
    title: 'Write a Function to Add Two Numbers',
    language: 'python',
    starterCode: '# Write your function below\ndef add(a, b):\n  pass',
    testCases: [
      { input: 'add(2, 3)', expectedOutput: '5' },
      { input: 'add(10, 20)', expectedOutput: '30' },
    ],
    explanation: 'The function should return the sum of the two arguments using the + operator.',
    hints: ['Use the + operator', 'The function should return a + b'],
    difficulty: 'easy' as const,
    ...overrides,
  }
}

describe('ExplanationScreenSchema', () => {
  it('parses a valid explanation screen', () => {
    const result = ExplanationScreenSchema.safeParse(makeExplanation())
    expect(result.success).toBe(true)
  })

  it('parses without optional callout field', () => {
    const result = ExplanationScreenSchema.safeParse(makeExplanation({ callout: undefined }))
    expect(result.success).toBe(true)
  })

  it('fails when content is missing', () => {
    const { content: _content, ...noContent } = makeExplanation()
    const result = ExplanationScreenSchema.safeParse(noContent)
    expect(result.success).toBe(false)
  })

  it('fails when content is too short (< 20 chars)', () => {
    const result = ExplanationScreenSchema.safeParse(makeExplanation({ content: 'Too short.' }))
    expect(result.success).toBe(false)
  })

  it('edge case: content exactly 20 characters passes', () => {
    const result = ExplanationScreenSchema.safeParse(
      makeExplanation({ content: '12345678901234567890' })
    )
    expect(result.success).toBe(true)
  })
})

describe('MultipleChoiceScreenSchema', () => {
  it('parses a valid multiple choice screen with 4 options', () => {
    const result = MultipleChoiceScreenSchema.safeParse(makeMultipleChoice())
    expect(result.success).toBe(true)
  })

  it('fails when options array is missing', () => {
    const { options: _options, ...noOptions } = makeMultipleChoice()
    const result = MultipleChoiceScreenSchema.safeParse(noOptions)
    expect(result.success).toBe(false)
  })

  it('fails when explanation is too short (< 20 chars)', () => {
    const result = MultipleChoiceScreenSchema.safeParse(
      makeMultipleChoice({ explanation: 'Too short.' })
    )
    expect(result.success).toBe(false)
  })

  it('edge case: exactly 2 options (minimum) passes', () => {
    const result = MultipleChoiceScreenSchema.safeParse(
      makeMultipleChoice({
        options: [
          { id: 'a', text: 'Option A', isCorrect: true },
          { id: 'b', text: 'Option B', isCorrect: false },
        ],
      })
    )
    expect(result.success).toBe(true)
  })

  it('fails when only 1 option is provided (below minimum)', () => {
    const result = MultipleChoiceScreenSchema.safeParse(
      makeMultipleChoice({
        options: [{ id: 'a', text: 'Only option', isCorrect: true }],
      })
    )
    expect(result.success).toBe(false)
  })
})

describe('FillInBlankScreenSchema', () => {
  it('parses a valid fill-in-blank screen', () => {
    const result = FillInBlankScreenSchema.safeParse(makeFillInBlank())
    expect(result.success).toBe(true)
  })

  it('fails when blanks array is missing', () => {
    const { blanks: _blanks, ...noBlanks } = makeFillInBlank()
    const result = FillInBlankScreenSchema.safeParse(noBlanks)
    expect(result.success).toBe(false)
  })

  it('fails when prompt is missing', () => {
    const { prompt: _prompt, ...noPrompt } = makeFillInBlank()
    const result = FillInBlankScreenSchema.safeParse(noPrompt)
    expect(result.success).toBe(false)
  })

  it('edge case: exactly 1 blank (minimum) passes', () => {
    const result = FillInBlankScreenSchema.safeParse(
      makeFillInBlank({
        prompt: 'A {{blank}} loop runs.',
        blanks: [{ id: 'blank-1', acceptedAnswers: ['while'], caseSensitive: false }],
      })
    )
    expect(result.success).toBe(true)
  })

  it('fails when blanks array is empty', () => {
    const result = FillInBlankScreenSchema.safeParse(makeFillInBlank({ blanks: [] }))
    expect(result.success).toBe(false)
  })
})

describe('OrderingScreenSchema', () => {
  it('parses a valid ordering screen with 4 items', () => {
    const result = OrderingScreenSchema.safeParse(makeOrdering())
    expect(result.success).toBe(true)
  })

  it('fails when correctOrder is missing', () => {
    const { correctOrder: _correctOrder, ...noOrder } = makeOrdering()
    const result = OrderingScreenSchema.safeParse(noOrder)
    expect(result.success).toBe(false)
  })

  it('fails when items array is missing', () => {
    const { items: _items, ...noItems } = makeOrdering()
    const result = OrderingScreenSchema.safeParse(noItems)
    expect(result.success).toBe(false)
  })

  it('edge case: exactly 2 items (minimum) passes', () => {
    const result = OrderingScreenSchema.safeParse(
      makeOrdering({
        items: [
          { id: 'step-1', text: 'First step' },
          { id: 'step-2', text: 'Second step' },
        ],
        correctOrder: ['step-1', 'step-2'],
      })
    )
    expect(result.success).toBe(true)
  })

  it('fails when only 1 item is provided (below minimum)', () => {
    const result = OrderingScreenSchema.safeParse(
      makeOrdering({
        items: [{ id: 'step-1', text: 'Only step' }],
        correctOrder: ['step-1'],
      })
    )
    expect(result.success).toBe(false)
  })
})

describe('CodeBlockScreenSchema', () => {
  it('parses a valid code block screen', () => {
    const result = CodeBlockScreenSchema.safeParse(makeCodeBlock())
    expect(result.success).toBe(true)
  })

  it('fails when testCases is missing', () => {
    const { testCases: _testCases, ...noTestCases } = makeCodeBlock()
    const result = CodeBlockScreenSchema.safeParse(noTestCases)
    expect(result.success).toBe(false)
  })

  it('fails when testCases is empty array', () => {
    const result = CodeBlockScreenSchema.safeParse(makeCodeBlock({ testCases: [] }))
    expect(result.success).toBe(false)
  })

  it('edge case: exactly 1 test case (minimum) passes', () => {
    const result = CodeBlockScreenSchema.safeParse(
      makeCodeBlock({
        testCases: [{ input: 'add(1, 2)', expectedOutput: '3' }],
      })
    )
    expect(result.success).toBe(true)
  })

  it('fails when language is missing', () => {
    const { language: _language, ...noLanguage } = makeCodeBlock()
    const result = CodeBlockScreenSchema.safeParse(noLanguage)
    expect(result.success).toBe(false)
  })
})

function makeMatching(overrides = {}) {
  return {
    id: 'match-1',
    type: 'matching' as const,
    title: 'Match each tool to its purpose',
    pairs: [
      { id: 'pair-1', left: 'Wrench', right: 'Tighten bolts' },
      { id: 'pair-2', left: 'Screwdriver', right: 'Drive screws' },
      { id: 'pair-3', left: 'Hammer', right: 'Drive nails' },
      { id: 'pair-4', left: 'Pliers', right: 'Grip objects' },
    ],
    instruction: 'Match each tool to what it does',
    explanation: 'Each tool is designed for a specific mechanical task based on its shape and mechanism.',
    hints: ['Think about the shape of each tool'],
    difficulty: 'easy' as const,
    ...overrides,
  }
}

describe('MatchingScreenSchema', () => {
  it('parses a valid matching screen with 4 pairs', () => {
    const result = MatchingScreenSchema.safeParse(makeMatching())
    expect(result.success).toBe(true)
  })

  it('parses without optional instruction field', () => {
    const result = MatchingScreenSchema.safeParse(makeMatching({ instruction: undefined }))
    expect(result.success).toBe(true)
  })

  it('fails when pairs array is missing', () => {
    const { pairs: _pairs, ...noPairs } = makeMatching()
    const result = MatchingScreenSchema.safeParse(noPairs)
    expect(result.success).toBe(false)
  })

  it('fails when only 1 pair is provided (below minimum)', () => {
    const result = MatchingScreenSchema.safeParse(
      makeMatching({
        pairs: [{ id: 'pair-1', left: 'Wrench', right: 'Tighten bolts' }],
      })
    )
    expect(result.success).toBe(false)
  })

  it('edge case: exactly 2 pairs (minimum) passes', () => {
    const result = MatchingScreenSchema.safeParse(
      makeMatching({
        pairs: [
          { id: 'pair-1', left: 'Wrench', right: 'Tighten bolts' },
          { id: 'pair-2', left: 'Screwdriver', right: 'Drive screws' },
        ],
      })
    )
    expect(result.success).toBe(true)
  })

  it('edge case: exactly 8 pairs (maximum) passes', () => {
    const pairs = Array.from({ length: 8 }, (_, i) => ({
      id: `pair-${i + 1}`,
      left: `Left ${i + 1}`,
      right: `Right ${i + 1}`,
    }))
    const result = MatchingScreenSchema.safeParse(makeMatching({ pairs }))
    expect(result.success).toBe(true)
  })

  it('fails when more than 8 pairs are provided', () => {
    const pairs = Array.from({ length: 9 }, (_, i) => ({
      id: `pair-${i + 1}`,
      left: `Left ${i + 1}`,
      right: `Right ${i + 1}`,
    }))
    const result = MatchingScreenSchema.safeParse(makeMatching({ pairs }))
    expect(result.success).toBe(false)
  })
})

function makeCategorization(overrides = {}) {
  return {
    id: 'cat-1', type: 'categorization' as const, title: 'Sort these tools',
    categories: [{ id: 'hand', label: 'Hand Tools' }, { id: 'power', label: 'Power Tools' }],
    items: [
      { id: 'i1', text: 'Wrench', categoryId: 'hand' },
      { id: 'i2', text: 'Screwdriver', categoryId: 'hand' },
      { id: 'i3', text: 'Drill', categoryId: 'power' },
      { id: 'i4', text: 'Circular Saw', categoryId: 'power' },
    ],
    instruction: 'Sort by tool type', explanation: 'Hand tools are manual, power tools use electricity.',
    hints: ['Think about what needs batteries'], difficulty: 'easy' as const, ...overrides,
  }
}

function makeHotspot(overrides = {}) {
  return {
    id: 'hot-1', type: 'hotspot' as const, title: 'Find the oil filter',
    imageUrl: '/images/engine.png', imageAlt: 'Engine bay',
    hotspots: [
      { id: 'hs1', x: 30, y: 40, width: 15, height: 15, label: 'Oil filter' },
      { id: 'hs2', x: 60, y: 50, width: 15, height: 15, label: 'Air filter' },
    ],
    correctHotspotIds: ['hs1'], selectionMode: 'single' as const,
    instruction: 'Click on the oil filter', explanation: 'The oil filter is located near the engine block.',
    hints: ['Look near the bottom'], difficulty: 'easy' as const, ...overrides,
  }
}

function makeDiagramLabel(overrides = {}) {
  return {
    id: 'diag-1', type: 'diagram_label' as const, title: 'Label the engine parts',
    imageUrl: '/images/engine-diagram.png', imageAlt: 'Engine diagram',
    labels: [
      { id: 'l1', text: 'Piston', targetX: 30, targetY: 40 },
      { id: 'l2', text: 'Crankshaft', targetX: 60, targetY: 70 },
    ],
    instruction: 'Drag labels to correct positions', explanation: 'The piston sits above the crankshaft.',
    hints: ['Pistons move up and down'], difficulty: 'medium' as const, ...overrides,
  }
}

function makeInteractiveGraph(overrides = {}) {
  return {
    id: 'graph-1', type: 'interactive_graph' as const, title: 'Plot the data',
    graphType: 'plot_points' as const,
    xAxis: { label: 'Time (s)', min: 0, max: 10 },
    yAxis: { label: 'Height (m)', min: 0, max: 50 },
    targetData: [{ x: 2, y: 10 }, { x: 5, y: 30 }], tolerance: 1,
    instruction: 'Plot the data points', explanation: 'The object rises over time.',
    hints: ['Start at t=2'], difficulty: 'medium' as const, ...overrides,
  }
}

function makeNumberLine(overrides = {}) {
  return {
    id: 'nl-1', type: 'number_line' as const, title: 'Place 3/4',
    min: 0, max: 1, step: 0.25, showLabels: true,
    markers: [{ id: 'm1', correctValue: 0.75, label: '3/4' }],
    tolerance: 0.05, displayMode: 'fraction' as const,
    instruction: 'Place the marker at 3/4', explanation: '3/4 is between 1/2 and 1.',
    hints: ['It is more than half'], difficulty: 'easy' as const, ...overrides,
  }
}

function makePatternBuilder(overrides = {}) {
  return {
    id: 'pat-1', type: 'pattern_builder' as const, title: 'Complete the pattern',
    sequence: [
      { position: 1, value: '2', revealed: true },
      { position: 2, value: '4', revealed: true },
      { position: 3, value: '6', revealed: false },
    ],
    options: [{ id: 'o1', value: '6' }, { id: 'o2', value: '8' }, { id: 'o3', value: '5' }],
    patternType: 'numeric' as const, instruction: 'What comes next?',
    explanation: 'The pattern adds 2 each time.', hints: ['Look at the difference'],
    difficulty: 'easy' as const, ...overrides,
  }
}

function makeProcessStepper(overrides = {}) {
  return {
    id: 'proc-1', type: 'process_stepper' as const, title: 'Order the oil change steps',
    steps: [
      { id: 's1', text: 'Drain old oil', justification: 'Must remove old oil first' },
      { id: 's2', text: 'Replace filter', justification: 'Filter must be changed with fresh oil' },
      { id: 's3', text: 'Add new oil', justification: 'Fill with correct amount of new oil' },
    ],
    requireJustification: false, instruction: 'Put in correct order',
    explanation: 'You must drain before adding new oil.', hints: ['What comes first?'],
    difficulty: 'easy' as const, ...overrides,
  }
}

function makeSimulation(overrides = {}) {
  return {
    id: 'sim-1', type: 'simulation' as const, title: 'Which ball lands first?',
    scenario: {
      objects: [
        { id: 'ball1', type: 'circle', label: 'Heavy Ball', x: 100, y: 50, properties: { mass: 10 } },
        { id: 'ball2', type: 'circle', label: 'Light Ball', x: 300, y: 50, properties: { mass: 1 } },
      ],
      rules: [{ trigger: 'drop', action: 'fall', target: 'ball1' }, { trigger: 'drop', action: 'fall', target: 'ball2' }],
    },
    prediction: { question: 'Which ball lands first?', options: ['Heavy Ball', 'Light Ball', 'Same time'], correctAnswer: 'Same time' },
    instruction: 'Predict then observe', explanation: 'All objects fall at the same rate in a vacuum.',
    hints: ['Think about gravity'], difficulty: 'medium' as const, ...overrides,
  }
}

function makeBlockCoding(overrides = {}) {
  return {
    id: 'block-1', type: 'block_coding' as const, title: 'Navigate to the flag',
    availableBlocks: [
      { id: 'b1', text: 'Move forward', type: 'action' as const },
      { id: 'b2', text: 'Turn right', type: 'action' as const },
      { id: 'b3', text: 'Turn left', type: 'action' as const },
    ],
    correctSequence: ['b1', 'b2', 'b1'], goal: 'Reach the flag',
    instruction: 'Build a program', explanation: 'Move forward, turn right, then move forward again.',
    hints: ['Start by moving forward'], difficulty: 'easy' as const, ...overrides,
  }
}

describe('CategorizationScreenSchema', () => {
  it('parses a valid categorization screen', () => {
    expect(CategorizationScreenSchema.safeParse(makeCategorization()).success).toBe(true)
  })
  it('fails with less than 2 categories', () => {
    expect(CategorizationScreenSchema.safeParse(makeCategorization({
      categories: [{ id: 'one', label: 'Only' }],
    })).success).toBe(false)
  })
})

describe('HotspotScreenSchema', () => {
  it('parses a valid hotspot screen', () => {
    expect(HotspotScreenSchema.safeParse(makeHotspot()).success).toBe(true)
  })
  it('fails with less than 2 hotspots', () => {
    expect(HotspotScreenSchema.safeParse(makeHotspot({
      hotspots: [{ id: 'hs1', x: 30, y: 40, width: 15, height: 15, label: 'Only one' }],
    })).success).toBe(false)
  })
})

describe('DiagramLabelScreenSchema', () => {
  it('parses a valid diagram_label screen', () => {
    expect(DiagramLabelScreenSchema.safeParse(makeDiagramLabel()).success).toBe(true)
  })
  it('fails with less than 2 labels', () => {
    expect(DiagramLabelScreenSchema.safeParse(makeDiagramLabel({
      labels: [{ id: 'l1', text: 'Only', targetX: 50, targetY: 50 }],
    })).success).toBe(false)
  })
})

describe('InteractiveGraphScreenSchema', () => {
  it('parses a valid interactive_graph screen', () => {
    expect(InteractiveGraphScreenSchema.safeParse(makeInteractiveGraph()).success).toBe(true)
  })
  it('fails with no targetData', () => {
    expect(InteractiveGraphScreenSchema.safeParse(makeInteractiveGraph({ targetData: [] })).success).toBe(false)
  })
})

describe('NumberLineScreenSchema', () => {
  it('parses a valid number_line screen', () => {
    expect(NumberLineScreenSchema.safeParse(makeNumberLine()).success).toBe(true)
  })
  it('fails with no markers', () => {
    expect(NumberLineScreenSchema.safeParse(makeNumberLine({ markers: [] })).success).toBe(false)
  })
})

describe('PatternBuilderScreenSchema', () => {
  it('parses a valid pattern_builder screen', () => {
    expect(PatternBuilderScreenSchema.safeParse(makePatternBuilder()).success).toBe(true)
  })
  it('fails with less than 3 sequence items', () => {
    expect(PatternBuilderScreenSchema.safeParse(makePatternBuilder({
      sequence: [{ position: 1, value: '2', revealed: true }, { position: 2, value: '4', revealed: false }],
    })).success).toBe(false)
  })
})

describe('ProcessStepperScreenSchema', () => {
  it('parses a valid process_stepper screen', () => {
    expect(ProcessStepperScreenSchema.safeParse(makeProcessStepper()).success).toBe(true)
  })
  it('fails with less than 2 steps', () => {
    expect(ProcessStepperScreenSchema.safeParse(makeProcessStepper({
      steps: [{ id: 's1', text: 'Only step' }],
    })).success).toBe(false)
  })
})

describe('SimulationScreenSchema', () => {
  it('parses a valid simulation screen', () => {
    expect(SimulationScreenSchema.safeParse(makeSimulation()).success).toBe(true)
  })
  it('fails with no rules', () => {
    expect(SimulationScreenSchema.safeParse(makeSimulation({
      scenario: { objects: [{ id: 'b', type: 'circle', label: 'B', x: 0, y: 0, properties: {} }], rules: [] },
    })).success).toBe(false)
  })
})

describe('BlockCodingScreenSchema', () => {
  it('parses a valid block_coding screen', () => {
    expect(BlockCodingScreenSchema.safeParse(makeBlockCoding()).success).toBe(true)
  })
  it('fails with less than 2 blocks', () => {
    expect(BlockCodingScreenSchema.safeParse(makeBlockCoding({
      availableBlocks: [{ id: 'b1', text: 'Only', type: 'action' }],
    })).success).toBe(false)
  })
})

describe('ScreenSchema (discriminated union)', () => {
  it('accepts a valid explanation screen', () => {
    expect(ScreenSchema.safeParse(makeExplanation()).success).toBe(true)
  })

  it('accepts a valid multiple_choice screen', () => {
    expect(ScreenSchema.safeParse(makeMultipleChoice()).success).toBe(true)
  })

  it('accepts a valid fill_in_blank screen', () => {
    expect(ScreenSchema.safeParse(makeFillInBlank()).success).toBe(true)
  })

  it('accepts a valid ordering screen', () => {
    expect(ScreenSchema.safeParse(makeOrdering()).success).toBe(true)
  })

  it('accepts a valid code_block screen', () => {
    expect(ScreenSchema.safeParse(makeCodeBlock()).success).toBe(true)
  })

  it('accepts a valid matching screen', () => {
    expect(ScreenSchema.safeParse(makeMatching()).success).toBe(true)
  })

  it('accepts a valid categorization screen', () => {
    expect(ScreenSchema.safeParse(makeCategorization()).success).toBe(true)
  })

  it('accepts a valid hotspot screen', () => {
    expect(ScreenSchema.safeParse(makeHotspot()).success).toBe(true)
  })

  it('accepts a valid diagram_label screen', () => {
    expect(ScreenSchema.safeParse(makeDiagramLabel()).success).toBe(true)
  })

  it('accepts a valid interactive_graph screen', () => {
    expect(ScreenSchema.safeParse(makeInteractiveGraph()).success).toBe(true)
  })

  it('accepts a valid number_line screen', () => {
    expect(ScreenSchema.safeParse(makeNumberLine()).success).toBe(true)
  })

  it('accepts a valid pattern_builder screen', () => {
    expect(ScreenSchema.safeParse(makePatternBuilder()).success).toBe(true)
  })

  it('accepts a valid process_stepper screen', () => {
    expect(ScreenSchema.safeParse(makeProcessStepper()).success).toBe(true)
  })

  it('accepts a valid simulation screen', () => {
    expect(ScreenSchema.safeParse(makeSimulation()).success).toBe(true)
  })

  it('accepts a valid block_coding screen', () => {
    expect(ScreenSchema.safeParse(makeBlockCoding()).success).toBe(true)
  })

  it('rejects an unknown type', () => {
    const result = ScreenSchema.safeParse({ id: 'x', type: 'unknown_type', title: 'Test' })
    expect(result.success).toBe(false)
  })
})
