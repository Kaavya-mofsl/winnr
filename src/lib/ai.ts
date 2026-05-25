// Groq client. Sends anonymized BHS summary, returns findings + talking points.
//
// SECURITY NOTE: VITE_GROQ_API_KEY is bundled into the client JS — fine for
// Phase 1 internal use, NOT safe for public release. Move to a backend proxy
// before shipping to end users.

import type { Position, ClientMeta } from '@/types/trade'
import type { BHSResult } from '@/lib/bhs'
import { anonymize } from '@/lib/anonymize'

export type FindingTag = 'DANGER' | 'WARNING' | 'GOOD'

export interface Finding {
  tag: FindingTag
  title: string
  detail: string
}

export interface AIAnalysis {
  findings: Finding[]
  talkingPoints: string[]
}

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions'

const SYSTEM_PROMPT = `You are a behavioral trading analyst for Indian F&O (futures and options) markets. You analyze anonymized trade summaries for sub-brokers at Motilal Oswal who use this output to advise retail clients.

YOUR TASK
Produce exactly 5 behavioral findings and exactly 4 advisor talking points.

RULES FOR FINDINGS
- Each finding MUST cite specific numbers from the input (percentages, rupee amounts, counts, ratios).
- Use the actual figures provided. Never invent or estimate numbers not in the input.
- Tag each finding:
  - DANGER  = severe behavioral risk (high concentration, revenge trading, large adverse skew)
  - WARNING = concerning pattern that needs monitoring
  - GOOD    = healthy discipline worth reinforcing
- Aim for a realistic mix: not all DANGER, not all GOOD. Match what the data actually says.
- Keep title under 8 words. Keep detail 1–2 sentences, dense with numbers.
- Use Indian rupee notation (₹) and lakh formatting where natural (e.g. ₹5.21L, ₹47,200).

RULES FOR TALKING POINTS
- Conversational sentences a sub-broker can say directly to their client. Indian English tone, plain language.
- Each talking point references the underlying behavior (not jargon).
- Be specific — name instruments, percentages, or amounts where relevant.
- Tone: advisory, not preachy. The sub-broker is a partner, not a teacher.

CONSTRAINTS
- This is behavioral pattern reporting, not investment advice. Do not recommend specific trades.
- Output ONLY valid JSON matching the schema below. No prose before or after the JSON.

RESPONSE SCHEMA
{
  "findings": [
    { "tag": "DANGER" | "WARNING" | "GOOD", "title": "string", "detail": "string" }
  ],
  "talkingPoints": ["string", "string", "string", "string"]
}`

export interface AIError {
  message: string
  hint?: string
}

export class GroqAPIError extends Error {
  hint?: string
  constructor(message: string, hint?: string) {
    super(message)
    this.name = 'GroqAPIError'
    this.hint = hint
  }
}

export async function generateAnalysis(
  positions: Position[],
  bhs: BHSResult,
  client: ClientMeta
): Promise<AIAnalysis> {
  const apiKey = import.meta.env.VITE_GROQ_API_KEY
  const model = import.meta.env.VITE_GROQ_MODEL ?? 'llama-3.3-70b-versatile'

  if (!apiKey || apiKey === 'your-groq-key-here') {
    throw new GroqAPIError(
      'Missing Groq API key',
      'Copy .env.example to .env and set VITE_GROQ_API_KEY, then restart the dev server.'
    )
  }

  const summary = anonymize(positions, bhs, client)

  const userMessage = `Analyze this anonymized trader summary. Return JSON only.

DATA:
${JSON.stringify(summary, null, 2)}`

  const res = await fetch(GROQ_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userMessage },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.3,
    }),
  })

  if (!res.ok) {
    const errText = await res.text().catch(() => '')
    throw new GroqAPIError(
      `Groq API error: ${res.status} ${res.statusText}`,
      errText.slice(0, 500)
    )
  }

  const data = (await res.json()) as {
    choices: { message: { content: string } }[]
  }
  const raw = data.choices?.[0]?.message?.content
  if (!raw) {
    throw new GroqAPIError('Empty response from Groq')
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    throw new GroqAPIError('Groq returned non-JSON content', raw.slice(0, 300))
  }

  const validated = validateAnalysis(parsed)
  return validated
}

function validateAnalysis(x: unknown): AIAnalysis {
  if (!x || typeof x !== 'object') {
    throw new GroqAPIError('AI response missing object structure')
  }
  const obj = x as Record<string, unknown>
  const findings = obj.findings
  const talkingPoints = obj.talkingPoints

  if (!Array.isArray(findings) || findings.length === 0) {
    throw new GroqAPIError('AI response missing findings[]')
  }
  if (!Array.isArray(talkingPoints) || talkingPoints.length === 0) {
    throw new GroqAPIError('AI response missing talkingPoints[]')
  }

  const validTags: FindingTag[] = ['DANGER', 'WARNING', 'GOOD']
  const cleanFindings: Finding[] = findings.map((f, i) => {
    if (!f || typeof f !== 'object') {
      throw new GroqAPIError(`Finding ${i} not an object`)
    }
    const fo = f as Record<string, unknown>
    const tag = String(fo.tag ?? '').toUpperCase() as FindingTag
    if (!validTags.includes(tag)) {
      throw new GroqAPIError(`Finding ${i} has invalid tag: ${fo.tag}`)
    }
    return {
      tag,
      title: String(fo.title ?? '').trim(),
      detail: String(fo.detail ?? '').trim(),
    }
  })

  const cleanTalkingPoints: string[] = talkingPoints.map((t) => String(t).trim())

  return { findings: cleanFindings, talkingPoints: cleanTalkingPoints }
}
