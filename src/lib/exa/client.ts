import Exa from 'exa-js'

let _client: Exa | null = null

/** Whether EXA_API_KEY is set. Gates Exa calls vs fallback responses. */
export function isExaConfigured(): boolean {
  return !!process.env.EXA_API_KEY
}

/** Singleton Exa client. Returns null when API key is missing. */
export function getExaClient(): Exa | null {
  if (!isExaConfigured()) {
    return null
  }
  if (!_client) {
    _client = new Exa(process.env.EXA_API_KEY!)
  }
  return _client
}
