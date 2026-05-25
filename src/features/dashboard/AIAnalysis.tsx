import { useState } from 'react'
import type { Position, ClientMeta } from '@/types/trade'
import type { BHSResult } from '@/lib/bhs'
import {
  generateAnalysis,
  GroqAPIError,
  type AIAnalysis as AIAnalysisType,
  type FindingTag,
} from '@/lib/ai'

interface Props {
  positions: Position[]
  bhs: BHSResult
  client: ClientMeta
}

const TAG_STYLES: Record<
  FindingTag,
  { stripe: string; badge: string; text: string; glow: string }
> = {
  DANGER: {
    stripe: 'var(--color-danger)',
    badge: 'bg-[color:var(--color-danger-dim)] text-[color:var(--color-danger)] border-[color:var(--color-danger)]/40',
    text: 'text-[color:var(--color-danger)]',
    glow: 'rgba(255, 90, 77, 0.18)',
  },
  WARNING: {
    stripe: 'var(--color-warn)',
    badge: 'bg-[color:var(--color-warn-dim)] text-[color:var(--color-warn)] border-[color:var(--color-warn)]/40',
    text: 'text-[color:var(--color-warn)]',
    glow: 'rgba(245, 185, 66, 0.16)',
  },
  GOOD: {
    stripe: 'var(--color-good)',
    badge: 'bg-[color:var(--color-good-dim)] text-[color:var(--color-good)] border-[color:var(--color-good)]/40',
    text: 'text-[color:var(--color-good)]',
    glow: 'rgba(62, 213, 152, 0.18)',
  },
}

