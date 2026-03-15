import { describe, it, expect, beforeEach, afterEach, mock } from 'bun:test'
import { requestHint, requestExplanation, assessDifficulty } from '../engine'
import type { AdaptationContext } from '../engine'

function makeContext(overrides: Partial<AdaptationContext> = {}): AdaptationContext {
  return {
    courseId: 'course-1',
    lessonId: 'lesson-1',
    screenId: 'screen-1',
    screenData: {
      type: 'multiple_choice',
      title: 'Which is correct?',
      explanation: 'The answer is B because it satisfies the constraint.',
      hints: ['Think about the constraint.'],
    },
    userAnswer: 'A',
    correctAnswer: 'B',
    attemptCount: 1,
    ...overrides,
  }
}

const originalFetch = globalThis.fetch
let mockFetch: ReturnType<typeof mock>

beforeEach(() => {
  mockFetch = mock(() => Promise.resolve({ ok: true, json: () => Promise.resolve({}) }))
  globalThis.fetch = mockFetch as unknown as typeof fetch
})

afterEach(() => {
  globalThis.fetch = originalFetch
})

describe('requestHint', () => {
  it('sends correct POST body to /api/adapt/hint', async () => {
    mockFetch.mockImplementation(() =>
      Promise.resolve({
        ok: true,
        json: async () => ({ hint: 'Try looking at it differently.' }),
      }),
    )

    const ctx = makeContext()
    await requestHint(ctx)

    expect(mockFetch).toHaveBeenCalledTimes(1)
    const [url, opts] = (mockFetch as any).mock.calls[0]
    expect(url).toBe('/api/adapt/hint')
    expect(opts.method).toBe('POST')

    const body = JSON.parse(opts.body)
    expect(body.courseId).toBe('course-1')
    expect(body.lessonId).toBe('lesson-1')
    expect(body.screenId).toBe('screen-1')
    expect(body.userAnswer).toBe('A')
    expect(body.screenData.type).toBe('multiple_choice')
  })

  it('returns the hint text from the response', async () => {
    mockFetch.mockImplementation(() =>
      Promise.resolve({
        ok: true,
        json: async () => ({ hint: 'Try looking at it differently.' }),
      }),
    )

    const result = await requestHint(makeContext())
    expect(result).toBe('Try looking at it differently.')
  })

  it('returns static hint when fetch fails', async () => {
    mockFetch.mockImplementation(() => Promise.reject(new Error('Network error')))

    const result = await requestHint(makeContext())
    expect(result).toBe('Think about the constraint.')
  })

  it('returns static hint when response is not ok', async () => {
    mockFetch.mockImplementation(() => Promise.resolve({ ok: false }))

    const result = await requestHint(makeContext())
    expect(result).toBe('Think about the constraint.')
  })

  it('returns default fallback when no static hints exist', async () => {
    mockFetch.mockImplementation(() => Promise.reject(new Error('fail')))

    const ctx = makeContext({
      screenData: { type: 'multiple_choice', title: 'Q' },
    })
    const result = await requestHint(ctx)
    expect(result).toBe('Try re-reading the question carefully.')
  })
})

describe('requestExplanation', () => {
  it('returns the explanation from the response', async () => {
    mockFetch.mockImplementation(() =>
      Promise.resolve({
        ok: true,
        json: async () => ({ explanation: 'B is correct because...' }),
      }),
    )

    const result = await requestExplanation(makeContext())
    expect(result).toBe('B is correct because...')
  })

  it('returns static explanation on fetch failure', async () => {
    mockFetch.mockImplementation(() => Promise.reject(new Error('fail')))

    const result = await requestExplanation(makeContext())
    expect(result).toBe('The answer is B because it satisfies the constraint.')
  })
})

describe('assessDifficulty', () => {
  it('sends correct body and returns the recommendation', async () => {
    mockFetch.mockImplementation(() =>
      Promise.resolve({
        ok: true,
        json: async () => ({
          recommendation: 'review',
          message: 'You should review the basics.',
          targetLessonId: 'lesson-0',
        }),
      }),
    )

    const results = [
      { screenId: 's1', answeredCorrectly: false, attempts: 3, hintsUsed: 2, answeredAt: '2025-03-15T10:00:00Z' },
      { screenId: 's2', answeredCorrectly: false, attempts: 2, hintsUsed: 1, answeredAt: '2025-03-15T10:01:00Z' },
    ]

    const rec = await assessDifficulty('course-1', 'lesson-1', results)

    expect(mockFetch).toHaveBeenCalledTimes(1)
    const [url, opts] = (mockFetch as any).mock.calls[0]
    expect(url).toBe('/api/adapt/difficulty')
    const body = JSON.parse(opts.body)
    expect(body.courseId).toBe('course-1')
    expect(body.lessonId).toBe('lesson-1')
    expect(body.recentResults).toHaveLength(2)

    expect(rec.recommendation).toBe('review')
    expect(rec.message).toBe('You should review the basics.')
    expect(rec.targetLessonId).toBe('lesson-0')
  })

  it('returns fallback "continue" on fetch failure', async () => {
    mockFetch.mockImplementation(() => Promise.reject(new Error('fail')))

    const results = [
      { screenId: 's1', answeredCorrectly: true, attempts: 1, hintsUsed: 0, answeredAt: '2025-03-15T10:00:00Z' },
    ]

    const rec = await assessDifficulty('course-1', 'lesson-1', results)
    expect(rec.recommendation).toBe('continue')
    expect(rec.message).toBe('Keep going!')
  })

  it('returns fallback immediately for empty results', async () => {
    const rec = await assessDifficulty('course-1', 'lesson-1', [])

    expect(mockFetch).not.toHaveBeenCalled()
    expect(rec.recommendation).toBe('continue')
  })
})
