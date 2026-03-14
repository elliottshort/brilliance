import { getExaClient, isExaConfigured } from './client'

export interface ResearchResult {
  topic: string
  keyConcepts: string[]
  commonMisconceptions: string[]
  prerequisites: string[]
  teachingApproaches: string[]
  rawSources: Array<{ title: string; url: string; excerpt: string }>
  searchesUsed: number
}

function emptyResult(topic: string): ResearchResult {
  return {
    topic,
    keyConcepts: [],
    commonMisconceptions: [],
    prerequisites: [],
    teachingApproaches: [],
    rawSources: [],
    searchesUsed: 0,
  }
}

function extractHighlights(
  results: Array<{ title?: string | null; url: string; highlights?: string[] | null; text?: string | null }>,
): Array<{ title: string; url: string; excerpt: string }> {
  return results
    .filter((r) => r.title && (r.highlights?.length || r.text))
    .map((r) => ({
      title: r.title ?? '',
      url: r.url,
      excerpt: r.highlights?.join(' ') ?? r.text?.slice(0, 500) ?? '',
    }))
}

export async function researchTopic(
  topic: string,
  learnerContext?: string,
): Promise<ResearchResult> {
  if (!isExaConfigured()) {
    return emptyResult(topic)
  }

  const exa = getExaClient()
  if (!exa) {
    return emptyResult(topic)
  }

  const result = emptyResult(topic)
  const sources: Array<{ title: string; url: string; excerpt: string }> = []

  try {
    const [conceptResults, pedagogyResults] = await Promise.all([
      exa.searchAndContents(topic, {
        type: 'auto',
        numResults: 5,
        text: { maxCharacters: 2000 },
        highlights: {
          query: 'key concepts, common misconceptions, prerequisites',
        },
      }),
      exa.searchAndContents(`how to teach ${topic}`, {
        type: 'auto',
        numResults: 3,
        category: 'research paper' as never,
        highlights: {
          query: 'effective teaching methods, common student difficulties',
        },
      }),
    ])
    result.searchesUsed = 2

    sources.push(...extractHighlights(conceptResults.results))
    sources.push(...extractHighlights(pedagogyResults.results))

    if (learnerContext) {
      try {
        const bridgeResults = await exa.searchAndContents(
          `${topic} for ${learnerContext}`,
          {
            type: 'auto',
            numResults: 3,
            highlights: {
              query: 'beginner approach, foundational understanding',
            },
          },
        )
        result.searchesUsed = 3
        sources.push(...extractHighlights(bridgeResults.results))
      } catch {
        // noop: bridge search is best-effort
      }
    }

    result.rawSources = sources.slice(0, 15)

    const allText = sources.map((s) => s.excerpt).join('\n')
    if (allText.length > 0) {
      result.keyConcepts = extractPhrases(allText, [
        'concept',
        'fundamental',
        'principle',
        'key',
        'important',
        'essential',
      ]).slice(0, 8)
      result.commonMisconceptions = extractPhrases(allText, [
        'misconception',
        'mistake',
        'wrong',
        'confus',
        'error',
        'misunderstand',
      ]).slice(0, 5)
      result.prerequisites = extractPhrases(allText, [
        'prerequisite',
        'before',
        'first',
        'need to know',
        'background',
        'foundation',
      ]).slice(0, 5)
      result.teachingApproaches = extractPhrases(allText, [
        'teach',
        'approach',
        'method',
        'strategy',
        'effective',
        'pedagog',
      ]).slice(0, 5)
    }
  } catch {
    return result
  }

  if (result.searchesUsed > 0) {
    const monthKey = `${new Date().getFullYear()}-${new Date().getMonth()}`
    searchBudgetTracker.set(
      monthKey,
      (searchBudgetTracker.get(monthKey) ?? 0) + result.searchesUsed,
    )
    const used = searchBudgetTracker.get(monthKey) ?? 0
    if (used > 900) {
      console.warn(
        `[exa] Monthly search budget warning: ${used}/1000 searches used (month: ${monthKey})`,
      )
    }
  }

  return result
}

const searchBudgetTracker = new Map<string, number>()

function extractPhrases(text: string, keywords: string[]): string[] {
  const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 20)
  const matches = sentences.filter((s) => {
    const lower = s.toLowerCase()
    return keywords.some((kw) => lower.includes(kw))
  })
  return matches
    .map((s) => s.trim())
    .filter((s) => s.length > 20 && s.length < 300)
}
