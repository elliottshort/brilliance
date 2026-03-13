# Brilliance Course Authoring Guide

A complete reference for LLMs (and humans) authoring courses for the Brilliance learning platform. This document contains everything you need to produce valid course JSON without seeing the codebase.

**File path convention:** `src/content/courses/{course-id}/course.json`

---

## Table of Contents

1. [Quick Start](#1-quick-start)
2. [Schema Reference](#2-schema-reference)
3. [Pedagogical Guidelines](#3-pedagogical-guidelines)
4. [Content Quality Checklist](#4-content-quality-checklist)
5. [System Prompt for LLMs](#5-system-prompt-for-llms)
6. [Validation](#6-validation)

---

## 1. Quick Start

Here's a minimal valid course: one module, one lesson, three screens. Copy this, modify it, and you have a working course.

```json
{
  "id": "mental-math-101",
  "title": "Mental Math Tricks",
  "description": "Learn to multiply, divide, and estimate faster than you can reach for a calculator. By the end, you'll impress yourself with what your brain can do unaided.",
  "modules": [
    {
      "id": "module-multiply",
      "title": "Multiplication Shortcuts",
      "description": "Discover patterns that make multiplying large numbers feel effortless.",
      "lessons": [
        {
          "id": "lesson-multiply-by-11",
          "title": "The 11s Trick",
          "description": "A simple pattern lets you multiply any two-digit number by 11 in your head.",
          "screens": [
            {
              "id": "hook-11s",
              "type": "explanation",
              "title": "Can You Beat a Calculator?",
              "content": "What's 34 x 11?\n\nMost people reach for their phone. But there's a trick that gives you the answer in about two seconds, no calculator needed.\n\nThe secret: **split, add, insert**. Take the two digits, add them together, and slide the sum between them.\n\n34 → 3 _ 4 → 3 (3+4) 4 → **374**\n\nThat's it. Let's practice.",
              "callout": "This trick works for any two-digit number where the digits sum to 9 or less. We'll handle the carry case in a later screen."
            },
            {
              "id": "mc-11-basic",
              "type": "multiple_choice",
              "title": "What is 53 x 11?",
              "options": [
                { "id": "opt-a", "text": "__(5)(8)(3) = 583__", "isCorrect": true },
                { "id": "opt-b", "text": "__(5)(3)(3) = 533__", "isCorrect": false },
                { "id": "opt-c", "text": "__(5)(5)(3) = 553__", "isCorrect": false },
                { "id": "opt-d", "text": "__(5)(1)(3) = 513__", "isCorrect": false }
              ],
              "explanation": "Split the digits of 53: 5 and 3. Add them: 5 + 3 = 8. Insert the 8 between the original digits: 5-8-3. The answer is 583. You can verify: 53 x 11 = 53 x 10 + 53 = 530 + 53 = 583.",
              "hints": [
                "Split the digits of 53 and add them together.",
                "5 + 3 = 8. Now place that 8 between the original digits."
              ],
              "difficulty": "easy"
            },
            {
              "id": "fib-11-practice",
              "type": "fill_in_blank",
              "title": "Complete the Calculation",
              "prompt": "Using the 11s trick: 72 x 11 = {{blank}}",
              "blanks": [
                {
                  "id": "blank-1",
                  "acceptedAnswers": ["792"],
                  "caseSensitive": false
                }
              ],
              "explanation": "Split 72 into 7 and 2. Add them: 7 + 2 = 9. Insert between the digits: 7-9-2. The answer is 792. Quick check: 72 x 10 = 720, plus 72 = 792.",
              "hints": [
                "Split the digits and add: 7 + 2 = ?",
                "The middle digit is 9. Now form the three-digit number."
              ],
              "difficulty": "easy"
            }
          ]
        }
      ]
    }
  ]
}
```

That's a valid course. The rest of this document explains every field, every constraint, and how to write content that actually teaches.

---

## 2. Schema Reference

### Hierarchy

```
Course
 └─ Module[]    (1+ modules per course, recommended 2-8)
     └─ Lesson[]   (1+ lessons per module, recommended 2-6)
         └─ Screen[]  (1+ screens per lesson, recommended 3-8)
```

### Course

| Field | Type | Required | Constraints | Description |
|-------|------|----------|-------------|-------------|
| `id` | string | yes | unique | Course identifier, used in URLs. e.g. `"python-101"` |
| `title` | string | yes | min 1 char | Course title shown on cards and headers. |
| `description` | string | yes | min 1 char | 2-3 sentence summary of what the learner will achieve. |
| `coverImage` | string | no | | URL or path to a cover image. e.g. `"/images/python-cover.png"` |
| `modules` | Module[] | yes | min 1 | Ordered list of modules. |

### Module

| Field | Type | Required | Constraints | Description |
|-------|------|----------|-------------|-------------|
| `id` | string | yes | unique within course | Module identifier. e.g. `"module-basics"` |
| `title` | string | yes | min 1 char | Module title in navigation. |
| `description` | string | yes | min 1 char | 1-2 sentence module summary. |
| `lessons` | Lesson[] | yes | min 1 | Ordered list of lessons. |

### Lesson

| Field | Type | Required | Constraints | Description |
|-------|------|----------|-------------|-------------|
| `id` | string | yes | unique within course | Lesson identifier. e.g. `"lesson-variables-intro"` |
| `title` | string | yes | min 1 char | Lesson title in navigation and cards. |
| `description` | string | yes | min 1 char | 1-2 sentence lesson summary. |
| `screens` | Screen[] | yes | min 1 (validator requires 2+) | Ordered sequence of screens. Start with an explanation screen. |

### Screen (Discriminated Union)

Every screen has a `type` field that determines its shape. There are five types:

---

#### Screen Type 1: `explanation`

A read-only content screen. No interaction required.

| Field | Type | Required | Constraints | Description |
|-------|------|----------|-------------|-------------|
| `id` | string | yes | unique within course | Screen identifier. e.g. `"intro-1"` |
| `type` | `"explanation"` | yes | literal | Discriminator. |
| `title` | string | yes | min 1 char | Screen heading. e.g. `"What is a Variable?"` |
| `content` | string | yes | min 20 chars | Markdown-formatted text. Supports headings, bold, italic, code blocks, lists. Aim for 2-4 short paragraphs. |
| `callout` | string | no | | Highlighted tip, warning, or fun fact. Rendered in a colored box. |

```json
{
  "id": "explain-variables",
  "type": "explanation",
  "title": "What is a Variable?",
  "content": "Think of a variable as a labeled box. You give it a name, and you put a value inside.\n\nIn Python, creating a variable looks like this:\n\n```python\nage = 25\nname = \"Alice\"\n```\n\nThe `=` sign doesn't mean \"equals\" here. It means \"store this value in this box.\"",
  "callout": "Variable names in Python are case-sensitive. `age` and `Age` are two different boxes."
}
```

---

#### Screen Type 2: `multiple_choice`

Learner picks one correct answer from a list.

| Field | Type | Required | Constraints | Description |
|-------|------|----------|-------------|-------------|
| `id` | string | yes | unique within course | Screen identifier. |
| `type` | `"multiple_choice"` | yes | literal | Discriminator. |
| `title` | string | yes | min 1 char | The question or prompt. |
| `options` | Option[] | yes | 2-6 items, exactly 1 correct | Answer options. |
| `options[].id` | string | yes | unique within screen | Option identifier. e.g. `"opt-a"` |
| `options[].text` | string | yes | min 1 char | Answer text shown to learner. |
| `options[].isCorrect` | boolean | yes | exactly 1 true | Whether this is the correct answer. |
| `explanation` | string | yes | min 20 chars | Shown after answering. Explains why the correct answer is right and why distractors are wrong. |
| `hints` | string[] | yes | 1-3 items, each min 1 char | Progressive hints. First is gentle, last is nearly the answer. |
| `difficulty` | `"easy"` \| `"medium"` \| `"hard"` | yes | | `easy` = recall, `medium` = application, `hard` = analysis. |

```json
{
  "id": "mc-data-types",
  "type": "multiple_choice",
  "title": "Which of these values is a string in Python?",
  "options": [
    { "id": "opt-a", "text": "42", "isCorrect": false },
    { "id": "opt-b", "text": "True", "isCorrect": false },
    { "id": "opt-c", "text": "\"Hello\"", "isCorrect": true },
    { "id": "opt-d", "text": "3.14", "isCorrect": false }
  ],
  "explanation": "A string is text enclosed in quotes. \"Hello\" is surrounded by double quotes, making it a string. 42 is an integer, 3.14 is a float, and True is a boolean. In Python, quotes (single or double) are what make something a string.",
  "hints": [
    "Which value has quote marks around it?",
    "Strings are text. Look for the value that represents text, not a number or logical value."
  ],
  "difficulty": "easy"
}
```

---

#### Screen Type 3: `fill_in_blank`

Learner types answers into blank slots within a prompt.

| Field | Type | Required | Constraints | Description |
|-------|------|----------|-------------|-------------|
| `id` | string | yes | unique within course | Screen identifier. |
| `type` | `"fill_in_blank"` | yes | literal | Discriminator. |
| `title` | string | yes | min 1 char | Screen heading. |
| `prompt` | string | yes | min 1 char, must contain `{{blank}}` markers | Text with `{{blank}}` where learner fills in. Each marker maps to one entry in `blanks`, in order. |
| `blanks` | Blank[] | yes | min 1, count must match `{{blank}}` markers | Blank definitions in the same order as markers. |
| `blanks[].id` | string | yes | unique within screen | Blank identifier. e.g. `"blank-1"` |
| `blanks[].acceptedAnswers` | string[] | yes | min 1 item, each min 1 char | All accepted answers. Include common variations. |
| `blanks[].caseSensitive` | boolean | yes | | `false` for natural language, `true` for code syntax. |
| `explanation` | string | yes | min 20 chars | Explains the correct answers and why they fit. |
| `hints` | string[] | yes | 1-3 items | Progressive hints. |
| `difficulty` | `"easy"` \| `"medium"` \| `"hard"` | yes | | Difficulty level. |

**Critical rule:** The number of `{{blank}}` markers in `prompt` must exactly equal the length of the `blanks` array.

```json
{
  "id": "fib-loop-syntax",
  "type": "fill_in_blank",
  "title": "Complete the Loop",
  "prompt": "A {{blank}} loop runs while a condition is {{blank}}.",
  "blanks": [
    {
      "id": "blank-1",
      "acceptedAnswers": ["while", "While"],
      "caseSensitive": false
    },
    {
      "id": "blank-2",
      "acceptedAnswers": ["true", "True"],
      "caseSensitive": false
    }
  ],
  "explanation": "A 'while' loop repeats its body as long as its condition evaluates to true. Once the condition becomes false, execution moves past the loop. This is different from a 'for' loop, which iterates over a sequence.",
  "hints": [
    "This type of loop is named after the English word for 'during'.",
    "The loop keeps going as long as the condition is... not false."
  ],
  "difficulty": "easy"
}
```

---

#### Screen Type 4: `ordering`

Learner drags items into the correct sequence.

| Field | Type | Required | Constraints | Description |
|-------|------|----------|-------------|-------------|
| `id` | string | yes | unique within course | Screen identifier. |
| `type` | `"ordering"` | yes | literal | Discriminator. |
| `title` | string | yes | min 1 char | Prompt asking learner to order items. |
| `items` | Item[] | yes | 2-8 items | Items presented in randomized order. |
| `items[].id` | string | yes | unique within screen | Item identifier used in `correctOrder`. |
| `items[].text` | string | yes | min 1 char | Display text for this item. |
| `correctOrder` | string[] | yes | min 2, must contain exactly the same IDs as `items` | Item IDs in the correct sequence. |
| `explanation` | string | yes | min 20 chars | Explains why this ordering is correct. |
| `hints` | string[] | yes | 1-3 items | Progressive hints. |
| `difficulty` | `"easy"` \| `"medium"` \| `"hard"` | yes | | Difficulty level. |

**Critical rule:** `correctOrder` must contain exactly the same set of IDs as `items`. No missing IDs, no extra IDs.

```json
{
  "id": "order-variable-lifecycle",
  "type": "ordering",
  "title": "Arrange the steps of using a variable in Python",
  "items": [
    { "id": "step-declare", "text": "Choose a variable name" },
    { "id": "step-assign", "text": "Assign a value with =" },
    { "id": "step-use", "text": "Use the variable in an expression" },
    { "id": "step-reassign", "text": "Optionally reassign a new value" }
  ],
  "correctOrder": ["step-declare", "step-assign", "step-use", "step-reassign"],
  "explanation": "You must first choose a name, then assign it a value before you can use it. Reassignment is optional and comes after the variable already exists. Trying to use a variable before assigning it causes a NameError in Python.",
  "hints": [
    "What must exist before you can use something?",
    "You can't use a variable that hasn't been assigned yet."
  ],
  "difficulty": "easy"
}
```

---

#### Screen Type 5: `code_block`

Learner writes or modifies code, validated against test cases.

| Field | Type | Required | Constraints | Description |
|-------|------|----------|-------------|-------------|
| `id` | string | yes | unique within course | Screen identifier. |
| `type` | `"code_block"` | yes | literal | Discriminator. |
| `title` | string | yes | min 1 char | Challenge heading. |
| `language` | string | yes | must be a supported language | Programming language. See supported list below. |
| `starterCode` | string | yes | must be non-empty | Pre-filled code in the editor. Include guiding comments. |
| `testCases` | TestCase[] | yes | min 1 | Test cases to validate the learner's code. |
| `testCases[].input` | string | yes | | Input passed to the code. e.g. `"add(2, 3)"` |
| `testCases[].expectedOutput` | string | yes | | Expected output, compared as trimmed string. |
| `explanation` | string | yes | min 20 chars | Solution walkthrough shown after completion. |
| `hints` | string[] | yes | 1-3 items | Progressive hints. |
| `difficulty` | `"easy"` \| `"medium"` \| `"hard"` | yes | | Difficulty level. |

**Supported languages:** python, javascript, typescript, java, c, cpp, c++, csharp, c#, go, rust, ruby, php, swift, kotlin, scala, r, sql, bash, shell, html, css

```json
{
  "id": "code-add-function",
  "type": "code_block",
  "title": "Write an Addition Function",
  "language": "python",
  "starterCode": "# Write a function that adds two numbers and returns the result\ndef add(a, b):\n    pass",
  "testCases": [
    { "input": "add(2, 3)", "expectedOutput": "5" },
    { "input": "add(-1, 1)", "expectedOutput": "0" },
    { "input": "add(0, 0)", "expectedOutput": "0" }
  ],
  "explanation": "The function simply returns the sum of its two parameters using the + operator. In Python, + works on integers, floats, and even strings (concatenation). Here, we just need: return a + b.",
  "hints": [
    "The + operator adds two numbers together.",
    "Replace 'pass' with a return statement: return a + b"
  ],
  "difficulty": "easy"
}
```

---

### ID Uniqueness Rules

IDs must be unique at these scopes:

| ID Type | Unique Within |
|---------|---------------|
| `course.id` | globally (across all courses) |
| `module.id` | the course |
| `lesson.id` | the course (not just the module) |
| `screen.id` | the course (not just the lesson) |
| `option.id` | the screen |
| `blank.id` | the screen |
| `item.id` | the screen |

A practical naming convention: prefix IDs with their type and a short descriptor. Examples: `"module-basics"`, `"lesson-loops-intro"`, `"mc-loop-types"`, `"fib-for-syntax"`, `"order-algo-steps"`, `"code-hello-world"`.

---

## 3. Pedagogical Guidelines

### Lesson Structure

Each lesson should follow this rhythm:

1. **Hook** (explanation screen). Open with an engaging question, a surprising fact, or a relatable scenario. Don't start with definitions. Start with curiosity.

2. **Guided exploration** (1-2 easy interactive screens). Let the learner poke at the concept before you name it. Build intuition through doing, not reading.

3. **Concept reveal** (explanation screen). Now name the formal concept. Connect it back to what the learner just experienced. "That pattern you just used? It's called a for loop."

4. **Practice with increasing difficulty** (3-5 interactive screens). Start easy, end hard. Each screen should feel slightly more challenging than the last. Mix screen types to keep things fresh.

5. **Extension or edge case** (1-2 screens). Introduce a twist, a common mistake, or an edge case. This cements understanding by showing where the concept's boundaries are.

### Core Principles

**Intuition before formalism.** Let learners solve a problem before you tell them the name of the technique they just used. People remember what they discover far better than what they're told.

**Learn by doing.** Every screen should require the learner to think or act. Even explanation screens should pose a question or set up a challenge. Passive reading is the enemy of retention.

**Difficulty is a ramp, not a cliff.** If your lesson goes easy, easy, hard, you've lost the learner. The progression should feel like walking up a gentle hill, not hitting a wall.

**Distractors teach too.** In multiple choice, wrong answers should be plausible mistakes a real learner might make. "None of the above" and joke answers waste a teaching opportunity. Each wrong option is a chance to address a misconception.

**Hints are a ladder.** First hint: a gentle nudge in the right direction. Second hint: a stronger clue. Third hint: nearly the answer. Never make the first hint too revealing, and never make the last hint useless.

### Screen Type Selection Guide

| When you want to... | Use this screen type |
|---------------------|---------------------|
| Introduce a concept, tell a story, show syntax | `explanation` |
| Test recognition or understanding of a concept | `multiple_choice` |
| Practice recall of specific terms, syntax, or values | `fill_in_blank` |
| Teach sequential processes or prioritization | `ordering` |
| Build real problem-solving skill with code | `code_block` |

---

## 4. Content Quality Checklist

Run through this before submitting any course JSON.

### Structure
- [ ] Every lesson has at least 2 screens (validator enforces this)
- [ ] First screen of each lesson is an `explanation` type (validator warns if not)
- [ ] No duplicate IDs anywhere in the course (module, lesson, screen, option, blank, item)
- [ ] Difficulty increases through each lesson (easy screens first, hard screens last)

### Explanation Screens
- [ ] Content is at least 20 characters
- [ ] Markdown is well-formed (no broken code blocks, no unclosed formatting)
- [ ] Content is concise: 2-4 short paragraphs, not walls of text
- [ ] Callouts are used sparingly for genuinely useful tips or surprising facts

### Multiple Choice Screens
- [ ] Exactly one option has `isCorrect: true`
- [ ] 2-6 options (4 is the sweet spot)
- [ ] No duplicate option text
- [ ] Distractors are plausible, not obviously wrong
- [ ] Explanation addresses why the correct answer is right AND why at least one distractor is wrong
- [ ] Explanation is at least 20 characters

### Fill-in-Blank Screens
- [ ] Number of `{{blank}}` markers in `prompt` equals length of `blanks` array
- [ ] Each blank has at least one accepted answer
- [ ] `acceptedAnswers` includes common variations (capitalization, spacing, abbreviations)
- [ ] `caseSensitive` is `false` for natural language, `true` for code syntax
- [ ] Explanation is at least 20 characters

### Ordering Screens
- [ ] `correctOrder` contains exactly the same IDs as `items` (no missing, no extra)
- [ ] 2-8 items (3-5 is the sweet spot)
- [ ] Items are meaningfully distinct (not "Step 1", "Step 2" with no real content)
- [ ] Explanation is at least 20 characters

### Code Block Screens
- [ ] `starterCode` is non-empty (include at least a comment or function stub)
- [ ] `language` is one of the supported values (see list in schema reference)
- [ ] At least one test case
- [ ] Test cases cover normal input, edge cases, and (ideally) a boundary condition
- [ ] Explanation is at least 20 characters

### Hints (all interactive screens)
- [ ] 1-3 hints per screen
- [ ] First hint is a nudge, not a giveaway
- [ ] Last hint is nearly the answer
- [ ] Hints are progressive (each reveals more than the previous)

### Content Quality
- [ ] Mathematical and factual claims are verifiable
- [ ] Code examples actually work (mentally trace them or run them)
- [ ] No placeholder text ("TODO", "lorem ipsum", "example here")
- [ ] Tone is conversational and encouraging, not dry or condescending

---

## 5. System Prompt for LLMs

Copy and paste this entire block as a system prompt when asking an LLM to author a Brilliance course.

````
You are a course author for the Brilliance learning platform. You produce valid JSON course files that teach concepts through interactive, bite-sized lessons.

## Output Format

Produce a single JSON object following this exact structure:

```
Course {
  id: string                    // unique course identifier, used in URLs
  title: string                 // course title
  description: string           // 2-3 sentence summary
  coverImage?: string           // optional image URL/path
  modules: Module[]             // 1+ modules (aim for 2-8)
}

Module {
  id: string                    // unique within course
  title: string
  description: string           // 1-2 sentences
  lessons: Lesson[]             // 1+ lessons (aim for 2-6)
}

Lesson {
  id: string                    // unique within course
  title: string
  description: string           // 1-2 sentences
  screens: Screen[]             // 2+ screens (aim for 3-8)
}
```

## Screen Types

There are 5 screen types, discriminated by the `type` field:

### explanation
```json
{
  "id": "string",
  "type": "explanation",
  "title": "string (min 1 char)",
  "content": "string (min 20 chars, markdown supported)",
  "callout": "string (optional)"
}
```

### multiple_choice
```json
{
  "id": "string",
  "type": "multiple_choice",
  "title": "string (the question)",
  "options": [
    { "id": "string", "text": "string", "isCorrect": false },
    { "id": "string", "text": "string", "isCorrect": true }
  ],
  "explanation": "string (min 20 chars, shown after answering)",
  "hints": ["string (1-3 progressive hints)"],
  "difficulty": "easy | medium | hard"
}
```
Rules: 2-6 options, exactly 1 with isCorrect=true, no duplicate text.

### fill_in_blank
```json
{
  "id": "string",
  "type": "fill_in_blank",
  "title": "string",
  "prompt": "A {{blank}} loop runs while a condition is {{blank}}.",
  "blanks": [
    { "id": "string", "acceptedAnswers": ["answer1", "answer2"], "caseSensitive": false },
    { "id": "string", "acceptedAnswers": ["answer1"], "caseSensitive": false }
  ],
  "explanation": "string (min 20 chars)",
  "hints": ["string (1-3 progressive hints)"],
  "difficulty": "easy | medium | hard"
}
```
Rules: Number of {{blank}} markers in prompt MUST equal blanks array length. Include answer variations.

### ordering
```json
{
  "id": "string",
  "type": "ordering",
  "title": "string",
  "items": [
    { "id": "item-a", "text": "First step" },
    { "id": "item-b", "text": "Second step" }
  ],
  "correctOrder": ["item-a", "item-b"],
  "explanation": "string (min 20 chars)",
  "hints": ["string (1-3 progressive hints)"],
  "difficulty": "easy | medium | hard"
}
```
Rules: correctOrder must contain exactly the same IDs as items. 2-8 items.

### code_block
```json
{
  "id": "string",
  "type": "code_block",
  "title": "string",
  "language": "python",
  "starterCode": "# Write your code here\ndef solve():\n    pass",
  "testCases": [
    { "input": "solve()", "expectedOutput": "42" }
  ],
  "explanation": "string (min 20 chars)",
  "hints": ["string (1-3 progressive hints)"],
  "difficulty": "easy | medium | hard"
}
```
Rules: starterCode must be non-empty. At least 1 test case. Supported languages: python, javascript, typescript, java, c, cpp, c++, csharp, c#, go, rust, ruby, php, swift, kotlin, scala, r, sql, bash, shell, html, css.

## ID Rules

All IDs must be unique within the entire course:
- Module IDs: unique across the course
- Lesson IDs: unique across the course (not just within a module)
- Screen IDs: unique across the course (not just within a lesson)
- Option/blank/item IDs: unique within their screen

Use descriptive prefixes: "module-", "lesson-", "mc-", "fib-", "order-", "code-", "explain-".

## Lesson Structure

Follow this rhythm for each lesson:
1. Hook (explanation) - engaging question or surprising fact
2. Guided exploration (1-2 easy interactive screens) - build intuition
3. Concept reveal (explanation) - name the formal concept
4. Practice (3-5 interactive screens) - increasing difficulty: easy → medium → hard
5. Extension (1-2 screens) - edge case or twist

## Quality Rules

- Intuition before formalism: let learners solve before naming the concept
- Hints are progressive: first = nudge, last = nearly the answer
- Multiple choice distractors must be plausible mistakes, not jokes
- Fill-in-blank acceptedAnswers should include common variations
- Difficulty must actually increase through the lesson
- Explanation fields must be at least 20 characters and explain WHY, not just WHAT
- Every factual claim must be accurate and verifiable
````

---

## 6. Validation

### How Validation Works

The Brilliance platform validates course JSON at two levels:

1. **Schema validation** (Zod). Checks types, required fields, minimum lengths, array sizes, and enum values. If the JSON doesn't match the schema, it's rejected before any content checks run.

2. **Content validation** (content-validator). Runs semantic checks that the schema can't express. These catch logical errors in your content.

### Content Validation Rules

#### Multiple Choice
| Rule | Severity |
|------|----------|
| Must have at least 2 options | error |
| Exactly 1 option must have `isCorrect: true` | error |
| No duplicate option text (case-insensitive) | error |

#### Fill-in-Blank
| Rule | Severity |
|------|----------|
| Prompt must contain at least one `{{blank}}` marker | error |
| Number of `{{blank}}` markers must equal `blanks` array length | error |
| Each blank must have at least one accepted answer | error |

#### Ordering
| Rule | Severity |
|------|----------|
| Must have at least 2 items | error |
| No duplicate item IDs | error |
| Every ID in `correctOrder` must exist in `items` | error |
| Every ID in `items` must appear in `correctOrder` | error |
| `correctOrder` length must equal `items` length | error |

#### Code Block
| Rule | Severity |
|------|----------|
| Must have at least 1 test case | error |
| `starterCode` must be non-empty | error |
| `language` must be a supported value | error |

#### Lesson
| Rule | Severity |
|------|----------|
| Must have at least 2 screens | error |
| First screen should be `explanation` type | warning |
| No duplicate screen IDs within the lesson | error |

#### Course
| Rule | Severity |
|------|----------|
| Must have at least 1 module | error |
| Each module must have at least 1 lesson | error |
| No duplicate module IDs | error |
| No duplicate lesson IDs (across entire course) | error |
| No duplicate screen IDs (across entire course) | error |

### Common Errors and Fixes

**"Multiple choice must have exactly one correct option (found 0)"**
You forgot to set `isCorrect: true` on one of the options. Exactly one option needs it.

**"Multiple choice must have exactly one correct option (found 2)"**
Two options are marked correct. Pick one. If you genuinely want multiple correct answers, that's not supported by this schema. Reframe the question so only one answer is right.

**"Number of {{blank}} markers does not match blanks array length"**
Count the `{{blank}}` strings in your `prompt` text. That count must exactly match the number of objects in your `blanks` array. Common cause: you added a blank object but forgot to put `{{blank}}` in the prompt, or vice versa.

**"correctOrder references ID that does not exist in items"**
You have an ID in `correctOrder` that doesn't match any `items[].id`. Check for typos. IDs are case-sensitive.

**"Item ID is missing from correctOrder"**
You defined an item but didn't include its ID in `correctOrder`. Every item must appear in the correct order array.

**"Code block starterCode must be non-empty"**
Even for "write from scratch" challenges, provide at least a comment or function stub. An empty string fails validation.

**"Language is not a supported value"**
Check the supported languages list. Common mistakes: `"Python"` (should be lowercase `"python"`), `"js"` (should be `"javascript"`), `"ts"` (should be `"typescript"`).

**"Duplicate screen ID"**
Two screens somewhere in the course share the same `id`. Screen IDs must be unique across the entire course, not just within a lesson. Use descriptive prefixes to avoid collisions.

**"Must have at least 2 screens"**
A lesson needs at least 2 screens. A single screen isn't a lesson, it's a flash card. Add at least one interactive screen after your explanation.

---

## Quick Reference Card

```
File location:    src/content/courses/{course-id}/course.json
Screen types:     explanation, multiple_choice, fill_in_blank, ordering, code_block
Difficulty:       easy, medium, hard
Hints:            1-3 per interactive screen, progressive
Explanation:      min 20 chars on all interactive screens
Blanks:           {{blank}} marker count must match blanks array length
Ordering:         correctOrder IDs must exactly match items IDs
Code languages:   python, javascript, typescript, java, c, cpp, c++,
                  csharp, c#, go, rust, ruby, php, swift, kotlin,
                  scala, r, sql, bash, shell, html, css
ID uniqueness:    module/lesson/screen IDs unique across entire course
Lesson rhythm:    hook → explore → reveal → practice → extend
```
