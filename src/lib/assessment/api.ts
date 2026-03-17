import type { AssessmentPuzzle } from '@/lib/schemas/assessment'

interface PuzzleResponse {
  puzzles: AssessmentPuzzle[]
}

export function fetchPuzzles(topic: string, act: 1 | 2): Promise<PuzzleResponse> {
  return fetch('/api/courses/generate/assess', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ topic, act }),
  }).then((res) => {
    if (!res.ok) throw new Error(`Failed to generate act ${act} puzzles`)
    return res.json() as Promise<PuzzleResponse>
  })
}
