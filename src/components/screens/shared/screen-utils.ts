export const MAX_ATTEMPTS = 3

export type ScreenPhase = 'idle' | 'interacting' | 'feedback' | 'revealed'

export interface ScreenResult {
  screenId: string
  answeredCorrectly: boolean
  attempts: number
  hintsUsed: number
  answeredAt: string
}

export function createScreenResult(
  screenId: string,
  answeredCorrectly: boolean,
  attempts: number,
  hintsUsed: number,
): ScreenResult {
  return {
    screenId,
    answeredCorrectly,
    attempts,
    hintsUsed,
    answeredAt: new Date().toISOString(),
  }
}
