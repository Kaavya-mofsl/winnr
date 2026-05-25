import { useMemo } from 'react'
import type { Position } from '@/types/trade'

interface Props {
  positions: Position[]
}

const COLORS: Record<string, string> = {
  'Call · Long': '#3ed598',
  'Call · Short': '#f5b942',
  'Put · Long': '#4dabf7',
  'Put · Short': '#b794f6',
  'Future · Long': '#ff8a4d',
  'Future · Short': '#ff5a4d',
  'Commodity · Long': '#fbbf24',
  'Commodity · Short': '#fb7185',
  'Equity · Long': '#94a3b8',
  'Equity · Short': '#64748b',
}

function bucket(p: Position): string {
  const dir = p.isShort ? 'Short' : 'Long'
  if (p.segment === 'EQUITY') return `Equity · ${dir}`
  if (p.segment === 'COMMODITY') return `Commodity · ${dir}`
  if (p.optType === 'CE') return `Call · ${dir}`
  if (p.optType === 'PE') return `Put · ${dir}`
  return `Future · ${dir}`
}

export function StrategyDistribution({ positions }: Props) {
  const data = useMemo(() => {
    const by = new Map<string, number>()
    for (const p of positions) {
      const k = bucket(p)
      by.set(k, (by.get(k) ?? 0) + 1)
    }
    const total = positions.length
    return [...by.entries()]
      .map(([name, count]) => ({
        name,
        count,
        pct: (count / total) * 100,
        color: COLORS[name] ?? '#888',
      }))
      .sort((a, b) => b.count - a.count)
  }, [positions])

  const total = positions.length
  const SIZE = 240
  const R = 100
  const INNER = 64
  const cx = SIZE / 2
  const cy = SIZE / 2

  // build donut slices
  let acc = 0
  const slices = data.map((d) => {
    const start = (acc / total) * 2 * Math.PI - Math.PI / 2
    acc += d.count
    const end = (acc / total) * 2 * Math.PI - Math.PI / 2
    const large = end - start > Math.PI ? 1 : 0
    const x1 = cx + R * Math.cos(start)
    const y1 = cy + R * Math.sin(start)
    const x2 = cx + R * Math.cos(end)
    const y2 = cy + R * Math.sin(end)
    const xi1 = cx + INNER * Math.cos(start)
    const yi1 = cy + INNER * Math.sin(start)
    const xi2 = cx + INNER * Math.cos(end)
    const yi2 = cy + INNER * Math.sin(end)
    const path = [
      `M ${x1} ${y1}`,
      `A ${R} ${R} 0 ${large} 1 ${x2} ${y2}`,
      `L ${xi2} ${yi2}`,
      `A ${INNER} ${INNER} 0 ${large} 0 ${xi1} ${yi1}`,
      'Z',
    ].join(' ')
    return { ...d, path }
  })

  return (
    <div className="rounded-xl border border-[color:var(--color-line)] bg-[color:var(--color-panel)] overflow-hidden h-full">
      <div className="px-5 py-4 border-b border-[color:var(--color-line)] flex items-center justify-between">
        <span className="kicker">Strategy Distribution</span>
        <span className="num text-[10px] text-[color:var(--color-text-3)] uppercase tracking-wider">
          {data.length} buckets
        </span>
      </div>
      <div className="p-5 grid grid-cols-[auto_1fr] gap-6 items-center">
        <div className="relative" style={{ width: SIZE, height: SIZE }}>
          <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}>
            {slices.map((s, i) => (
              <path
                key={s.name}
                d={s.path}
                fill={s.color}
                stroke="var(--color-panel)"
                strokeWidth={2}
                style={{
                  filter: `drop-shadow(0 0 8px ${s.color}40)`,
                  animation: 'wnr-reveal 0.7s cubic-bezier(0.16,1,0.3,1) both',
                  animationDelay: `${i * 70}ms`,
                  transformOrigin: `${cx}px ${cy}px`,
                }}
              />
            ))}
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <div className="kicker text-[9px]">Total</div>
            <div className="num font-semibold text-2xl text-[color:var(--color-text-1)] tracking-tight">
              {total}
            </div>
            <div className="font-mono text-[10px] text-[color:var(--color-text-3)] tracking-widest uppercase">
              positions
            </div>
          </div>
        </div>
        <div className="space-y-1.5">
          {data.map((d) => (
            <div key={d.name} className="flex items-center gap-2.5 text-[12px]">
              <span
                className="h-2.5 w-2.5 rounded-sm shrink-0"
                style={{
                  background: d.color,
                  boxShadow: `0 0 6px ${d.color}66`,
                }}
              />
              <span className="text-[color:var(--color-text-1)] flex-1 truncate">
                {d.name}
              </span>
              <span className="num text-[color:var(--color-text-2)] tabular-nums">
                {d.count}
              </span>
              <span className="num text-[color:var(--color-text-3)] w-10 text-right tabular-nums">
                {d.pct.toFixed(0)}%
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