export function AIAnalysis({ positions, bhs, client }: Props) {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<AIAnalysisType | null>(null)
  const [error, setError] = useState<{ message: string; hint?: string } | null>(
    null
  )

  const run = async () => {
    setLoading(true)
    setError(null)
    try {
      const analysis = await generateAnalysis(positions, bhs, client)
      setResult(analysis)
    } catch (e) {
      if (e instanceof GroqAPIError) setError({ message: e.message, hint: e.hint })
      else setError({ message: e instanceof Error ? e.message : 'Unknown error' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-6">
      <div className="rounded-xl border border-[color:var(--color-line)] bg-[color:var(--color-panel)] overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[color:var(--color-line)]">
          <div className="flex items-center gap-3">
            <Spark active={loading || !!result} />
            <span className="kicker">AI Findings · 5</span>
          </div>
          <RunButton loading={loading} hasResult={!!result} onClick={run} />
        </div>
        <div className="p-5">
          {error && <ErrorBox message={error.message} hint={error.hint} />}
          {!error && !result && !loading && (
            <EmptyHint label="findings" />
          )}
          {loading && !result && <SkeletonList count={5} />}
          {result && (
            <ol className="space-y-2.5">
              {result.findings.map((f, i) => {
                const s = TAG_STYLES[f.tag] ?? TAG_STYLES.WARNING
                return (
                  <li
                    key={i}
                    className="relative rounded-lg border border-[color:var(--color-line)] bg-[color:var(--color-panel-2)] overflow-hidden group hover:border-[color:var(--color-line-strong)] transition-colors"
                    style={{
                      boxShadow: `inset 4px 0 0 ${s.stripe}, 0 0 0 1px transparent`,
                    }}
                  >
                    <div
                      className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
                      style={{ background: `radial-gradient(400px 100px at 0% 50%, ${s.glow}, transparent 70%)` }}
                    />
                    <div className="relative p-4 pl-5">
                      <div className="flex items-center gap-3 mb-1.5">
                        <span
                          className={`inline-flex items-center px-2 h-5 rounded text-[9px] font-mono font-semibold tracking-widest border ${s.badge}`}
                        >
                          {f.tag}
                        </span>
                        <span className="num text-[10px] text-[color:var(--color-text-3)]">
                          F.{String(i + 1).padStart(2, '0')}
                        </span>
                        <div className="ml-auto h-px flex-1 bg-[color:var(--color-line)]" />
                      </div>
                      <div className="text-[15px] font-semibold text-[color:var(--color-text-1)] leading-snug tracking-tight">
                        {f.title}
                      </div>
                      <div className="text-[13px] text-[color:var(--color-text-2)] mt-1.5 leading-relaxed">
                        {f.detail}
                      </div>
                    </div>
                  </li>
                )
              })}
            </ol>
          )}
        </div>
      </div>

      {/* Talking points */}
      <div className="rounded-xl border border-[color:var(--color-line)] bg-[color:var(--color-panel)] overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[color:var(--color-line)]">
          <div className="flex items-center gap-3">
            <div className="font-serif text-[color:var(--color-accent)] text-lg leading-none">“</div>
            <span className="kicker">Advisor Script · 4</span>
          </div>
          <span className="font-mono text-[10px] text-[color:var(--color-text-3)] uppercase tracking-wider">
            Ready-to-use
          </span>
        </div>
        <div className="p-5">
          {!result && !error && !loading && <EmptyHint label="talking points" />}
          {loading && !result && <SkeletonList count={4} narrow />}
          {result && (
            <ol className="space-y-3">
              {result.talkingPoints.map((t, i) => (
                <li
                  key={i}
                  className="relative rounded-lg bg-[color:var(--color-panel-2)] border border-[color:var(--color-line)] p-4 pl-12 hover:border-[color:var(--color-accent)]/30 transition-colors"
                >
                  <span
                    className="absolute left-3 top-3 num text-[color:var(--color-accent)] font-semibold text-sm leading-none"
                  >
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <p className="text-[13.5px] text-[color:var(--color-text-1)] leading-relaxed font-serif italic">
                    “{t}”
                  </p>
                </li>
              ))}
            </ol>
          )}
        </div>
      </div>
    </div>
  )
}

function RunButton({
  loading,
  hasResult,
  onClick,
}: {
  loading: boolean
  hasResult: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className="no-print inline-flex items-center gap-2 h-8 px-3.5 rounded-md bg-[color:var(--color-accent)] hover:bg-[color:var(--color-accent)]/90 text-black text-xs font-semibold tracking-wide disabled:opacity-60 disabled:cursor-not-allowed transition-all"
    >
      {loading ? (
        <>
          <svg width="12" height="12" viewBox="0 0 24 24" className="spin">
            <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="3" strokeDasharray="14 50" strokeLinecap="round" />
          </svg>
          <span className="font-mono">ANALYZING</span>
        </>
      ) : (
        <>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M12 2v4M12 18v4M4.9 4.9l2.8 2.8M16.3 16.3l2.8 2.8M2 12h4M18 12h4M4.9 19.1l2.8-2.8M16.3 7.7l2.8-2.8" />
          </svg>
          <span className="font-mono tracking-wider">
            {hasResult ? 'RE-RUN' : 'GENERATE'}
          </span>
        </>
      )}
    </button>
  )
}

function Spark({ active }: { active: boolean }) {
  return (
    <div className="relative h-2 w-2">
      <div
        className="absolute inset-0 rounded-full"
        style={{
          background: active ? 'var(--color-accent)' : 'var(--color-text-mute)',
          boxShadow: active ? '0 0 10px var(--color-accent)' : 'none',
        }}
      />
    </div>
  )
}

function EmptyHint({ label }: { label: string }) {
  return (
    <div className="py-10 text-center">
      <div className="kicker mb-2">No {label} yet</div>
      <p className="text-[12px] text-[color:var(--color-text-3)] max-w-xs mx-auto leading-relaxed">
        Anonymized summary will be sent to Groq. Raw trades never leave the
        device.
      </p>
    </div>
  )
}

function SkeletonList({ count, narrow = false }: { count: number; narrow?: boolean }) {
  return (
    <div className="space-y-2.5">
      {Array.from({ length: count }, (_, i) => (
        <div
          key={i}
          className="rounded-lg bg-[color:var(--color-panel-2)] border border-[color:var(--color-line)] p-4 animate-pulse"
          style={{
            height: narrow ? 60 : 92,
            animationDelay: `${i * 100}ms`,
          }}
        />
      ))}
    </div>
  )
}

function ErrorBox({ message, hint }: { message: string; hint?: string }) {
  return (
    <div className="rounded-lg border border-[color:var(--color-danger)]/40 bg-[color:var(--color-danger-dim)] p-4">
      <div className="font-mono text-[10px] text-[color:var(--color-danger)] uppercase tracking-wider mb-1">
        Error
      </div>
      <div className="text-sm text-[color:var(--color-text-1)]">{message}</div>
      {hint && (
        <div className="text-[11px] text-[color:var(--color-text-3)] mt-2 leading-relaxed">
          {hint}
        </div>
      )}
    </div>
  )
}
