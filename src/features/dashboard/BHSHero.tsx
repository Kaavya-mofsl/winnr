import type { BHSResult } from '@/lib/bhs'

const PLAIN: Record<string, { label: string; desc: string }> = {
  Overtrading: {
    label: 'Overtrading',
    desc: 'How often legs fire per active day',
  },
  'Loss Aversion': {
    label: 'Holding losers too long',
    desc: 'Loss hold-time vs win hold-time and win/loss size ratio',
  },
  'Short Only Bias': {
    label: 'One-sided positioning',
    desc: 'Skew toward short side of the market',
  },
  'Revenge Trading': {
    label: 'Revenge trading',
    desc: 'Volume spikes the day after big losses',
  },
  'Instrument Concentration': {
    label: 'Single-instrument risk',
    desc: 'Share of book in the single top underlying',
  },
  'Expiry Dependency': {
    label: 'Last-minute expiry trading',
    desc: 'F&O opened within 48 hours of expiry',
  },
}

function bandColor(band: 'green' | 'yellow' | 'red') {
  if (band === 'green') return 'var(--color-good)'
  if (band === 'yellow') return 'var(--color-warn)'
  return 'var(--color-danger)'
}

function riskColor(risk: number) {
  if (risk <= 30) return 'var(--color-good)'
  if (risk <= 60) return 'var(--color-warn)'
  return 'var(--color-danger)'
}

interface Props {
  bhs: BHSResult
}

