import Anthropic from '@anthropic-ai/sdk'

let _client: Anthropic | null = null

/** Whether ANTHROPIC_API_KEY is set. Gates Claude calls vs fallback responses. */
export function isClaudeConfigured(): boolean {
  return !!process.env.ANTHROPIC_API_KEY
}

/** Singleton Claude client. Returns null when API key is missing. */
export function getClaudeClient(): Anthropic | null {
  if (!isClaudeConfigured()) {
    return null
  }
  if (!_client) {
    _client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
      maxRetries: 0,
    })
  }
  return _client
}

export const ADAPTATION_MODEL = 'claude-sonnet-4-6'
export const ADAPTATION_MAX_TOKENS = 1024

export const GENERATION_MODEL = 'claude-opus-4-6'
export const GENERATION_MAX_TOKENS = 16384
export const INTERVIEW_MODEL = 'claude-opus-4-6'
export const INTERVIEW_MAX_TOKENS = 1024
