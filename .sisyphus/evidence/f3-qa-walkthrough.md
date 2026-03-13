# F3: Real QA Walkthrough

**Date:** 2026-03-13
**Tester:** Automated (Playwright + Claude)
**Environment:** bun run dev on localhost:3000

---

## Dev Server: PASS
- `bun run dev` starts successfully
- Server responds with HTTP 200 at localhost:3000

## Home Page: PASS
- "Brilliance" branding visible in nav and hero heading
- Hero subtitle: "Master concepts through interactive lessons crafted by AI"
- Course catalog shows "Calendar in Your Head" with description
- Course card shows 3 modules, 7 lessons
- **Screenshot:** `final-qa/home-page.png`

## Course Page: PASS
- Course title "Calendar in Your Head" renders correctly
- Full course description displayed
- Course progress indicator: 0/7 lessons (before interaction)
- 3 modules shown with correct headings:
  1. Foundation (2 lessons)
  2. The Algorithm (3 lessons)
  3. Mastery (2 lessons)
- All 7 lessons listed with titles, descriptions, screen counts, and status
- All initially show "Not started"
- **Screenshot:** `final-qa/course-page.png`

## Lesson Player: PASS
- Loads with course name ("Calendar in Your Head") and lesson title
- Progress indicator shows "X of Y" (e.g., "1 of 5")
- Progress bar visualizes completion
- Screens sequence correctly with transitions
- "Got it!" advances explanation screens
- Lesson complete screen shows results (3/3 correct, 0 hints used)
- "Back to Course" link returns to course page
- **Screenshots:** `final-qa/lesson-explanation.png`, `final-qa/lesson-complete.png`

## Screen Types

### Explanation: PASS
- Rich content renders (paragraphs, bold, emphasis, lists)
- Callout/tip box with icon renders correctly
- "Got it!" button advances to next screen
- **Screenshot:** `final-qa/lesson-explanation.png`

### Multiple Choice: PASS
- Question and 4 options (A-D) display correctly
- Options are selectable (active state indicated)
- "Check Answer" button disabled until selection made
- "Check Answer" enables after selecting an option
- **Wrong answer flow:** "Not quite!" feedback with explanation, "Try Again" button re-enables options
- **Correct answer flow:** "Correct!" feedback with explanation, checkmark icon on selected answer, "Continue" button
- "Need a hint?" button present
- **Screenshots:** `final-qa/lesson-mc-wrong.png`, `final-qa/lesson-mc.png`

### Fill-in-blank: PASS
- Inline text with embedded input fields renders correctly
- Multiple blanks supported in single screen
- Inputs accept text entry
- "Check Answers" button disabled until all blanks filled
- Correct answers show green checkmark icons
- "Correct!" feedback with explanation
- **Screenshot:** `final-qa/lesson-fib.png`

### Ordering: PASS
- "Drag items into the correct order" instruction shown
- Drag handle buttons visible for each item
- Numbered items (1-6) with descriptions
- **Drag-and-drop works** — items reorder when dragged via mouse
- Status announcements for accessibility (e.g., "Draggable item step-year was dropped over droppable area step-century")
- "Check Answer" verifies order
- "Correct!" feedback with explanation
- Items disable after correct answer
- **Screenshots:** `final-qa/lesson-ordering.png`, `final-qa/lesson-ordering-correct.png`

### Code Block: PASS
- Title "Build the Day Calculator" renders
- Language indicator "javascript" shown
- Line numbers (1-15) displayed
- Editable textarea with starter code pre-populated
- Editor accepts code input (fill/type)
- "Run Code" button executes code against test cases
- Test results panel: "3/3 passed" with individual test case results
- Each test shows input, expected output, and pass/fail icon
- "Correct!" feedback with algorithm explanation
- "Need a hint?" button present
- **Screenshots:** `final-qa/lesson-code.png`, `final-qa/lesson-code-passed.png`

## Progress Persistence: PASS (with note)
- **localStorage data persists across page reload:** PASS
  - Key: `brilliance-progress-calendar-trick`
  - Stores courseId, lessonProgress (per lesson), screenResults, timestamps
- **Course page reflects progress after reload:** PASS
  - Completed lessons show "Completed" status
  - In-progress lessons show "In progress" status
  - Overall course progress updates (1/7 lessons, 7 of 42 screens)
- **Lesson player does NOT resume from saved screen position:** NOTE
  - After reload, lesson starts from screen 1 instead of saved currentScreenIndex
  - This may be intentional (re-learn on revisit) but worth noting as potential UX improvement

## Dark Mode: PASS
- Theme toggle button in top-right navigation works
- Dark backgrounds throughout (no white background leaks)
- Text highly readable with good contrast
- Progress bars, buttons, and icons all visible
- Callout boxes styled appropriately for dark theme
- Course cards, module sections all render correctly
- **Screenshots:** `final-qa/dark-mode.png`, `final-qa/dark-mode-home.png`, `final-qa/dark-mode-course.png`

---

## Issues Found

1. **Lesson resume position (Low severity):** When navigating back to an in-progress lesson, the player starts from screen 1 instead of the saved `currentScreenIndex`. The progress data IS correctly persisted in localStorage, but the lesson player doesn't use it to resume position. This could be intentional design (encouraging re-review) but may frustrate users who want to pick up where they left off.

2. **Lesson l5 progress status inconsistency (Low severity):** Lesson 5 ("Putting It All Together") was partially interacted with (3 screens navigated, ordering screen completed) but shows "Not started" on the course page. The localStorage shows `currentScreenIndex: 2` with empty `screenResults: {}`. The ordering screen result wasn't stored because the user navigated away after getting "Correct!" but before clicking "Continue." The display logic may need to check both `currentScreenIndex > 0` and `screenResults` for progress status.

## Screenshots Index

| File | Description |
|------|-------------|
| `final-qa/home-page.png` | Home page with course catalog |
| `final-qa/course-page.png` | Course page with all 7 lessons |
| `final-qa/lesson-explanation.png` | Explanation screen type |
| `final-qa/lesson-mc-wrong.png` | Multiple choice - wrong answer feedback |
| `final-qa/lesson-mc.png` | Multiple choice - correct answer feedback |
| `final-qa/lesson-fib.png` | Fill-in-blank screen - correct |
| `final-qa/lesson-ordering.png` | Ordering screen - initial state |
| `final-qa/lesson-ordering-correct.png` | Ordering screen - correct answer |
| `final-qa/lesson-code.png` | Code block screen - starter code |
| `final-qa/lesson-code-passed.png` | Code block screen - all tests passed |
| `final-qa/lesson-complete.png` | Lesson completion screen |
| `final-qa/progress-persisted.png` | Course page showing persisted progress |
| `final-qa/dark-mode.png` | Dark mode - lesson view |
| `final-qa/dark-mode-home.png` | Dark mode - home page |
| `final-qa/dark-mode-course.png` | Dark mode - course page |

---

## VERDICT: APPROVE

All 5 screen types work correctly. All core user flows (browse → select course → play lessons → complete screens → track progress) function as expected. Dark mode is well-implemented. The two low-severity issues found are minor UX improvements, not blockers.
