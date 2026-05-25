import { useMemo } from 'react'
import type { Position } from '@/types/trade'
import { compactMoney, money } from '@/lib/format'

interface Props {
  positions: Position[]
}

export function PnLByInstrument({ positions }: Props) {
  const data = useMemo(() => {
    const by = new Map<string, { symbol: string; pnl: number; count: number }>()
    for (const p of positions) {
      const cur = by.get(p.symbol) ?? { symbol: p.symbol, pnl: 0, count: 0 }
      cur.pnl += p.netPnL
      cur.count++
      by.set(p.symbol, cur)
    }
    return [...by.values()]
      .sort((a, b) => Math.abs(b.pnl) - Math.abs(a.pnl))
      .slice(0, 8)
  }, [positions])

  const max = Math.max(...data.map((d) => Math.abs(d.pnl)), 1)

  return (
    <div className="rounded-xl border border-[color:var(--color-line)] bg-[color:var(--color-panel)] overflow-hidden h-full">
      <div className="px-5 py-4 border-b border-[color:var(--color-line)] flex items-center justify-between">
        <span className="kicker">P&L by Instrument · top 8</span>
        <span className="num text-[10px] text-[color:var(--color-text-3)] uppercase tracking-wider">
          sorted by |P&L|
        </span>
      </div>
      <div className="p-5 space-y-2.5">
        {data.map((d, i) => {
          const pct = (Math.abs(d.pnl) / max) * 100
          const positive = d.pnl >= 0
          const color = positive
            ? 'var(--color-good)'
            : 'var(--color-danger)'
          return (
            <div
              key={d.symbol}
              className="reveal grid grid-cols-[140px_1fr_110px] items-center gap-3"
              style={{ ['--reveal-delay' as string]: `${i * 50}ms` }}
            >
              <div className="min-w-0 truncate">
                <div className="text-[13px] text-[color:var(--color-text-1)] font-medium truncate" title={d.symbol}>
                  {d.symbol}
                </div>
                <div className="num text-[10px] text-[color:var(--color-text-3)] tracking-wider">
                  {d.count} positions
                </div>
              </div>
              <div className="relative h-7">
                <div className="absolute inset-y-0 left-1/2 w-px bg-[color:var(--color-line-strong)]" />
                <div
                  className="absolute top-1/2 -translate-y-1/2 h-5 rounded-sm"
                  style={{
                    left: positive ? '50%' : `${50 - pct / 2}%`,
                    width: `${pct / 2}%`,
                    background: `linear-gradient(90deg, ${color}40, ${color})`,
                    boxShadow: `0 0 12px ${color}40`,
                  }}
                />
              </div>
              <div
                className="num text-right font-semibold text-[13px]"
                style={{ color }}
              >
                {compactMoney(d.pnl)}
                <div className="text-[9px] text-[color:var(--color-text-3)] font-mono uppercase tracking-wider mt-0.5">
                  {money(d.pnl)}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
