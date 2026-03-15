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

Every screen has a `type` field that determines its shape. There are fifteen types:

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

#### Screen Type 6: `matching`

Learner connects left items to their correct right-side counterparts.

| Field | Type | Required | Constraints | Description |
|-------|------|----------|-------------|-------------|
| `id` | string | yes | unique within course | Screen identifier. e.g. `"match-tools-1"` |
| `type` | `"matching"` | yes | literal | Discriminator. |
| `title` | string | yes | min 1 char | Prompt asking learner to match items. |
| `pairs` | Pair[] | yes | 2-8 pairs | The set of left-right associations. |
| `pairs[].id` | string | yes | unique within screen | Pair identifier. e.g. `"pair-1"` |
| `pairs[].left` | string | yes | min 1 char | Left-side item shown in original order. |
| `pairs[].right` | string | yes | min 1 char | Right-side item, shuffled by the renderer. |
| `instruction` | string | no | | Optional instruction text. e.g. `"Match each tool to its purpose"` |
| `explanation` | string | yes | min 20 chars | Explains why each pair belongs together. |
| `hints` | string[] | yes | 1-3 items | Progressive hints. |
| `difficulty` | `"easy"` \| `"medium"` \| `"hard"` | yes | | Difficulty level. |

**Critical rule:** No duplicate left values and no duplicate right values across pairs.

```json
{
  "id": "match-tools-purpose",
  "type": "matching",
  "title": "Match each tool to its primary purpose",
  "pairs": [
    { "id": "pair-wrench", "left": "Wrench", "right": "Tighten bolts" },
    { "id": "pair-screwdriver", "left": "Screwdriver", "right": "Drive screws" },
    { "id": "pair-pliers", "left": "Pliers", "right": "Grip and bend wire" },
    { "id": "pair-hammer", "left": "Hammer", "right": "Drive nails" }
  ],
  "instruction": "Match each tool to what it does best",
  "explanation": "Each tool is designed for a specific mechanical action. A wrench applies torque to bolts, a screwdriver transfers rotational force to screws, pliers provide gripping leverage for wire and small objects, and a hammer delivers impact force to drive nails.",
  "hints": [
    "Think about the motion each tool is designed for.",
    "A wrench turns, a screwdriver twists, pliers squeeze, and a hammer strikes."
  ],
  "difficulty": "easy"
}
```

---

#### Screen Type 7: `categorization`

Learner sorts items into labeled category buckets.

| Field | Type | Required | Constraints | Description |
|-------|------|----------|-------------|-------------|
| `id` | string | yes | unique within course | Screen identifier. e.g. `"cat-sort-tools"` |
| `type` | `"categorization"` | yes | literal | Discriminator. |
| `title` | string | yes | min 1 char | Prompt asking learner to sort items. |
| `categories` | Category[] | yes | 2-4 items | The category buckets. |
| `categories[].id` | string | yes | unique within screen | Category identifier. e.g. `"cat-hand-tools"` |
| `categories[].label` | string | yes | min 1 char | Category name shown to learner. e.g. `"Hand Tools"` |
| `items` | Item[] | yes | 4-12 items | Items to sort into categories. |
| `items[].id` | string | yes | unique within screen | Item identifier. e.g. `"item-wrench"` |
| `items[].text` | string | yes | min 1 char | Item text shown to learner. e.g. `"Wrench"` |
| `items[].categoryId` | string | yes | must reference a valid category id | The correct category this item belongs to. |
| `instruction` | string | no | | Optional context. e.g. `"Sort these animals by their class"` |
| `explanation` | string | yes | min 20 chars | Explains why each item belongs to its category. |
| `hints` | string[] | yes | 1-3 items | Progressive hints. |
| `difficulty` | `"easy"` \| `"medium"` \| `"hard"` | yes | | Difficulty level. |

