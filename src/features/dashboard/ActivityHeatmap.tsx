import { useMemo } from 'react'
import type { Position } from '@/types/trade'

interface Props {
  positions: Position[]
}

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

function isoWeek(d: Date): { year: number; week: number } {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()))
  const day = date.getUTCDay() || 7
  date.setUTCDate(date.getUTCDate() + 4 - day)
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1))
  const week = Math.ceil(((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)
  return { year: date.getUTCFullYear(), week }
}

export function ActivityHeatmap({ positions }: Props) {
  const { grid, weeks, max, totals } = useMemo(() => {
    const cells = new Map<string, { count: number; pnl: number; date: string }>()
    const weekSet = new Set<string>()
    for (const p of positions) {
      for (const dStr of [p.firstTradeTime, p.lastTradeTime]) {
        if (!dStr) continue
        const d = new Date(dStr)
        if (!Number.isFinite(d.getTime())) continue
        const wk = isoWeek(d)
        const dow = (d.getUTCDay() + 6) % 7 // Mon=0..Sun=6
        const key = `${wk.year}-W${String(wk.week).padStart(2, '0')}|${dow}`
        const cur = cells.get(key) ?? { count: 0, pnl: 0, date: dStr }
        cur.count += 1
        cur.pnl += dStr === p.lastTradeTime ? p.netPnL : 0
        cells.set(key, cur)
        weekSet.add(`${wk.year}-W${String(wk.week).padStart(2, '0')}`)
      }
    }
    const weeks = [...weekSet].sort()
    let max = 0
    for (const c of cells.values()) if (c.count > max) max = c.count
    const totals = { activeCells: cells.size, peak: max }
    return { grid: cells, weeks, max, totals }
  }, [positions])

  const CELL = 14
  const GAP = 3

  return (
    <div className="rounded-xl border border-[color:var(--color-line)] bg-[color:var(--color-panel)] overflow-hidden">
      <div className="px-5 py-4 border-b border-[color:var(--color-line)] flex items-center justify-between">
        <div>
          <div className="kicker">Trading Activity Heatmap</div>
          <div className="text-[11px] text-[color:var(--color-text-3)] mt-0.5">
            Day-of-week × week-of-year · color = legs that day · click for date
          </div>
        </div>
        <div className="flex items-center gap-3 text-[10px] font-mono uppercase tracking-wider text-[color:var(--color-text-3)]">
          <span>{totals.activeCells} active cells</span>
          <span>·</span>
          <span>peak {totals.peak} legs/day</span>
        </div>
      </div>
      <div className="p-5 overflow-x-auto">
        <div className="flex gap-3 min-w-fit">
          {/* day labels */}
          <div
            className="flex flex-col gap-[3px] pt-[14px]"
            style={{ marginRight: 4 }}
          >
            {DAY_LABELS.map((d) => (
              <div
                key={d}
                className="font-mono text-[9px] text-[color:var(--color-text-3)] tracking-wider uppercase"
                style={{ height: CELL, lineHeight: `${CELL}px` }}
              >
                {d}
              </div>
            ))}
          </div>

          {/* weeks columns */}
          <div className="flex flex-col">
            {/* month labels above */}
            <div className="flex" style={{ height: 14, gap: GAP }}>
              {weeks.map((wk, i) => {
                // Approx month label from start of ISO week
                const [yStr, wStr] = wk.split('-W')
                const year = parseInt(yStr, 10)
                const w = parseInt(wStr, 10)
                const jan4 = new Date(Date.UTC(year, 0, 4))
                const dow = (jan4.getUTCDay() + 6) % 7
                const weekMonday = new Date(jan4)
                weekMonday.setUTCDate(jan4.getUTCDate() - dow + (w - 1) * 7)
                const showMonth =
                  i === 0 ||
                  (weekMonday.getUTCDate() <= 7 &&
                    weekMonday.getUTCMonth() !==
                      monthOfWeek(weeks[i - 1]))
                return (
                  <div
                    key={wk}
                    style={{ width: CELL }}
                    className="font-mono text-[9px] text-[color:var(--color-text-3)] uppercase tracking-wider"
                  >
                    {showMonth
                      ? weekMonday.toLocaleString('en', {
                          month: 'short',
                        })
                      : ''}
                  </div>
                )
              })}
            </div>
            <div className="flex" style={{ gap: GAP }}>
              {weeks.map((wk) => (
                <div
                  key={wk}
                  className="flex flex-col"
                  style={{ gap: GAP }}
                >
                  {DAY_LABELS.map((_, dow) => {
                    const cell = grid.get(`${wk}|${dow}`)
                    const intensity = cell ? cell.count / max : 0
                    return (
                      <div
                        key={dow}
                        className="rounded-[2px] cursor-default transition-transform hover:scale-110"
                        style={{
                          width: CELL,
                          height: CELL,
                          background: cellBg(intensity),
                          border:
                            intensity > 0
                              ? '1px solid rgba(245,185,66,0.25)'
                              : '1px solid var(--color-line)',
                          boxShadow:
                            intensity > 0.7
                              ? `0 0 6px ${cellBg(intensity)}`
                              : 'none',
                        }}
                        title={
                          cell
                            ? `${cell.date} · ${cell.count} legs${
                                cell.pnl !== 0
                                  ? ` · P&L ${cell.pnl >= 0 ? '+' : ''}${Math.round(cell.pnl)}`
                                  : ''
                              }`
                            : ''
                        }
                      />
                    )
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* scale legend */}
        <div className="flex items-center gap-2 mt-5 ml-12">
          <span className="font-mono text-[9px] uppercase tracking-wider text-[color:var(--color-text-3)]">
            Less
          </span>
          {[0, 0.2, 0.4, 0.6, 0.8, 1].map((v) => (
            <div
              key={v}
              style={{
                width: CELL,
                height: CELL,
                background: cellBg(v),
                border: '1px solid var(--color-line)',
              }}
              className="rounded-[2px]"
            />
          ))}
          <span className="font-mono text-[9px] uppercase tracking-wider text-[color:var(--color-text-3)]">
            More
          </span>
        </div>
      </div>
    </div>
  )
}

function cellBg(intensity: number): string {
  if (intensity === 0) return '#0c0d12'
  // ramp from deep amber → bright amber
  const alpha = 0.15 + intensity * 0.85
  return `rgba(245, 185, 66, ${alpha.toFixed(3)})`
}

function monthOfWeek(wk: string): number {
  const [yStr, wStr] = wk.split('-W')
  const year = parseInt(yStr, 10)
  const w = parseInt(wStr, 10)
  const jan4 = new Date(Date.UTC(year, 0, 4))
  const dow = (jan4.getUTCDay() + 6) % 7
  const weekMonday = new Date(jan4)
  weekMonday.setUTCDate(jan4.getUTCDate() - dow + (w - 1) * 7)
  return weekMonday.getUTCMonth()
}