export function BHSHero({ bhs }: Props) {
  const ringColor = bandColor(bhs.band)
  const SIZE = 240
  const STROKE = 18
  const R = (SIZE - STROKE) / 2
  const CIRC = 2 * Math.PI * R
  const progress = (bhs.bhs / 100) * CIRC

  return (
    <div
      className="reveal grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-px bg-[color:var(--color-line)] border border-[color:var(--color-line)] rounded-xl overflow-hidden"
      style={{ ['--reveal-delay' as string]: '80ms' }}
    >
      {/* Ring */}
      <div className="bg-[color:var(--color-panel)] p-7 flex flex-col items-center justify-center relative overflow-hidden">
        <div className="kicker mb-1 self-start">Behavioral Health Score</div>
        <div className="relative my-4">
          <svg
            width={SIZE}
            height={SIZE}
            viewBox={`0 0 ${SIZE} ${SIZE}`}
            style={{ transform: 'rotate(-90deg)' }}
          >
            <defs>
              <linearGradient id="ringGrad" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor={ringColor} stopOpacity="1" />
                <stop offset="100%" stopColor={ringColor} stopOpacity="0.45" />
              </linearGradient>
            </defs>
            {/* track */}
            <circle
              cx={SIZE / 2}
              cy={SIZE / 2}
              r={R}
              fill="none"
              stroke="var(--color-line-strong)"
              strokeWidth={STROKE}
            />
            {/* progress */}
            <circle
              cx={SIZE / 2}
              cy={SIZE / 2}
              r={R}
              fill="none"
              stroke="url(#ringGrad)"
              strokeWidth={STROKE}
              strokeLinecap="round"
              strokeDasharray={CIRC}
              strokeDashoffset={CIRC - progress}
              style={{
                transition:
                  'stroke-dashoffset 1.4s cubic-bezier(0.16, 1, 0.3, 1)',
                filter: `drop-shadow(0 0 14px ${ringColor})`,
                opacity: 0.95,
              }}
            />
            {/* tick marks every 10 */}
            {Array.from({ length: 36 }, (_, i) => {
              const a = (i * 10 * Math.PI) / 180
              const r1 = R + STROKE / 2 + 4
              const r2 = R + STROKE / 2 + (i % 9 === 0 ? 10 : 6)
              const x1 = SIZE / 2 + Math.cos(a) * r1
              const y1 = SIZE / 2 + Math.sin(a) * r1
              const x2 = SIZE / 2 + Math.cos(a) * r2
              const y2 = SIZE / 2 + Math.sin(a) * r2
              return (
                <line
                  key={i}
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  stroke="var(--color-line-strong)"
                  strokeWidth={1}
                />
              )
            })}
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div className="kicker text-[9px]">BHS</div>
            <div
              className="num font-semibold tracking-tight leading-none"
              style={{
                fontSize: 72,
                color: 'var(--color-text-1)',
                animation: 'wnr-count 0.9s cubic-bezier(0.16,1,0.3,1) both',
                animationDelay: '300ms',
              }}
            >
              {bhs.bhs}
            </div>
            <div
              className="font-mono text-[10px] mt-1 tracking-widest"
              style={{ color: ringColor }}
            >
              / 100
            </div>
          </div>
        </div>
        <div
          className="px-3 py-1.5 rounded-md text-xs font-semibold tracking-wider uppercase font-mono"
          style={{
            background:
              bhs.band === 'green'
                ? 'var(--color-good-dim)'
                : bhs.band === 'yellow'
                  ? 'var(--color-warn-dim)'
                  : 'var(--color-danger-dim)',
            color: ringColor,
            border: `1px solid ${ringColor}40`,
          }}
        >
          {bhs.label}
        </div>
        <div className="num text-[10px] text-[color:var(--color-text-3)] mt-3 uppercase tracking-wider">
          {bhs.meta.totalPositions} positions · {bhs.meta.activeDays} active days
        </div>
      </div>

      {/* Dimension bars */}
      <div className="bg-[color:var(--color-panel)] p-7">
        <div className="flex items-center justify-between mb-5">
          <div className="kicker">Risk Decomposition</div>
          <div className="flex items-center gap-3 text-[10px] font-mono uppercase tracking-wider">
            <Legend color="var(--color-good)" label="Healthy 0–30" />
            <Legend color="var(--color-warn)" label="Watch 31–60" />
            <Legend color="var(--color-danger)" label="Risk 61–100" />
          </div>
        </div>
        <div className="space-y-3.5">
          {bhs.dimensions.map((d, i) => {
            const meta = PLAIN[d.name] ?? { label: d.name, desc: d.detail }
            const fillColor = riskColor(d.risk)
            return (
              <div key={d.name}>
                <div className="flex items-baseline justify-between gap-4 mb-1.5">
                  <div className="flex items-baseline gap-3 min-w-0">
                    <span className="num text-[10px] text-[color:var(--color-text-3)] w-5">
                      0{i + 1}
                    </span>
                    <div className="min-w-0">
                      <span className="text-sm text-[color:var(--color-text-1)] font-medium">
                        {meta.label}
                      </span>
                      <span className="text-[11px] text-[color:var(--color-text-3)] ml-2">
                        {d.detail}
                      </span>
                    </div>
                  </div>
                  <span
                    className="num font-semibold text-sm tabular-nums"
                    style={{ color: fillColor }}
                  >
                    {d.risk}
                  </span>
                </div>
                <div className="h-1.5 rounded-full bg-[color:var(--color-panel-2)] overflow-hidden relative">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${d.risk}%`,
                      background: fillColor,
                      boxShadow: `0 0 12px ${fillColor}55`,
                      transformOrigin: 'left',
                      animation: 'wnr-fill 1.1s cubic-bezier(0.16,1,0.3,1) both',
                      animationDelay: `${400 + i * 80}ms`,
                    }}
                  />
                  {/* threshold ticks */}
                  <div className="absolute inset-y-0 left-[30%] w-px bg-[color:var(--color-line)]" />
                  <div className="absolute inset-y-0 left-[60%] w-px bg-[color:var(--color-line)]" />
                </div>
              </div>
            )
          })}
        </div>
        <div className="hairline my-5" />
        <div className="flex items-center justify-between text-[10px] font-mono uppercase tracking-wider text-[color:var(--color-text-3)]">
          <span>Weighted risk: <span className="text-[color:var(--color-text-2)]">{100 - bhs.bhs}</span></span>
          <span>BHS = 100 − weighted avg of risks</span>
        </div>
      </div>
    </div>
  )
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5 text-[color:var(--color-text-3)]">
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: color }} />
      {label}
    </span>
  )
}