**Critical rule:** Every `items[].categoryId` must reference a valid `categories[].id`. Distribute items across categories (don't put all items in one bucket).

```json
{
  "id": "cat-sort-tools",
  "type": "categorization",
  "title": "Sort these tools into the correct category",
  "categories": [
    { "id": "cat-hand", "label": "Hand Tools" },
    { "id": "cat-power", "label": "Power Tools" }
  ],
  "items": [
    { "id": "item-wrench", "text": "Wrench", "categoryId": "cat-hand" },
    { "id": "item-screwdriver", "text": "Screwdriver", "categoryId": "cat-hand" },
    { "id": "item-drill", "text": "Drill", "categoryId": "cat-power" },
    { "id": "item-sander", "text": "Belt Sander", "categoryId": "cat-power" }
  ],
  "instruction": "Drag each tool into the correct category",
  "explanation": "Hand tools are powered by human effort alone: wrenches and screwdrivers require manual force. Power tools like drills and belt sanders use electricity or batteries to do the heavy work, making them faster but requiring a power source.",
  "hints": [
    "Think about what powers each tool.",
    "Does it need electricity or batteries to work?"
  ],
  "difficulty": "easy"
}
```

---

#### Screen Type 8: `hotspot`

Learner clicks or taps regions on an image to identify specific features.

| Field | Type | Required | Constraints | Description |
|-------|------|----------|-------------|-------------|
| `id` | string | yes | unique within course | Screen identifier. e.g. `"hot-find-filter"` |
| `type` | `"hotspot"` | yes | literal | Discriminator. |
| `title` | string | yes | min 1 char | Prompt asking learner to find something. |
| `imageUrl` | string | yes | min 1 char | URL to the image. e.g. `"/images/engine-bay.png"` |
| `imageAlt` | string | yes | min 1 char | Alt text for accessibility. |
| `hotspots` | Hotspot[] | yes | min 2 | Clickable regions on the image. |
| `hotspots[].id` | string | yes | unique within screen | Hotspot identifier. |
| `hotspots[].x` | number | yes | 0-100 | Hotspot center X as percentage. |
| `hotspots[].y` | number | yes | 0-100 | Hotspot center Y as percentage. |
| `hotspots[].width` | number | yes | 1-100 | Hotspot width as percentage of image width. |
| `hotspots[].height` | number | yes | 1-100 | Hotspot height as percentage of image height. |
| `hotspots[].label` | string | yes | min 1 char | Label for this hotspot. e.g. `"Oil filter"` |
| `correctHotspotIds` | string[] | yes | min 1 | IDs of the correct hotspot(s) to click. |
| `selectionMode` | `"single"` \| `"multiple"` | yes | | `"single"` = pick one, `"multiple"` = pick all correct. |
| `instruction` | string | yes | min 1 char | What to find. e.g. `"Click on the oil filter"` |
| `explanation` | string | yes | min 20 chars | Explains the correct answer. |
| `hints` | string[] | yes | 1-3 items | Progressive hints. |
| `difficulty` | `"easy"` \| `"medium"` \| `"hard"` | yes | | Difficulty level. |

**Critical rule:** `correctHotspotIds` must reference valid hotspot IDs. All position values (x, y, width, height) are percentages of the image dimensions.

```json
{
  "id": "hot-find-filter",
  "type": "hotspot",
  "title": "Find the Oil Filter",
  "imageUrl": "/images/engine-bay.png",
  "imageAlt": "Engine bay of a pickup truck showing various components",
  "hotspots": [
    { "id": "hs-filter", "x": 35, "y": 60, "width": 12, "height": 15, "label": "Oil filter" },
    { "id": "hs-battery", "x": 70, "y": 30, "width": 15, "height": 20, "label": "Battery" },
    { "id": "hs-alternator", "x": 50, "y": 45, "width": 10, "height": 12, "label": "Alternator" }
  ],
  "correctHotspotIds": ["hs-filter"],
  "selectionMode": "single",
  "instruction": "Click on the oil filter in this engine photo",
  "explanation": "The oil filter is the cylindrical component located on the lower-left side of the engine block. It filters contaminants from engine oil before the oil recirculates. It's typically a metal canister that unscrews for replacement during oil changes.",
  "hints": [
    "The oil filter is usually a cylindrical canister.",
    "Look toward the lower portion of the engine block."
  ],
  "difficulty": "easy"
}
```

---

#### Screen Type 9: `diagram_label`

Learner drags labels to their correct positions on a diagram image.

| Field | Type | Required | Constraints | Description |
|-------|------|----------|-------------|-------------|
| `id` | string | yes | unique within course | Screen identifier. e.g. `"diag-engine-parts"` |
| `type` | `"diagram_label"` | yes | literal | Discriminator. |
| `title` | string | yes | min 1 char | Prompt asking learner to label the diagram. |
| `imageUrl` | string | yes | min 1 char | URL to the diagram image. |
| `imageAlt` | string | yes | min 1 char | Alt text for the diagram. |
| `labels` | Label[] | yes | 2-10 items | Labels with their correct positions. |
| `labels[].id` | string | yes | unique within screen | Label identifier. |
| `labels[].text` | string | yes | min 1 char | Label text. e.g. `"Mitochondria"` |
| `labels[].targetX` | number | yes | 0-100 | Correct X position as percentage. |
| `labels[].targetY` | number | yes | 0-100 | Correct Y position as percentage. |
| `instruction` | string | yes | min 1 char | Context. e.g. `"Drag each label to the correct part"` |
| `explanation` | string | yes | min 20 chars | Explains correct placements. |
| `hints` | string[] | yes | 1-3 items | Progressive hints. |
| `difficulty` | `"easy"` \| `"medium"` \| `"hard"` | yes | | Difficulty level. |

**Critical rule:** No duplicate label text. targetX and targetY are percentages (0-100) marking where each label belongs on the image.

```json
{
  "id": "diag-engine-parts",
  "type": "diagram_label",
  "title": "Label the Engine Components",
  "imageUrl": "/images/engine-diagram.png",
  "imageAlt": "Cutaway diagram of a four-cylinder engine",
  "labels": [
    { "id": "lbl-piston", "text": "Piston", "targetX": 40, "targetY": 55 },
    { "id": "lbl-crankshaft", "text": "Crankshaft", "targetX": 45, "targetY": 80 },
    { "id": "lbl-camshaft", "text": "Camshaft", "targetX": 50, "targetY": 20 },
    { "id": "lbl-sparkplug", "text": "Spark Plug", "targetX": 35, "targetY": 15 }
  ],
  "instruction": "Drag each label to the correct part of the engine diagram",
  "explanation": "The piston sits inside the cylinder and moves up and down. The crankshaft converts that linear motion into rotation at the bottom of the engine. The camshaft sits at the top and controls valve timing. Spark plugs thread into the cylinder head and ignite the fuel-air mixture.",
  "hints": [
    "The crankshaft is at the very bottom of the engine.",
    "Spark plugs are always at the top of the cylinders."
  ],
  "difficulty": "medium"
}
```

---

#### Screen Type 10: `interactive_graph`

Learner manipulates a graph by plotting points, adjusting sliders, or drawing lines.

| Field | Type | Required | Constraints | Description |
|-------|------|----------|-------------|-------------|
| `id` | string | yes | unique within course | Screen identifier. e.g. `"graph-plot-growth"` |
| `type` | `"interactive_graph"` | yes | literal | Discriminator. |
| `title` | string | yes | min 1 char | Prompt describing the graphing task. |
| `graphType` | `"plot_points"` \| `"adjust_slider"` \| `"draw_line"` | yes | | Interaction mode. |
| `xAxis` | object | yes | | X-axis configuration. |
| `xAxis.label` | string | yes | min 1 char | X-axis label. e.g. `"Time (days)"` |
| `xAxis.min` | number | yes | | X-axis minimum value. |
| `xAxis.max` | number | yes | | X-axis maximum value. |
| `xAxis.step` | number | no | | Optional tick interval. |
| `yAxis` | object | yes | | Y-axis configuration. |
| `yAxis.label` | string | yes | min 1 char | Y-axis label. e.g. `"Height (cm)"` |
| `yAxis.min` | number | yes | | Y-axis minimum value. |
| `yAxis.max` | number | yes | | Y-axis maximum value. |
| `yAxis.step` | number | no | | Optional tick interval. |
| `existingData` | DataPoint[] | no | | Pre-plotted points shown to the learner. |
| `targetData` | DataPoint[] | yes | min 1 | Correct answer positions the learner must match. |
| `tolerance` | number | yes | min 0 | How close the learner's answer must be in axis units. |
| `sliders` | Slider[] | no | | Sliders for `adjust_slider` mode. |
| `instruction` | string | yes | min 1 char | What to do. e.g. `"Plot the data points"` |
| `explanation` | string | yes | min 20 chars | Explains the correct answer. |
| `hints` | string[] | yes | 1-3 items | Progressive hints. |
| `difficulty` | `"easy"` \| `"medium"` \| `"hard"` | yes | | Difficulty level. |

**Critical rule:** At least 1 targetData point. tolerance defines acceptable error margin. Use `existingData` to show reference points and `sliders` only with `adjust_slider` graphType.

```json
{
  "id": "graph-plant-growth",
  "type": "interactive_graph",
  "title": "Plot the Plant Growth Data",
  "graphType": "plot_points",
  "xAxis": { "label": "Day", "min": 0, "max": 14, "step": 2 },
  "yAxis": { "label": "Height (cm)", "min": 0, "max": 20, "step": 5 },
  "existingData": [
    { "x": 0, "y": 2, "label": "Planted" }
  ],
  "targetData": [
    { "x": 4, "y": 5 },
    { "x": 8, "y": 11 },
    { "x": 12, "y": 17 }
  ],
  "tolerance": 1,
  "instruction": "The plant was 5cm on day 4, 11cm on day 8, and 17cm on day 12. Plot these measurements.",
  "explanation": "The plant shows roughly linear growth of about 1.25cm per day. Plotting the points reveals an upward trend. The initial measurement of 2cm at planting gives context for the growth rate. This kind of data visualization helps identify trends that raw numbers alone might obscure.",
  "hints": [
    "Start with day 4: find 4 on the x-axis and 5 on the y-axis.",
    "Each point is higher than the last, showing consistent growth."
  ],
  "difficulty": "easy"
}
```

---

#### Screen Type 11: `number_line`

Learner places markers on a number line or scale.

| Field | Type | Required | Constraints | Description |
|-------|------|----------|-------------|-------------|
| `id` | string | yes | unique within course | Screen identifier. e.g. `"nl-place-fraction"` |
| `type` | `"number_line"` | yes | literal | Discriminator. |
| `title` | string | yes | min 1 char | Prompt asking learner to place a value. |
| `min` | number | yes | | Left end of the number line. |
| `max` | number | yes | | Right end of the number line. |
| `step` | number | yes | | Tick mark interval. |
| `showLabels` | boolean | yes | | Whether tick marks show their value. |
| `markers` | Marker[] | yes | min 1 | Markers the learner must place. |
| `markers[].id` | string | yes | unique within screen | Marker identifier. |
| `markers[].correctValue` | number | yes | | Correct position value. |
| `markers[].label` | string | no | | Optional marker label. e.g. `"3/4"` |
| `markers[].color` | string | no | | Optional marker color. |
| `tolerance` | number | yes | min 0 | How close placement must be. |
| `displayMode` | `"integer"` \| `"decimal"` \| `"fraction"` \| `"custom_labels"` | yes | | How tick labels are formatted. |
| `customLabels` | Record<string, string> | no | | Map of position to label for `custom_labels` mode. |
| `instruction` | string | yes | min 1 char | What to do. e.g. `"Place the marker at 3/4"` |
| `explanation` | string | yes | min 20 chars | Explains correct placement. |
| `hints` | string[] | yes | 1-3 items | Progressive hints. |
| `difficulty` | `"easy"` \| `"medium"` \| `"hard"` | yes | | Difficulty level. |

**Critical rule:** `customLabels` is required when `displayMode` is `"custom_labels"`. Marker `correctValue` must fall within the `min`-`max` range.

```json
{
  "id": "nl-place-three-quarters",
  "type": "number_line",
  "title": "Place 3/4 on the Number Line",
  "min": 0,
  "max": 1,
  "step": 0.25,
  "showLabels": true,
  "markers": [
    { "id": "marker-1", "correctValue": 0.75, "label": "3/4" }
  ],
  "tolerance": 0.05,
  "displayMode": "fraction",
  "instruction": "Drag the marker to where 3/4 belongs on this number line",
  "explanation": "3/4 equals 0.75, which sits three-quarters of the way from 0 to 1. On a number line divided into fourths, it lands on the third tick mark. Fractions represent parts of a whole, and the number line makes that visual: 3/4 is closer to 1 than to 0.",
  "hints": [
    "3/4 means three out of four equal parts.",
    "It's between 1/2 and 1, closer to 1."
  ],
  "difficulty": "easy"
}
```

---

#### Screen Type 12: `pattern_builder`

Learner identifies and continues a pattern by filling in missing elements.

| Field | Type | Required | Constraints | Description |
|-------|------|----------|-------------|-------------|
| `id` | string | yes | unique within course | Screen identifier. e.g. `"pat-next-shape"` |
| `type` | `"pattern_builder"` | yes | literal | Discriminator. |
| `title` | string | yes | min 1 char | Prompt about the pattern. |
| `sequence` | SequenceItem[] | yes | min 3 | The pattern sequence. |
| `sequence[].position` | number | yes | integer, min 1 | Position in sequence (1-indexed). |
| `sequence[].value` | string | yes | min 1 char | Value at this position (text, number, or image key). |
| `sequence[].revealed` | boolean | yes | | `true` = shown, `false` = learner fills. |
| `options` | Option[] | yes | min 2 | Choices including correct answers and distractors. |
| `options[].id` | string | yes | unique within screen | Option identifier. |
| `options[].value` | string | yes | min 1 char | Option value (must match a hidden position's value for correct answers). |
| `patternType` | `"visual"` \| `"numeric"` \| `"text"` | yes | | How values render. |
| `visualAssets` | Record<string, string> | no | | Map of value to imageUrl for `visual` mode. |
| `instruction` | string | yes | min 1 char | Context. e.g. `"Fill in the missing items"` |
| `explanation` | string | yes | min 20 chars | Explains the pattern rule. |
| `hints` | string[] | yes | 1-3 items | Progressive hints. |
| `difficulty` | `"easy"` \| `"medium"` \| `"hard"` | yes | | Difficulty level. |

**Critical rule:** At least some sequence items must have `revealed: true` and some `revealed: false`. Options must include correct values for all hidden positions plus at least one distractor.

```json
{
  "id": "pat-double-sequence",
  "type": "pattern_builder",
  "title": "What Comes Next?",
  "sequence": [
    { "position": 1, "value": "2", "revealed": true },
    { "position": 2, "value": "4", "revealed": true },
    { "position": 3, "value": "8", "revealed": true },
    { "position": 4, "value": "16", "revealed": false },
    { "position": 5, "value": "32", "revealed": false }
  ],
  "options": [
    { "id": "opt-16", "value": "16" },
    { "id": "opt-32", "value": "32" },
    { "id": "opt-12", "value": "12" },
    { "id": "opt-24", "value": "24" }
  ],
  "patternType": "numeric",
  "instruction": "Each number follows a rule. Fill in the missing values.",
  "explanation": "Each number is double the previous one: 2, 4, 8, 16, 32. The rule is 'multiply by 2.' This is a geometric sequence with a common ratio of 2. Recognizing doubling patterns appears everywhere from biology (cell division) to computing (binary).",
  "hints": [
    "Compare each number to the one before it.",
    "4 is twice 2, and 8 is twice 4. What's twice 8?"
  ],
  "difficulty": "easy"
}
```

---

#### Screen Type 13: `process_stepper`

Learner arranges procedural steps in order, optionally justifying each placement.

| Field | Type | Required | Constraints | Description |
|-------|------|----------|-------------|-------------|
| `id` | string | yes | unique within course | Screen identifier. e.g. `"proc-oil-change"` |
| `type` | `"process_stepper"` | yes | literal | Discriminator. |
| `title` | string | yes | min 1 char | Prompt asking learner to order steps. |
| `steps` | Step[] | yes | 2-10 items | Steps in correct order (shuffled by renderer). |
| `steps[].id` | string | yes | unique within screen | Step identifier. |
| `steps[].text` | string | yes | min 1 char | Step description. e.g. `"Drain the old oil"` |
| `steps[].justification` | string | no | | Expected reasoning for this step's position. |
| `requireJustification` | boolean | yes | | Whether learner must explain each placement. |
| `justificationPrompt` | string | no | | Prompt for justification input. |
| `instruction` | string | yes | min 1 char | Context. e.g. `"Arrange these steps and explain why"` |
| `explanation` | string | yes | min 20 chars | Explains the correct order. |
| `hints` | string[] | yes | 1-3 items | Progressive hints. |
| `difficulty` | `"easy"` \| `"medium"` \| `"hard"` | yes | | Difficulty level. |

**Critical rule:** Steps are provided in correct order in the JSON. The renderer shuffles them. When `requireJustification` is `true`, each step should have a `justification` field with expected reasoning.

```json
{
  "id": "proc-oil-change",
  "type": "process_stepper",
  "title": "Arrange the Oil Change Steps",
  "steps": [
    { "id": "step-warm", "text": "Warm up the engine for 2 minutes", "justification": "Warm oil flows more freely and drains completely" },
    { "id": "step-drain", "text": "Remove drain plug and drain old oil", "justification": "Old oil must be removed before adding new oil" },
    { "id": "step-filter", "text": "Replace the oil filter", "justification": "A new filter prevents contaminants from entering fresh oil" },
    { "id": "step-plug", "text": "Reinstall the drain plug", "justification": "The pan must be sealed before adding new oil" },
    { "id": "step-fill", "text": "Pour in new oil to the correct level", "justification": "Fresh oil goes in last, after the system is sealed" }
  ],
  "requireJustification": true,
  "justificationPrompt": "Why does this step come at this point?",
  "instruction": "Put these oil change steps in the correct order and explain why each step belongs where it does",
  "explanation": "The engine must be warm first so oil drains completely. Then you drain the old oil, replace the filter while the system is open, reseal the drain plug, and finally add fresh oil. Each step depends on the previous one being complete. Skipping the warm-up leaves old oil behind; adding oil before sealing the plug means it drains right out.",
  "hints": [
    "Think about what must happen before you can add new oil.",
    "You can't pour new oil in if the drain plug is still out."
  ],
  "difficulty": "medium"
}
```

---

#### Screen Type 14: `simulation`

Learner makes a prediction, then observes a simulated outcome to test their hypothesis.

| Field | Type | Required | Constraints | Description |
|-------|------|----------|-------------|-------------|
| `id` | string | yes | unique within course | Screen identifier. e.g. `"sim-drop-ball"` |
| `type` | `"simulation"` | yes | literal | Discriminator. |
| `title` | string | yes | min 1 char | Prompt framing the experiment. |
| `scenario` | object | yes | | The simulation setup. |
| `scenario.objects` | Object[] | yes | min 1 | Objects in the simulation scene. |
| `scenario.objects[].id` | string | yes | | Object identifier. |
| `scenario.objects[].type` | string | yes | min 1 char | Object type. e.g. `"ball"`, `"block"` |
| `scenario.objects[].label` | string | yes | min 1 char | Display label. e.g. `"Heavy Ball"` |
| `scenario.objects[].x` | number | yes | | X position. |
| `scenario.objects[].y` | number | yes | | Y position. |
| `scenario.objects[].properties` | Record<string, number> | yes | | Named properties. e.g. `{ "mass": 5, "velocity": 0 }` |
| `scenario.parameters` | Parameter[] | no | | User-adjustable sliders. |
| `scenario.rules` | Rule[] | yes | min 1 | Cause-effect rules. |
| `scenario.rules[].trigger` | string | yes | min 1 char | What starts the action. e.g. `"drop"` |
| `scenario.rules[].action` | string | yes | min 1 char | What happens. e.g. `"fall"` |
| `scenario.rules[].target` | string | yes | min 1 char | What is affected. e.g. `"ball"` |
| `prediction` | object | yes | | The prediction the learner must make. |
| `prediction.question` | string | yes | min 1 char | What to predict. |
| `prediction.options` | string[] (min 2) or `"numeric"` | yes | | Multiple choice options or `"numeric"` for number input. |
| `prediction.correctAnswer` | string or number | yes | | The correct prediction. |
| `prediction.tolerance` | number | no | | For numeric answers, how close is acceptable. |
| `instruction` | string | yes | min 1 char | Context for the simulation. |
| `explanation` | string | yes | min 20 chars | Explains what happened and why. |
| `hints` | string[] | yes | 1-3 items | Progressive hints. |
| `difficulty` | `"easy"` \| `"medium"` \| `"hard"` | yes | | Difficulty level. |

**Critical rule:** The learner predicts FIRST, then observes the simulation result. `prediction.options` is either an array of 2+ string choices or the literal string `"numeric"` for number input.

```json
{
  "id": "sim-drop-balls",
  "type": "simulation",
  "title": "Which Ball Lands First?",
  "scenario": {
    "objects": [
      { "id": "ball-heavy", "type": "ball", "label": "Heavy Ball (5kg)", "x": 30, "y": 10, "properties": { "mass": 5 } },
      { "id": "ball-light", "type": "ball", "label": "Light Ball (0.5kg)", "x": 70, "y": 10, "properties": { "mass": 0.5 } }
    ],
    "rules": [
      { "trigger": "drop", "action": "fall", "target": "ball-heavy" },
      { "trigger": "drop", "action": "fall", "target": "ball-light" }
    ]
  },
  "prediction": {
    "question": "If both balls are dropped from the same height, which hits the ground first?",
    "options": ["Heavy ball first", "Light ball first", "They land at the same time"],
    "correctAnswer": "They land at the same time"
  },
  "instruction": "Make your prediction, then run the simulation to see what happens",
  "explanation": "Both balls land at the same time. In the absence of significant air resistance, all objects fall at the same rate regardless of mass. Galileo demonstrated this principle centuries ago. Gravity accelerates all objects equally at about 9.8 m/s². Mass affects how much force gravity exerts, but heavier objects also require more force to accelerate, so the effects cancel out.",
  "hints": [
    "Think about what Galileo discovered about falling objects.",
    "Does gravity pull harder on heavier objects? Yes. But does that make them fall faster?"
  ],
  "difficulty": "medium"
}
```

---

#### Screen Type 15: `block_coding`

Learner arranges pseudocode blocks to build a program or algorithm.

| Field | Type | Required | Constraints | Description |
|-------|------|----------|-------------|-------------|
| `id` | string | yes | unique within course | Screen identifier. e.g. `"block-maze-nav"` |
| `type` | `"block_coding"` | yes | literal | Discriminator. |
| `title` | string | yes | min 1 char | The challenge heading. |
| `availableBlocks` | Block[] | yes | min 2 | Pseudocode blocks in the toolbox. |
| `availableBlocks[].id` | string | yes | unique within screen | Block identifier. |
| `availableBlocks[].text` | string | yes | min 1 char | Plain-English block text. e.g. `"Move forward"` |
| `availableBlocks[].type` | `"action"` \| `"condition"` \| `"loop"` \| `"variable"` | yes | | Block category for color coding. |
| `correctSequence` | string[] | yes | min 2 | Block IDs in the correct order. |
| `goal` | string | yes | min 1 char | What the program should accomplish. |
| `maxBlocks` | number | no | integer | Optional max blocks the learner can use. |
| `distractorBlocks` | string[] | no | | Block IDs available but not in the solution. |
| `instruction` | string | yes | min 1 char | Context for the challenge. |
| `explanation` | string | yes | min 20 chars | Explains the correct solution. |
| `hints` | string[] | yes | 1-3 items | Progressive hints. |
| `difficulty` | `"easy"` \| `"medium"` \| `"hard"` | yes | | Difficulty level. |

**Critical rules:** `correctSequence` must reference valid block IDs from `availableBlocks`. `distractorBlocks` lists IDs of blocks available to the learner but NOT part of the correct solution. block_coding MUST ONLY be used for Computer Science / Programming courses. For all other subjects, use subject-appropriate interactive types.

```json
{
  "id": "block-maze-nav",
  "type": "block_coding",
  "title": "Navigate the Robot to the Flag",
  "availableBlocks": [
    { "id": "blk-forward", "text": "Move forward", "type": "action" },
    { "id": "blk-right", "text": "Turn right", "type": "action" },
    { "id": "blk-left", "text": "Turn left", "type": "action" },
    { "id": "blk-if-wall", "text": "If wall ahead", "type": "condition" },
    { "id": "blk-backward", "text": "Move backward", "type": "action" }
  ],
  "correctSequence": ["blk-forward", "blk-forward", "blk-right", "blk-forward"],
  "goal": "Navigate the robot from start to the flag",
  "maxBlocks": 6,
  "distractorBlocks": ["blk-backward", "blk-if-wall"],
  "instruction": "Arrange the blocks to guide the robot through the maze to reach the flag",
  "explanation": "The robot needs to go forward twice to reach the corner, turn right to face the new corridor, then go forward once more to reach the flag. The 'Move backward' and 'If wall ahead' blocks are distractors. This maze requires only simple sequential movement, not conditionals.",
  "hints": [
    "The robot starts facing right. How many steps to the first wall?",
    "After two forward moves, which direction should the robot turn?"
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

A practical naming convention: prefix IDs with their type and a short descriptor. Examples: `"module-basics"`, `"lesson-loops-intro"`, `"mc-loop-types"`, `"fib-for-syntax"`, `"order-algo-steps"`, `"code-hello-world"`, `"match-tools-purpose"`, `"cat-sort-tools"`, `"hot-find-filter"`, `"diag-engine-parts"`, `"graph-plot-growth"`, `"nl-place-fraction"`, `"pat-next-shape"`, `"proc-oil-change"`, `"sim-drop-ball"`, `"block-maze-nav"`.

---

## 3. Pedagogical Guidelines

These principles are adapted from the Thinking Method — a pedagogy built on the idea that the talent should lie in the teaching, not in the learner. Every design decision in a course should be traceable to one or more of these principles.

---

### The Ten Principles

#### 1. Inhabit the Learner's Mental Theatre

The single most important discipline. At every screen, you must know *exactly* what the learner knows, what they don't know, and what they might mistakenly believe. Never assume knowledge you haven't given them.

- Before adding any interactive screen, ask: "Does the learner have *every* piece of information needed to arrive at the answer?" If you can identify even one gap, fill it first.
- When you move content around during editing, rebuild the mental theatre from scratch. A screen that made perfect sense in position 4 might be incomprehensible in position 2.
- Track not just knowledge but *cognitive skills*. Don't require the same mental acrobatics in screen 3 as you might in screen 30. The learner's thinking develops over the course.

**Test:** Read your lesson as if you know *nothing* except what has been explicitly taught so far. If you catch yourself filling in gaps with your own expertise, you've left the mental theatre.

#### 2. Teach One Thought at a Time

What feels to you like "one idea" is often four or five. Break compound concepts into their constituent parts and give each its own moment.

- Before teaching how to do something multi-step, list every separable idea involved. Then find a way to introduce each one independently before requiring them to conspire together.
- If a screen requires the learner to simultaneously learn a new concept AND recall something distant, you're asking for two thoughts at once. Warm up the recall first, *then* introduce the new element.
- Resist the urge to offload everything at once. The sooner *you* feel resolved, the more overwhelmed the *learner* may be. From their perspective, they're just learning and applying one thing — that feels complete enough.

**Test:** For each interactive screen, can you describe the *single new thought* the learner must have? If you need an "and" in that description, you may be asking for two thoughts.

#### 3. Manage Cognitive Load Through Tension Contours

Difficulty is NOT a simple ramp. It's a contour — peaks and troughs, like music or storytelling. You play with this tension deliberately.

- **After a peak** (a challenging screen requiring several pieces of knowledge to conspire), **drop the tension**: follow with an explanation screen, an interesting aside, a simpler application of what was just learned, or a screen that revisits earlier material with a fresh twist.
- **After a trough** (easy material, a digression), **raise the tension**: the learner is rested and ready to bite off something new.
- Avoid both extremes for too long. If cognitive load stays too high, learners panic and start guessing. If it stays too low, they disengage and go on autopilot.
- **Artificial friction:** Occasionally make something *deliberately* harder than it needs to be — omit a hint you could have given, require the learner to recall something without a prompt. This forces active engagement and communicates that the course can't be done on autopilot. Use sparingly and especially in early lessons to set expectations.

**Test:** Map the cognitive load of each screen in a lesson on a rough scale. Does it look like a heartbeat (good) or a flat line that suddenly spikes (bad)?

#### 4. Import Knowledge — Don't Reinvent the Wheel

Learners already know more than they think. Your job is to activate and leverage what they already possess.

- **Import unconsciously (by omission):** If the target concept works the same way as something the learner already knows from life or prior screens, *don't explain it*. Superfluous explanations create mental debris — information the learner isn't sure what to do with.
- **Import consciously:** When a concept seems alien, show the learner how they already do a version of it. "You already handle this every time you decide between 'she' and 'her' — that *is* grammatical case." This demystifies new material and reduces resistance.
- **Import negatively (via contrast):** Show how the new concept differs from what they know. The strangeness of the contrast *is* the lesson: "In English you'd say 'I want you to go.' In Spanish, you'll say 'I want that you go.'"

**Test:** For each explanation screen, ask: "Am I describing something the learner already does?" If yes, either cut the explanation or pivot it to show the *difference* from what they know.

#### 5. Reframe — Challenge Convention

You are not bound by how a subject has traditionally been explained. If you find a clearer, more coherent framing — even if it contradicts textbooks — use it, provided the subject itself supports it.

- Look for explanations that reduce the number of independent rules. One overarching idea that covers five cases is better than five separate rules.
- Be suspicious of conventions you're reproducing without questioning. Ask: "Is this the best way to explain this, or just the way I was taught?"
- BUT: don't reframe for the sake of novelty. The subject has the final say. If your creative reframe doesn't hold up across the whole domain, abandon it.

**Test:** Can a learner who has internalized your framing correctly handle cases they've *never seen in the course*? If yes, your framing is probably better than teaching each case independently.

#### 6. Weave — The Order IS the Lesson

The sequence in which you present information is one of your most powerful teaching tools. Don't follow traditional topic ordering blindly.

- **Pre-insert:** Before teaching a new concept, make sure you've already visited its prerequisite ideas — possibly disguised as other lessons entirely. When the new concept arrives, the learner should only need to add *one new thought* on top of what they already know.
- **Foreshadow:** Plant seeds early that you'll harvest later. A casual observation in Lesson 2 becomes the foundation of a major explanation in Lesson 8.
- **Interleave:** Don't exhaust one topic vertically before moving to the next. Weave between topics so that practicing Topic A simultaneously reinforces Topic B.
- **Save common phrases/vocabulary for when they're structurally useful**, not just because they're "basic." "How are you?" might belong in lesson 15, not lesson 1, if that's when the structure behind it can be properly understood.

**Test:** Can you remove any single lesson from the sequence without breaking the ones that follow? If yes, you haven't woven tightly enough.

#### 7. Mask Repetition

Learners need to encounter key ideas many times. But overt repetition is boring, disengaging, and actually *counterproductive* — it encourages the mind to abandon conscious thought in favor of autopilot shortcuts.

- **Repetition through variation:** When revisiting a concept, change *something* — the vocabulary, the context, the screen type, the difficulty. The learner practices the same skill without feeling like they're repeating.
- **Repetition through weaving:** When your focus is on Topic B, you can still require knowledge of Topic A to build the sentences/problems. That's invisible repetition of A.
- **Repetition through feedback:** After a learner answers correctly, relay back *the process* they used, not just "correct." This repeats the rule without feeling repetitive: "Good — you removed the ending and added the new one, shifting the stress back."
- **Vary your wording:** Say the same thing three different ways across three screens. This also cues the learner not to memorize literal instructions but to understand the *action*.

**Test:** Search your lesson for any screen that feels like "the same thing again." If it does to you, it will feel even more repetitive to the learner. Find a way to make it novel while preserving the practice.

#### 8. Cue — Teach Implicitly

Much of your teaching happens below the surface, through what you choose to explain, what you omit, and how you structure things.

- **Cue different types of information.** Not everything you present is equally vital. Use callouts for genuinely important tips. Use explanation screen tone to signal "this is interesting context" vs. "this is load-bearing knowledge."
- **Cue how to engage.** If the course can't be done on autopilot, show that early. Include a screen in the first lesson that requires the learner to *think* rather than pattern-match. (This is where artificial friction earns its keep.)
- **Cue implicit imports.** If you haven't told the learner something is different, they should be able to assume it works the way they'd expect. Design your course so that assumption holds.
- **Avoid miscueing.** Don't use cheap mnemonic tricks (arbitrary rhymes, acronyms) that blur the line between meaningful understanding and shallow memorization. If everything comes with a "hook," learners expect hooks and stop looking for real understanding.

**Test:** Remove all explicit instructions from a screen. Can the learner still figure out what to do from the structure and context alone? If yes, your cueing is strong.

#### 9. Correct Correctly — Errors Are Gold

Wrong answers are not failures. They are windows into the learner's thinking.

- **Design distractors that teach.** Every wrong option in a multiple choice should represent a *real* mistake a thoughtful learner might make. "None of the above" and joke answers waste a teaching opportunity.
- **Explain the wrong answers.** In the explanation field, don't just say why the right answer is right. Say why the most tempting wrong answer is wrong and *what thinking led to it*.
- **Preventative correction:** If you know a common misconception exists, address it *before* the learner encounters it. Use an explanation screen to say "You might be tempted to think X — here's why that doesn't hold up."
- **Progressive hints are a correction mechanism.** First hint: redirect attention. Second hint: stronger clue. Third hint: nearly the answer. Hints should help the learner find the *thought process*, not just the answer.

**Test:** For each interactive screen, can you name the specific misconception each wrong answer targets? If your distractors are random filler, redesign them.

#### 10. Increase Learning Consciousness

The best courses don't just teach content — they teach learners *how to think* about the subject. Make thinking visible.

- **Name the mental moves.** When possible, tell learners what they just did cognitively: "You just broke a complex problem into parts and solved each one independently. That's decomposition."
- **Show the meta-pattern.** When the same type of thinking appears across different topics, point it out. "Notice how we're doing the same thing here as in Lesson 3 — finding the general rule, then handling the exceptions."
- **Bridge to the real world.** Describe how the learner can use what they've learned to decode new information they encounter outside the course. The course should make them independent learners, not dependent on more courses.

**Test:** After completing your course, would a learner be able to *teach themselves* the next level of the subject? If your course only transfers facts, it fails. If it transfers a way of thinking, it succeeds.

---

### Lesson Structure

These ten principles shape lesson structure, not the other way around. That said, a reliable rhythm helps:

1. **Hook** (explanation screen). Open with an engaging question, a surprising fact, or a relatable scenario. Don't start with definitions. Start with curiosity. Activate what the learner already knows (Principle 4: Import Knowledge).

2. **Guided exploration** (1-2 easy interactive screens). Let the learner poke at the concept before you name it. Build intuition through doing, not reading. Only introduce *one new thought* per screen (Principle 2).

3. **Concept reveal** (explanation screen). Now name the formal concept. Connect it back to what the learner just experienced. "That pattern you just used? It's called a for loop." (Principle 5: Reframe if you can find a better explanation than convention offers.)

4. **Practice with tension contours** (3-5 interactive screens). NOT a simple ramp. Raise difficulty, then drop it with a variation or perspective shift, then raise again. Mix screen types. Mask repetition (Principle 7) by changing context while practicing the same skill.

5. **Extension or edge case** (1-2 screens). Introduce a twist, a common mistake, or an edge case. This cements understanding by showing where the concept's boundaries are. Use preventative correction (Principle 9) to address misconceptions before they solidify.

### Screen Type Selection Guide

| When you want to... | Use this screen type | Thinking Method alignment |
|---------------------|---------------------|---------------------------|
| Introduce a concept, tell a story, show syntax | `explanation` | Reset tension contours (P3). Import knowledge (P4). Reframe (P5). |
| Test recognition or understanding of a concept | `multiple_choice` | Distractors target real misconceptions (P9). Mask repetition via varied contexts (P7). |
| Practice recall of specific terms, syntax, or values | `fill_in_blank` | One thought at a time (P2). Accept answer variations to avoid punishing dialect/style. |
| Teach sequential processes or prioritization | `ordering` | Weave (P6) — order items to foreshadow a concept, not just test recall. |
| Build real problem-solving skill with code (CS/Programming only) | `code_block` | Artificial friction (P3). Starter code imports knowledge (P4). |
| Connect related pairs or concepts | `matching` | Import knowledge (P4) by connecting new to known. |
| Sort items into groups by shared property | `categorization` | Increase consciousness (P10) — sorting forces learners to articulate the *rule*. |
| Identify parts or features on an image | `hotspot` | Inhabit mental theatre (P1) — only ask about what's been taught. |
| Label components on a diagram or schematic | `diagram_label` | One thought at a time (P2) — don't label everything at once. |
| Plot data, adjust curves, or explore graph relationships | `interactive_graph` | Tension contours (P3) — use after explanation to apply new knowledge. |
| Place values on a scale, timeline, or continuum | `number_line` | Import knowledge (P4) — leverage spatial intuition learners already have. |
| Recognize and continue patterns or sequences | `pattern_builder` | Increase consciousness (P10) — pattern recognition IS thinking about thinking. |
| Teach multi-step procedures with reasoning | `process_stepper` | Teach one thought at a time (P2). Justifications make thinking visible (P10). |
| Run predict-then-observe experiments | `simulation` | Artificial friction at its best — prediction forces commitment before the answer. |
| Teach algorithmic thinking with pseudocode blocks (CS/Programming only) | `block_coding` | Weave (P6) — distractor blocks test whether the learner is thinking or pattern-matching. |

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

### Matching Screens
- [ ] 2-8 pairs per screen
- [ ] No duplicate left or right values
- [ ] Pairs are meaningfully related (not random)
- [ ] Explanation is at least 20 characters

### Categorization Screens
- [ ] 2-4 categories per screen
- [ ] 4-12 items per screen
- [ ] Every `items[].categoryId` references a valid `categories[].id`
- [ ] Items are distributed across categories (not all in one bucket)
- [ ] Explanation is at least 20 characters

### Hotspot Screens
- [ ] At least 2 hotspots per screen
- [ ] All position values (x, y, width, height) are percentages 0-100
- [ ] `correctHotspotIds` reference valid hotspot IDs
- [ ] `imageAlt` provides meaningful accessibility text
- [ ] Explanation is at least 20 characters

### Diagram Label Screens
- [ ] 2-10 labels per screen
- [ ] `targetX` and `targetY` are percentages 0-100
- [ ] No duplicate label text
- [ ] `imageAlt` provides meaningful accessibility text
- [ ] Explanation is at least 20 characters

### Interactive Graph Screens
- [ ] At least 1 targetData point
- [ ] `tolerance` is set to a reasonable value for the axis scale
- [ ] `xAxis` and `yAxis` have labels, min, and max
- [ ] `sliders` are only used with `adjust_slider` graphType
- [ ] Explanation is at least 20 characters

### Number Line Screens
- [ ] At least 1 marker
- [ ] Marker `correctValue` falls within `min`-`max` range
- [ ] `customLabels` is provided when `displayMode` is `"custom_labels"`
- [ ] `tolerance` is reasonable for the step size
- [ ] Explanation is at least 20 characters

### Pattern Builder Screens
- [ ] At least 3 sequence items
- [ ] Some items have `revealed: true`, some `revealed: false`
- [ ] Options include correct values for all hidden positions plus distractors
- [ ] At least 2 options
- [ ] Explanation is at least 20 characters

### Process Stepper Screens
- [ ] 2-10 steps per screen
- [ ] Steps are provided in correct order (renderer shuffles them)
- [ ] When `requireJustification` is true, each step has a `justification` field
- [ ] Explanation is at least 20 characters

### Simulation Screens
- [ ] At least 1 object and 1 rule in scenario
- [ ] `prediction.options` is either an array of 2+ strings or `"numeric"`
- [ ] `prediction.correctAnswer` matches one of the options (or is a number for numeric)
- [ ] Learner predicts BEFORE observing the result
- [ ] Explanation is at least 20 characters

### Block Coding Screens
- [ ] At least 2 availableBlocks
- [ ] `correctSequence` references valid block IDs from `availableBlocks`
- [ ] `distractorBlocks` (if present) reference valid block IDs
- [ ] Only used for Computer Science / Programming courses
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

### Thinking Method Alignment (run for every lesson)
- [ ] **Mental theatre:** For every interactive screen, the learner has been given ALL prerequisite knowledge in prior screens. No assumed knowledge.
- [ ] **One thought at a time:** Each interactive screen tests exactly one new idea. No screen requires two simultaneous new concepts.
- [ ] **Tension contours:** Difficulty is NOT monotonically increasing. There are deliberate drops after peaks (e.g., an explanation screen or a simpler application after a hard challenge).
- [ ] **Knowledge import:** No explanation screen describes something the learner already knows from life or prior screens without adding new insight. If they already know it, skip it or show what's *different*.
- [ ] **Weaving:** Later screens rely on knowledge from earlier ones, even when the topic has changed. Concepts are interleaved, not isolated.
- [ ] **Masked repetition:** Key concepts appear in 3+ screens across the lesson, but no two screens feel like "the same exercise again." Context, screen type, or framing differs each time.
- [ ] **Distractors teach:** Every wrong option in multiple choice represents a specific, nameable misconception — not random filler.
- [ ] **Explanations address errors:** Explanation fields discuss why the most tempting wrong answer is wrong, not just why the correct answer is correct.
- [ ] **No artificial mnemonics:** No cheap memory tricks (rhymes, acronyms) that substitute for understanding. Connections between ideas must be meaningful.
- [ ] **Builds independence:** By the end of the lesson, the learner could encounter a novel case of this concept and reason through it — the course teaches *thinking*, not just *facts*.

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

There are 15 screen types, discriminated by the `type` field:

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
code_block MUST ONLY be used for Computer Science / Programming courses. For all other subjects, use subject-appropriate interactive types.

### matching
```json
{
  "id": "string",
  "type": "matching",
  "title": "string",
  "pairs": [
    { "id": "pair-1", "left": "Wrench", "right": "Tighten bolts" },
    { "id": "pair-2", "left": "Screwdriver", "right": "Drive screws" }
  ],
  "instruction": "Match each tool to its purpose (optional)",
  "explanation": "string (min 20 chars)",
  "hints": ["string (1-3 progressive hints)"],
  "difficulty": "easy | medium | hard"
}
```
Rules: 2-8 pairs. Each pair has a left and right value. Left items appear in original order, right items are shuffled by the renderer. No duplicate left or right values.

### categorization
```json
{
  "id": "string",
  "type": "categorization",
  "title": "string",
  "categories": [{ "id": "string", "label": "string" }],
  "items": [{ "id": "string", "text": "string", "categoryId": "string" }],
  "instruction": "string (optional)",
  "explanation": "string (min 20 chars)",
  "hints": ["string (1-3 progressive hints)"],
  "difficulty": "easy | medium | hard"
}
```
Rules: 2-4 categories. 4-12 items. Each item's categoryId must reference a valid category id.

### hotspot
```json
{
  "id": "string",
  "type": "hotspot",
  "title": "string",
  "imageUrl": "string",
  "imageAlt": "string",
  "hotspots": [{ "id": "string", "x": 50, "y": 30, "width": 15, "height": 15, "label": "string" }],
  "correctHotspotIds": ["string"],
  "selectionMode": "single | multiple",
  "instruction": "string",
  "explanation": "string (min 20 chars)",
  "hints": ["string (1-3 progressive hints)"],
  "difficulty": "easy | medium | hard"
}
```
Rules: At least 2 hotspots. x, y, width, height are percentages (0-100). correctHotspotIds must reference valid hotspot IDs.

### diagram_label
```json
{
  "id": "string",
  "type": "diagram_label",
  "title": "string",
  "imageUrl": "string",
  "imageAlt": "string",
  "labels": [{ "id": "string", "text": "string", "targetX": 50, "targetY": 30 }],
  "instruction": "string",
  "explanation": "string (min 20 chars)",
  "hints": ["string (1-3 progressive hints)"],
  "difficulty": "easy | medium | hard"
}
```
Rules: 2-10 labels. targetX and targetY are percentages (0-100). No duplicate label text.

### interactive_graph
```json
{
  "id": "string",
  "type": "interactive_graph",
  "title": "string",
  "graphType": "plot_points | adjust_slider | draw_line",
  "xAxis": { "label": "string", "min": 0, "max": 10, "step": 1 },
  "yAxis": { "label": "string", "min": 0, "max": 10, "step": 1 },
  "existingData": [{ "x": 1, "y": 2, "label": "optional" }],
  "targetData": [{ "x": 5, "y": 7 }],
  "tolerance": 0.5,
  "sliders": [{ "id": "string", "label": "string", "min": 0, "max": 10, "step": 1, "defaultValue": 5 }],
  "instruction": "string",
  "explanation": "string (min 20 chars)",
  "hints": ["string (1-3 progressive hints)"],
  "difficulty": "easy | medium | hard"
}
```
Rules: At least 1 targetData point. tolerance defines acceptable error. existingData and sliders are optional.

### number_line
```json
{
  "id": "string",
  "type": "number_line",
  "title": "string",
  "min": 0, "max": 10, "step": 1,
  "showLabels": true,
  "markers": [{ "id": "string", "correctValue": 5, "label": "optional", "color": "optional" }],
  "tolerance": 0.5,
  "displayMode": "integer | decimal | fraction | custom_labels",
  "customLabels": { "0": "1900", "5": "1950" },
  "instruction": "string",
  "explanation": "string (min 20 chars)",
  "hints": ["string (1-3 progressive hints)"],
  "difficulty": "easy | medium | hard"
}
```
Rules: At least 1 marker. customLabels required when displayMode is "custom_labels".

### pattern_builder
```json
{
  "id": "string",
  "type": "pattern_builder",
  "title": "string",
  "sequence": [{ "position": 1, "value": "string", "revealed": true }],
  "options": [{ "id": "string", "value": "string" }],
  "patternType": "visual | numeric | text",
  "visualAssets": { "key": "imageUrl" },
  "instruction": "string",
  "explanation": "string (min 20 chars)",
  "hints": ["string (1-3 progressive hints)"],
  "difficulty": "easy | medium | hard"
}
```
Rules: At least 3 sequence items. At least 2 options. Some revealed, some hidden.

### process_stepper
```json
{
  "id": "string",
  "type": "process_stepper",
  "title": "string",
  "steps": [{ "id": "string", "text": "string", "justification": "optional" }],
  "requireJustification": false,
  "justificationPrompt": "optional string",
  "instruction": "string",
  "explanation": "string (min 20 chars)",
  "hints": ["string (1-3 progressive hints)"],
  "difficulty": "easy | medium | hard"
}
```
Rules: 2-10 steps in correct order (renderer shuffles). When requireJustification is true, steps should have justification fields.

### simulation
```json
{
  "id": "string",
  "type": "simulation",
  "title": "string",
  "scenario": {
    "objects": [{ "id": "string", "type": "string", "label": "string", "x": 50, "y": 10, "properties": { "mass": 5 } }],
    "parameters": [{ "id": "string", "label": "string", "min": 0, "max": 100, "step": 1, "defaultValue": 50, "unit": "optional" }],
    "rules": [{ "trigger": "string", "action": "string", "target": "string" }]
  },
  "prediction": {
    "question": "string",
    "options": ["option1", "option2"],
    "correctAnswer": "string or number",
    "tolerance": 0.5
  },
  "instruction": "string",
  "explanation": "string (min 20 chars)",
  "hints": ["string (1-3 progressive hints)"],
  "difficulty": "easy | medium | hard"
}
```
Rules: At least 1 object and 1 rule. prediction.options is an array of 2+ strings or "numeric". Learner predicts FIRST, then observes.

### block_coding
```json
{
  "id": "string",
  "type": "block_coding",
  "title": "string",
  "availableBlocks": [{ "id": "string", "text": "string", "type": "action | condition | loop | variable" }],
  "correctSequence": ["block-id-1", "block-id-2"],
  "goal": "string",
  "maxBlocks": 10,
  "distractorBlocks": ["block-id-unused"],
  "instruction": "string",
  "explanation": "string (min 20 chars)",
  "hints": ["string (1-3 progressive hints)"],
  "difficulty": "easy | medium | hard"
}
```
Rules: At least 2 availableBlocks. correctSequence references valid block IDs. block_coding MUST ONLY be used for Computer Science / Programming courses.

## ID Rules

All IDs must be unique within the entire course:
- Module IDs: unique across the course
- Lesson IDs: unique across the course (not just within a module)
- Screen IDs: unique across the course (not just within a lesson)
- Option/blank/item IDs: unique within their screen

Use descriptive prefixes: "module-", "lesson-", "mc-", "fib-", "order-", "code-", "explain-", "match-", "cat-", "hot-", "diag-", "graph-", "nl-", "pat-", "proc-", "sim-", "block-".

## Lesson Structure (Thinking Method)

Follow this rhythm for each lesson:
1. Hook (explanation) - engaging question, surprising fact, or activation of prior knowledge (Import Knowledge)
2. Guided exploration (1-2 easy interactive screens) - build intuition through ONE new thought per screen
3. Concept reveal (explanation) - name the formal concept, Reframe if you have a better explanation than convention
4. Practice with tension contours (3-5 interactive screens) - NOT a flat ramp. Raise difficulty, drop it with a variation or context shift, raise again. Mask repetition by changing context while practicing the same skill
5. Extension (1-2 screens) - edge case, twist, or preventative correction of common misconceptions

Key Thinking Method rules:
- Inhabit the learner's mental theatre: never assume knowledge not yet given
- One thought at a time: decompose compound ideas into atomic screens
- Weave: the ORDER of content is a teaching tool. Pre-insert prerequisites, foreshadow future concepts
- Mask repetition: repeat key ideas 3+ times but always in different contexts/screen types
- Correct correctly: every distractor targets a real misconception. Explanations address WHY wrong answers are wrong
- Import knowledge: if learners already know something, don't re-explain it — leverage it
- Artificial friction: occasionally omit hints or increase difficulty to force active engagement (sparingly, especially in first lessons)

## Quality Rules (The Thinking Method)

These rules are derived from the Thinking Method pedagogy. They are non-negotiable.

### The Ten Principles — Apply to Every Screen

1. **Inhabit the learner's mental theatre.** At every screen, the learner must have ALL information needed to answer. Never assume knowledge you haven't explicitly taught. When you reorder screens during editing, re-verify this from scratch.
2. **Teach one thought at a time.** Each interactive screen introduces exactly ONE new idea. If you need "and" to describe what's new, split it into two screens.
3. **Manage cognitive load through tension contours.** Difficulty is NOT a flat ramp. It's peaks and troughs. Follow a hard screen with an easier one or an explanation. Use *artificial friction* sparingly — make something deliberately harder to prevent autopilot.
4. **Import knowledge — don't reinvent the wheel.** If learners already know something (from life or earlier screens), don't re-explain it. Leverage it. Show them they already possess the skill.
5. **Reframe.** If you find a clearer explanation than convention offers, use it. One overarching idea covering five cases beats five independent rules.
6. **Weave.** The ORDER of screens and lessons is a teaching tool. Pre-insert prerequisites. Foreshadow future concepts. Interleave topics so practicing one reinforces another.
7. **Mask repetition.** Repeat constantly but disguise it. Change context, screen type, wording, or difficulty. Never make two consecutive screens feel like "the same thing again."
8. **Cue implicitly.** Not everything needs explicit instruction. Use screen structure, callout tone, and omission to guide behavior. Avoid cheap mnemonic tricks that blur understanding.
9. **Correct correctly.** Every distractor targets a real misconception. Explanations address WHY wrong answers are wrong, not just why the right one is right. Hints guide the *thought process*, not just toward the answer.
10. **Increase learning consciousness.** Name the mental moves learners are making. Show meta-patterns across topics. Build learners who can teach themselves, not learners dependent on more courses.

### Structural Rules

- Intuition before formalism: let learners solve before naming the concept
- Hints are progressive: first = nudge, last = nearly the answer
- Multiple choice distractors must be plausible mistakes, not jokes
- Fill-in-blank acceptedAnswers should include common variations
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

#### Matching
| Rule | Severity |
|------|----------|
| Must have at least 2 pairs | error |
| No duplicate pair IDs | error |
| No duplicate left values | error |
| No duplicate right values | error |

#### Categorization
| Rule | Severity |
|------|----------|
| Must have 2-4 categories | error |
| Must have 4-12 items | error |
| Every `items[].categoryId` must reference a valid `categories[].id` | error |
| No duplicate category IDs | error |
| No duplicate item IDs | error |

#### Hotspot
| Rule | Severity |
|------|----------|
| Must have at least 2 hotspots | error |
| `x`, `y` must be 0-100 | error |
| `width`, `height` must be 1-100 | error |
| `correctHotspotIds` must reference valid hotspot IDs | error |
| `imageUrl` must be non-empty | error |
| `imageAlt` must be non-empty | error |

#### Diagram Label
| Rule | Severity |
|------|----------|
| Must have 2-10 labels | error |
| `targetX`, `targetY` must be 0-100 | error |
| No duplicate label text | error |
| `imageUrl` must be non-empty | error |
| `imageAlt` must be non-empty | error |

#### Interactive Graph
| Rule | Severity |
|------|----------|
| Must have at least 1 targetData point | error |
| `tolerance` must be >= 0 | error |
| `xAxis` and `yAxis` must have label, min, and max | error |

#### Number Line
| Rule | Severity |
|------|----------|
| Must have at least 1 marker | error |
| `tolerance` must be >= 0 | error |
| `customLabels` required when `displayMode` is `"custom_labels"` | error |

#### Pattern Builder
| Rule | Severity |
|------|----------|
| Must have at least 3 sequence items | error |
| Must have at least 2 options | error |
| `position` must be a positive integer | error |

#### Process Stepper
| Rule | Severity |
|------|----------|
| Must have 2-10 steps | error |
| No duplicate step IDs | error |

#### Simulation
| Rule | Severity |
|------|----------|
| Must have at least 1 object in scenario | error |
| Must have at least 1 rule in scenario | error |
| `prediction.options` must be an array of 2+ strings or `"numeric"` | error |

#### Block Coding
| Rule | Severity |
|------|----------|
| Must have at least 2 availableBlocks | error |
| `correctSequence` must have at least 2 entries | error |
| `correctSequence` IDs must reference valid `availableBlocks` IDs | error |
| `distractorBlocks` IDs must reference valid `availableBlocks` IDs | error |

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
Screen types:     explanation, multiple_choice, fill_in_blank, ordering,
                  code_block, matching, categorization, hotspot,
                  diagram_label, interactive_graph, number_line,
                  pattern_builder, process_stepper, simulation,
                  block_coding
Difficulty:       easy, medium, hard
Hints:            1-3 per interactive screen, progressive
Explanation:      min 20 chars on all interactive screens
Blanks:           {{blank}} marker count must match blanks array length
Ordering:         correctOrder IDs must exactly match items IDs
Categorization:   2-4 categories, 4-12 items, each item refs a category
Hotspot:          x/y/width/height as percentages, correctHotspotIds required
Diagram label:    2-10 labels, targetX/targetY as percentages
Graph:            at least 1 targetData point, tolerance required
Number line:      customLabels required for custom_labels displayMode
Pattern:          min 3 sequence items, mix of revealed and hidden
Process stepper:  2-10 steps in correct order, renderer shuffles
Simulation:       predict first then observe, min 1 object + 1 rule
Block coding:     CS/Programming courses ONLY, min 2 blocks
Code block:       CS/Programming courses ONLY, min 1 test case
Code languages:   python, javascript, typescript, java, c, cpp, c++,
                  csharp, c#, go, rust, ruby, php, swift, kotlin,
                  scala, r, sql, bash, shell, html, css
ID uniqueness:    module/lesson/screen IDs unique across entire course
Lesson rhythm:    hook → explore → reveal → practice → extend
```
