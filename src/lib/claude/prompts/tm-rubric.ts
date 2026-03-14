export interface RubricCriterion {
  id: string
  name: string
  description: string
  checkPrompt: string
  weight: 'critical' | 'important' | 'nice-to-have'
}

export interface RubricResult {
  criterionId: string
  passes: boolean
  details: string
  suggestions: string[]
}

export const TM_RUBRIC_CRITERIA: RubricCriterion[] = [
  // --- Critical (must pass — course is rejected if these fail) ---
  {
    id: 'one-thought-per-screen',
    name: 'One Thought Per Screen',
    description:
      'Each screen introduces at most one genuinely new concept. Practicing a previously introduced concept in a new context does not count as a new concept.',
    checkPrompt: `Review the following course JSON. For each screen, identify whether it introduces more than one genuinely new concept. A concept is "new" if it has not been explicitly taught or practiced in any prior screen within the course.

A screen that practices a previously introduced concept with a new twist does NOT count as introducing a new concept. A screen that combines two already-taught concepts into a single exercise also does NOT count.

For each screen, output:
- screen id
- new concept(s) introduced (list them)
- PASS if 0 or 1 new concepts, FAIL if 2+

At the end, provide a summary: total screens checked, total FAILs, and list all failing screen IDs.`,
    weight: 'critical',
  },
  {
    id: 'cognitive-load-contours',
    name: 'Cognitive Load Contours',
    description:
      'Difficulty varies with peaks and valleys across lessons. Not monotonically increasing, not flat. No 3+ hard screens or 3+ passive screens in a row.',
    checkPrompt: `Review the following course JSON. For each lesson, map the difficulty contour by listing each screen with its type and difficulty (for interactive screens) or "passive" (for explanation screens).

Check for these violations:
1. Three or more consecutive screens with difficulty "hard"
2. Three or more consecutive explanation-only screens with no interactive screen between them
3. A lesson where difficulty only increases and never dips (monotonic ramp)
4. A lesson where all interactive screens have the same difficulty (flat line)

For each lesson, output:
- lesson id
- screen-by-screen difficulty sequence (e.g., "passive, easy, passive, medium, hard, passive, hard")
- any violations found
- PASS or FAIL

At the end, provide a summary of all failing lessons.`,
    weight: 'critical',
  },
  {
    id: 'no-artificial-mnemonics',
    name: 'No Artificial Mnemonics',
    description:
      'No artificial memory tricks such as manufactured acronyms, forced rhymes, or "X sounds like Y" associations. All conceptual connections must be genuine and meaningful.',
    checkPrompt: `Review the following course JSON. Search all text content (titles, content, explanations, hints, option text, prompts, callouts) for artificial mnemonics.

Flag any instance of:
1. Manufactured acronyms used as memory aids (e.g., "Remember PEMDAS!", "Use the acronym SOLID to...")
2. Forced rhymes created for memorization (e.g., "i before e except after c")
3. "Sounds like" or "rhymes with" associations used as learning crutches
4. Any memory trick that creates an artificial association rather than teaching genuine understanding

Do NOT flag:
- Genuine analogies that illuminate the concept ("variables are like labeled boxes")
- Standard terminology that happens to be an acronym (e.g., "HTML" as a proper name, not a mnemonic)
- Real-world connections that naturally exist

For each instance found, output:
- screen id
- the problematic text
- why it qualifies as an artificial mnemonic

PASS if zero instances found, FAIL if any found.`,
    weight: 'critical',
  },
  {
    id: 'schema-valid',
    name: 'Schema Valid',
    description:
      'Output passes Zod CourseSchema validation. Checked programmatically, not by Claude.',
    checkPrompt: 'N/A - validated programmatically against CourseSchema from src/lib/schemas/content.ts',
    weight: 'critical',
  },

  // --- Important (should pass — auto-fix attempted) ---
  {
    id: 'weaving',
    name: 'Weaving',
    description:
      'Concepts from earlier lessons are revisited in later contexts. Topics are interleaved across lessons, not siloed into isolated topic blocks.',
    checkPrompt: `Review the following course JSON. For each concept introduced in the course, track where it first appears and where it appears again in later screens or lessons.

Evaluate:
1. Are concepts revisited in later lessons (not just within the same lesson)?
2. Do lessons combine concepts from multiple topic areas, or is each lesson strictly about one topic?
3. Are there any concepts taught in lesson N that are never referenced again in lessons N+1 through the end?

Output:
- A list of key concepts and the screens/lessons where they appear
- Whether the course shows interleaving (concepts woven across lessons) or siloing (each lesson = one topic, never revisited)
- Any "orphaned" concepts that are taught once and never revisited

PASS if concepts are meaningfully revisited across lessons and topics are interleaved. FAIL if concepts are strictly siloed by lesson/module with no cross-referencing.`,
    weight: 'important',
  },
  {
    id: 'knowledge-importing',
    name: 'Knowledge Importing',
    description:
      'The learner\'s existing knowledge is explicitly referenced and built upon. The course connects new concepts to what the learner already knows.',
    checkPrompt: `Review the following course JSON alongside the learner interview context (if provided). Check whether the course explicitly builds on the learner's existing knowledge.

Look for:
1. Explicit references to what the learner already knows (e.g., "You already know how to...", "Since you're familiar with...")
2. Analogies that connect new concepts to the learner's confirmed prior knowledge or background
3. Concepts that are NOT over-explained when the learner's background implies they would already understand them (unconscious import)

Flag as problems:
- New concepts introduced without any connection to prior knowledge
- Over-explanation of things the learner's background suggests they already know
- Generic teaching that ignores the learner's specific context

PASS if the course demonstrates at least 3 clear instances of building on learner knowledge. FAIL if the course teaches as if the learner has zero background, ignoring interview context.`,
    weight: 'important',
  },
  {
    id: 'hint-quality',
    name: 'Hint Quality',
    description:
      'Hints are progressive (gentle nudge to nearly-revealing) and guide thinking rather than just restating the question or giving away the answer.',
    checkPrompt: `Review the following course JSON. For every screen that has hints, evaluate the hint sequence.

Check each hint sequence for:
1. Progressive revelation: Does the first hint give a gentle directional nudge? Does the last hint nearly reveal the answer without fully giving it away?
2. Thinking guidance: Do hints guide the learner's reasoning process, or do they just restate the question or say "try again"?
3. Specificity: Do hints address WHY a learner might be stuck, not just point at the correct answer?
4. Non-revealing first hint: The first hint should NOT make the answer obvious.
5. Useful last hint: The last hint should be specific enough that a struggling learner can work out the answer.

For each screen with hints, output:
- screen id
- the hints listed
- assessment of progression quality (good/weak/bad)
- any specific issues

PASS if 80%+ of hint sequences are well-structured and progressive. FAIL if fewer than 80% meet the standard.`,
    weight: 'important',
  },
  {
    id: 'reframing',
    name: 'Reframing',
    description:
      'At least one concept in the course is explained in a non-standard, learner-friendly way that differs from textbook convention.',
    checkPrompt: `Review the following course JSON. Identify any explanations that reframe a concept in a non-standard, learner-friendly way — describing it differently from how a textbook would.

A valid reframe:
- Uses a novel analogy, metaphor, or framing that genuinely clarifies the concept
- Describes the concept from the learner's perspective rather than the formal definition
- Would make a confused learner say "oh, THAT'S what it means"

NOT a valid reframe:
- Simply stating the textbook definition in simpler words (that is simplification, not reframing)
- Adding "it's like" to a surface-level comparison that doesn't illuminate the concept

List each reframe found with:
- screen id
- the reframed explanation
- what the standard/textbook explanation would be
- why this counts as a genuine reframe

PASS if at least 1 genuine reframe is found. FAIL if all explanations follow standard textbook conventions.`,
    weight: 'important',
  },

  // --- Nice-to-have (logged but not blocked on) ---
  {
    id: 'meta-learning',
    name: 'Meta-Learning',
    description:
      'At least one screen raises consciousness about the learning process itself, helping the learner see patterns in their own growing capability.',
    checkPrompt: `Review the following course JSON. Identify any screens that raise the learner's consciousness about their own learning process.

Valid meta-learning moments:
- Pointing out a pattern the learner has developed: "Notice how you're now doing X without thinking about it?"
- Separating domain knowledge from notation: "The concept of a loop exists independently of Python syntax"
- Reflecting on growth: "Three screens ago, this would have been difficult. Now it's automatic."
- Callout boxes with insights about how learning works

NOT valid meta-learning:
- Generic encouragement ("Great job!")
- Simple progress markers ("You've completed 5 screens")

List each meta-learning moment found with:
- screen id
- the relevant text
- why it qualifies

PASS if at least 1 genuine meta-learning moment is found. FAIL if none found.`,
    weight: 'nice-to-have',
  },
  {
    id: 'masked-repetition',
    name: 'Masked Repetition',
    description:
      'Key concepts appear in varied contexts across multiple lessons without explicit "review" framing. Repetition is disguised as forward progress.',
    checkPrompt: `Review the following course JSON. Identify concepts that appear in multiple lessons and evaluate whether the repetition is masked or explicit.

Check for:
1. Concepts practiced across 2+ lessons in different contexts (masked repetition — good)
2. Explicit review language: "let's review," "as we learned before," "remember when we covered" (unmasked — bad)
3. Copy-pasted or near-identical explanations of the same concept (unmasked — bad)
4. Exercises that require a previously taught skill but frame it as part of a new challenge (masked — good)

Output:
- Concepts that appear in multiple lessons, with screen IDs
- Whether each recurrence is masked (new context, no review language) or unmasked (explicit review, repeated explanation)
- Any instances of explicit review language found

PASS if key concepts recur across lessons AND the repetition is predominantly masked (no "let's review" language, varied contexts). FAIL if repetition is explicitly framed as review, or if key concepts never recur.`,
    weight: 'nice-to-have',
  },
]
