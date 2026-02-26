/**
 * Intent Classifier
 * 
 * Client-side intent classification using keyword matching.
 * No API calls needed — fast and deterministic.
 */

import type { IntentClassification, IntentType } from '@/components/command-center/command-center.types'

const INTENT_KEYWORDS: Record<IntentType, string[]> = {
  build: [
    'build', 'create', 'add', 'make', 'implement', 'develop',
    'new feature', 'enhancement', 'upgrade', 'fix', 'design',
    'need', 'want', 'could we', 'can you build', 'please add'
  ],
  query: [
    'how many', 'what is', 'show me', 'list', 'count', 'status of',
    'which', 'where is', 'who', 'when', 'what are', 'tell me',
    'display', 'get', 'fetch', 'find'
  ],
  report: [
    'report', 'summary', 'what shipped', 'this week', 'this month',
    'last week', 'last month', 'today', 'yesterday', 'metrics',
    'trends', 'performance', 'stats', 'statistics'
  ],
  analyze: [
    'analyze', 'analysis', 'compare', 'top', 'best', 'worst',
    'recommend', 'suggest', 'optimize', 'improve', 'evaluate',
    'assess', 'review', 'priorities', 'workload'
  ],
  operate: [
    'health check', 'restart', 'deploy', 'sync', 'run', 'trigger',
    'check status', 'heartbeat', 'ping', 'test', 'execute',
    'start', 'stop', 'pause', 'resume'
  ],
  unknown: []
}

// Question words indicate query intent
const QUESTION_STARTERS = ['what', 'how', 'why', 'when', 'where', 'who', 'which', 'can', 'do', 'does', 'is', 'are']

/**
 * Extract entities from user input
 */
function extractEntities(input: string): Record<string, string> {
  const lower = input.toLowerCase()
  const entities: Record<string, string> = {}

  // Extract common entity types
  if (lower.includes('agent')) entities.entityType = 'agents'
  if (lower.includes('feature')) entities.entityType = 'features'
  if (lower.includes('pipeline')) entities.entityType = 'pipeline'
  if (lower.includes('priority') || lower.includes('priorities')) entities.entityType = 'priorities'
  
  // Extract time references
  if (lower.includes('today')) entities.timeframe = 'today'
  if (lower.includes('yesterday')) entities.timeframe = 'yesterday'
  if (lower.includes('this week')) entities.timeframe = 'week'
  if (lower.includes('this month')) entities.timeframe = 'month'
  
  // Extract status keywords
  if (lower.includes('active')) entities.status = 'active'
  if (lower.includes('completed') || lower.includes('done')) entities.status = 'completed'
  if (lower.includes('stalled') || lower.includes('stuck')) entities.status = 'stalled'
  
  return entities
}

/**
 * Classify user intent based on keyword matching
 */
export function classifyIntent(input: string): IntentClassification {
  const lower = input.toLowerCase().trim()
  
  // Empty input
  if (!lower) {
    return {
      intent: 'unknown',
      confidence: 0,
      entities: {}
    }
  }

  const scores: Record<IntentType, number> = {
    build: 0,
    query: 0,
    report: 0,
    analyze: 0,
    operate: 0,
    unknown: 0
  }

  // Score each intent based on keyword matches
  for (const [intent, keywords] of Object.entries(INTENT_KEYWORDS)) {
    if (intent === 'unknown') continue
    
    for (const keyword of keywords) {
      if (lower.includes(keyword)) {
        scores[intent as IntentType]++
      }
    }
  }

  // Boost query intent if starts with question word
  const firstWord = lower.split(' ')[0]
  if (QUESTION_STARTERS.includes(firstWord)) {
    scores.query += 2
  }

  // Find the highest scoring intent
  let maxScore = 0
  let topIntent: IntentType = 'unknown'
  
  for (const [intent, score] of Object.entries(scores)) {
    if (score > maxScore) {
      maxScore = score
      topIntent = intent as IntentType
    }
  }

  // If no keywords matched, default to unknown
  if (maxScore === 0) {
    topIntent = 'unknown'
  }

  // Calculate confidence (normalize to 0-1 range)
  // Max realistic score is ~5 keyword matches
  const confidence = Math.min(maxScore / 5, 1)

  // Extract entities
  const entities = extractEntities(input)

  return {
    intent: topIntent,
    confidence,
    entities
  }
}

/**
 * Extract feature title from build intent input
 */
export function extractFeatureTitle(input: string): string {
  const lower = input.toLowerCase()
  
  // Remove common prefixes
  const prefixes = [
    'i want to ', 'i need to ', 'can you ', 'please ', 'could you ',
    'build ', 'create ', 'add ', 'make ', 'implement ', 'develop '
  ]
  
  let cleaned = input.trim()
  for (const prefix of prefixes) {
    if (lower.startsWith(prefix)) {
      cleaned = input.slice(prefix.length).trim()
      break
    }
  }
  
  // Capitalize first letter
  if (cleaned.length > 0) {
    cleaned = cleaned.charAt(0).toUpperCase() + cleaned.slice(1)
  }
  
  // Truncate to reasonable length
  if (cleaned.length > 100) {
    cleaned = cleaned.slice(0, 97) + '...'
  }
  
  return cleaned || input.slice(0, 100)
}

/**
 * Extract priority from input (low/medium/high/urgent)
 */
export function extractPriority(input: string): 'low' | 'medium' | 'high' | 'urgent' {
  const lower = input.toLowerCase()
  
  if (lower.includes('urgent') || lower.includes('critical') || lower.includes('asap')) {
    return 'urgent'
  }
  if (lower.includes('high priority') || lower.includes('important')) {
    return 'high'
  }
  if (lower.includes('low priority') || lower.includes('nice to have')) {
    return 'low'
  }
  
  // Default to medium
  return 'medium'
}
