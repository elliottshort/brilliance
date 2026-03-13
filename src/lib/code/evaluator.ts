export interface TestCase {
  input: string
  expectedOutput: string
}

export interface TestResult {
  input: string
  expectedOutput: string
  actualOutput: string
  passed: boolean
  error?: string
}

const JS_LANGUAGES = new Set(['javascript', 'js', 'typescript', 'ts'])
const TIMEOUT_MS = 5000

export function evaluateCode(
  code: string,
  testCases: TestCase[],
  language: string
): TestResult[] {
  const lang = language.toLowerCase().trim()

  if (JS_LANGUAGES.has(lang)) {
    return testCases.map((testCase) => evaluateJSTestCase(code, testCase))
  }

  return testCases.map((testCase) => ({
    input: testCase.input,
    expectedOutput: testCase.expectedOutput,
    actualOutput: '',
    passed: false,
    error: `Client-side execution is only available for JavaScript/TypeScript. "${language}" is not supported yet.`,
  }))
}

function evaluateJSTestCase(code: string, testCase: TestCase): TestResult {
  const startTime = Date.now()

  try {
    const wrappedCode = `
      "use strict";
      ${code}
      return String(${testCase.input});
    `

    // eslint-disable-next-line no-new-func
    const fn = new Function(wrappedCode)
    const result = fn()

    const elapsed = Date.now() - startTime
    if (elapsed > TIMEOUT_MS) {
      return {
        input: testCase.input,
        expectedOutput: testCase.expectedOutput,
        actualOutput: '',
        passed: false,
        error: `Execution exceeded ${TIMEOUT_MS / 1000}s. Check for infinite loops.`,
      }
    }

    const actualOutput = String(result).trim()
    const expectedOutput = testCase.expectedOutput.trim()

    return {
      input: testCase.input,
      expectedOutput: testCase.expectedOutput,
      actualOutput,
      passed: actualOutput === expectedOutput,
    }
  } catch (err) {
    return {
      input: testCase.input,
      expectedOutput: testCase.expectedOutput,
      actualOutput: '',
      passed: false,
      error: err instanceof Error ? err.message : String(err),
    }
  }
}
