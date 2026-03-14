import { heartbeat } from '@temporalio/activity'
import { researchTopic } from '../../lib/exa/research'
import type { ResearchResult } from '../../lib/exa/research'
import { summarizeResearch } from '../../lib/claude/generate-course'
import type { ResearchSummary } from '../types'

export async function researchTopicActivity(input: {
  topic: string
  interviewSummary: string
}): Promise<ResearchSummary> {
  heartbeat('Researching topic...')

  const heartbeatInterval = setInterval(() => {
    heartbeat('Still researching topic...')
  }, 20_000)

  let research: ResearchResult
  let summary: string
  try {
    research = await researchTopic(input.topic, input.interviewSummary)
    heartbeat('Summarizing research...')
    summary = summarizeResearch(research)
  } finally {
    clearInterval(heartbeatInterval)
  }

  return {
    summary,
    keyConcepts: research.keyConcepts,
    commonMisconceptions: research.commonMisconceptions,
    prerequisites: research.prerequisites,
    teachingApproaches: research.teachingApproaches,
  }
}
