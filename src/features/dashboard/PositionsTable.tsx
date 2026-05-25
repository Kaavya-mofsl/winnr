import { useMemo, useState } from 'react'
import type { Position } from '@/types/trade'
import { money, num } from '@/lib/format'

interface Props {
  positions: Position[]
}

type SortKey =
  | 'symbol'
  | 'expiry'
  | 'strike'
  | 'optType'
  | 'qty'
  | 'avgBuyRate'
  | 'avgSellRate'
  | 'holdingDays'
  | 'sttCtt'
  | 'netPnL'
  | 'status'

interface SortState {
  key: SortKey
  dir: 'asc' | 'desc'
}

const COLS: { key: SortKey; label: string; right?: boolean; w?: string }[] = [
  { key: 'symbol', label: 'Symbol' },
  { key: 'expiry', label: 'Expiry' },
  { key: 'strike', label: 'Strike', right: true },
  { key: 'optType', label: 'Type' },
  { key: 'qty', label: 'Qty', right: true },
  { key: 'avgBuyRate', label: 'Buy', right: true },
  { key: 'avgSellRate', label: 'Sell', right: true },
  { key: 'holdingDays', label: 'Hold', right: true },
  { key: 'sttCtt', label: 'STT', right: true },
  { key: 'netPnL', label: 'Net P&L', right: true },
  { key: 'status', label: 'Status' },
]

function get(p: Position, k: SortKey): number | string {
  switch (k) {
    case 'symbol':
      return p.symbol
    case 'expiry':
      return p.expiry
    case 'strike':
      return p.strike
    case 'optType':
      return p.optType
    case 'qty':
      return p.matchedQty || p.buyQty
    case 'avgBuyRate':
      return p.avgBuyRate
    case 'avgSellRate':
      return p.avgSellRate
    case 'holdingDays':
      return p.holdingDays ?? -1
    case 'sttCtt':
      return p.sttCtt
    case 'netPnL':
      return p.netPnL
    case 'status':
      return p.status
  }
}

export function PositionsTable({ positions }: Props) {
  const [sort, setSort] = useState<SortState>({ key: 'netPnL', dir: 'desc' })
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [filter, setFilter] = useState<'ALL' | 'WIN' | 'LOSS' | 'OPEN'>('ALL')
  const [query, setQuery] = useState('')

  const sorted = useMemo(() => {
    let list = positions
    if (filter !== 'ALL') list = list.filter((p) => p.status === filter)
    if (query) {
      const q = query.toLowerCase()
      list = list.filter((p) => p.symbol.toLowerCase().includes(q))
    }
    return [...list].sort((a, b) => {
      const av = get(a, sort.key)
      const bv = get(b, sort.key)
      const cmp = av < bv ? -1 : av > bv ? 1 : 0
      return sort.dir === 'asc' ? cmp : -cmp
    })
  }, [positions, sort, filter, query])

  const onSort = (key: SortKey) => {
    setSort((s) =>
      s.key === key
        ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' }
        : { key, dir: 'desc' }
    )
  }

  const toggleRow = (key: string) => {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  return (
    <div className="rounded-xl border border-[color:var(--color-line)] bg-[color:var(--color-panel)] overflow-hidden">
      <div className="px-5 py-4 border-b border-[color:var(--color-line)] flex items-center justify-between gap-4 no-print">
        <div className="flex items-center gap-2">
          {(['ALL', 'WIN', 'LOSS', 'OPEN'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`h-7 px-3 rounded-md font-mono text-[10px] tracking-wider uppercase transition-colors border ${
                filter === f
                  ? 'bg-[color:var(--color-accent)] text-black border-[color:var(--color-accent)] font-semibold'
                  : 'bg-transparent text-[color:var(--color-text-2)] border-[color:var(--color-line)] hover:border-[color:var(--color-line-strong)] hover:text-[color:var(--color-text-1)]'
              }`}
            >
              {f}
            </button>
          ))}
          <span className="ml-2 num text-[10px] text-[color:var(--color-text-3)] uppercase tracking-wider">
            {sorted.length} of {positions.length}
          </span>
        </div>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search symbol..."
          className="h-7 px-3 rounded-md bg-[color:var(--color-panel-2)] border border-[color:var(--color-line)] focus:border-[color:var(--color-accent)] outline-none text-[12px] text-[color:var(--color-text-1)] placeholder:text-[color:var(--color-text-mute)] w-52 font-mono"
        />
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-[13px]">
          <thead>
            <tr className="bg-[color:var(--color-panel-2)] border-b border-[color:var(--color-line)]">
              <th className="w-8" />
              {COLS.map((c) => (
                <th
                  key={c.key}
                  className={`px-3 py-2.5 text-[10px] font-mono uppercase tracking-wider text-[color:var(--color-text-3)] cursor-pointer hover:text-[color:var(--color-text-1)] transition-colors select-none ${
                    c.right ? 'text-right' : 'text-left'
                  }`}
                  onClick={() => onSort(c.key)}
                >
                  <span className="inline-flex items-center gap-1.5">
                    {c.label}
                    <SortIndicator
                      active={sort.key === c.key}
                      dir={sort.dir}
                    />
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map((p) => {
              const isOpen = expanded.has(p.key)
              return (
                <TableRow
                  key={p.key}
                  p={p}
                  open={isOpen}
                  onToggle={() => toggleRow(p.key)}
                />
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function TableRow({
  p,
  open,
  onToggle,
}: {
  p: Position
  open: boolean
  onToggle: () => void
}) {
  const pnlColor =
    p.netPnL > 0
      ? 'text-[color:var(--color-good)]'
      : p.netPnL < 0
        ? 'text-[color:var(--color-danger)]'
        : 'text-[color:var(--color-text-2)]'

  return (
    <>
      <tr
        onClick={onToggle}
        className={`border-b border-[color:var(--color-line)] hover:bg-[color:var(--color-panel-hover)] cursor-pointer transition-colors ${
          open ? 'bg-[color:var(--color-panel-hover)]' : ''
        }`}
      >
        <td className="pl-3 pr-1 py-2 align-middle">
          <span
            className="inline-block text-[color:var(--color-text-3)] transition-transform"
            style={{ transform: open ? 'rotate(90deg)' : 'rotate(0deg)' }}
          >
            ›
          </span>
        </td>
        <td className="px-3 py-2 font-medium text-[color:var(--color-text-1)]">
          {p.symbol}
        </td>
        <td className="px-3 py-2 num text-[color:var(--color-text-2)]">
          {p.expiry || '—'}
        </td>
        <td className="px-3 py-2 num text-right tabular-nums">
          {p.strike > 0 ? num(p.strike, 0) : '—'}
        </td>
        <td className="px-3 py-2">
          <TypeBadge t={p.optType} short={!!p.isShort} />
        </td>
        <td className="px-3 py-2 num text-right tabular-nums text-[color:var(--color-text-2)]">
          {p.matchedQty || `${p.buyQty}/${p.sellQty}`}
        </td>
        <td className="px-3 py-2 num text-right tabular-nums text-[color:var(--color-text-2)]">
          {p.avgBuyRate ? num(p.avgBuyRate) : '—'}
        </td>
        <td className="px-3 py-2 num text-right tabular-nums text-[color:var(--color-text-2)]">
          {p.avgSellRate ? num(p.avgSellRate) : '—'}
        </td>
        <td className="px-3 py-2 num text-right tabular-nums text-[color:var(--color-text-3)]">
          {p.holdingDays != null ? `${p.holdingDays}d` : '—'}
        </td>
        <td className="px-3 py-2 num text-right tabular-nums text-[color:var(--color-text-3)]">
          {p.sttCtt ? num(p.sttCtt) : '—'}
        </td>
        <td className={`px-3 py-2 num text-right tabular-nums font-semibold ${pnlColor}`}>
          {money(p.netPnL)}
        </td>
        <td className="px-3 py-2">
          <StatusBadge s={p.status} />
        </td>
      </tr>
      {open && <ExpandedDetail p={p} />}
    </>
  )
}

function ExpandedDetail({ p }: { p: Position }) {
  // we only have paired round-trips, not individual legs.
  // Show the two legs we can reconstruct (buy + sell) clearly.
  const buyFirst = !p.isShort
  const legs = [
    {
      side: 'BUY' as const,
      date: buyFirst ? p.firstTradeTime : p.lastTradeTime,
      qty: p.buyQty,
      rate: p.avgBuyRate,
      amount: p.buyAmount,
    },
    {
      side: 'SELL' as const,
      date: buyFirst ? p.lastTradeTime : p.firstTradeTime,
      qty: p.sellQty,
      rate: p.avgSellRate,
      amount: p.sellAmount,
    },
  ]

  return (
    <tr className="bg-[color:var(--color-bg)] border-b border-[color:var(--color-line)]">
      <td colSpan={12} className="px-0">
        <div className="px-12 py-5">
          <div className="grid grid-cols-[1fr_320px] gap-8">
            {/* Legs table */}
            <div>
              <div className="kicker mb-3">Trade Legs</div>
              <div className="rounded-md border border-[color:var(--color-line)] overflow-hidden">
                <table className="w-full text-[12px]">
                  <thead className="bg-[color:var(--color-panel)]">
                    <tr>
                      <th className="px-3 py-2 text-left font-mono text-[9px] uppercase tracking-wider text-[color:var(--color-text-3)]">
                        Side
                      </th>
                      <th className="px-3 py-2 text-left font-mono text-[9px] uppercase tracking-wider text-[color:var(--color-text-3)]">
                        Date
                      </th>
                      <th className="px-3 py-2 text-right font-mono text-[9px] uppercase tracking-wider text-[color:var(--color-text-3)]">
                        Qty
                      </th>
                      <th className="px-3 py-2 text-right font-mono text-[9px] uppercase tracking-wider text-[color:var(--color-text-3)]">
                        Rate
                      </th>
                      <th className="px-3 py-2 text-right font-mono text-[9px] uppercase tracking-wider text-[color:var(--color-text-3)]">
                        Amount
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {legs.map((l, i) => (
                      <tr
                        key={i}
                        className="border-t border-[color:var(--color-line)]"
                      >
                        <td className="px-3 py-2">
                          <span
                            className={`font-mono text-[10px] tracking-wider font-semibold px-1.5 py-0.5 rounded ${
                              l.side === 'BUY'
                                ? 'text-[color:var(--color-good)] bg-[color:var(--color-good-dim)]'
                                : 'text-[color:var(--color-danger)] bg-[color:var(--color-danger-dim)]'
                            }`}
                          >
                            {l.side}
                          </span>
                        </td>
                        <td className="px-3 py-2 num text-[color:var(--color-text-2)]">
                          {l.date || '—'}
                        </td>
                        <td className="px-3 py-2 num text-right tabular-nums">
                          {l.qty}
                        </td>
                        <td className="px-3 py-2 num text-right tabular-nums">
                          {num(l.rate)}
                        </td>
                        <td className="px-3 py-2 num text-right tabular-nums text-[color:var(--color-text-1)]">
                          {money(l.amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-[10px] text-[color:var(--color-text-3)] mt-2 leading-relaxed italic">
                Source: paired round-trip (XLSX). Granular leg-level data
                requires the Motilal Trade Book / Sauda Detail export.
              </p>
            </div>

            {/* Side panel */}
            <div className="space-y-3">
              <div className="kicker">Position Snapshot</div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-[11px]">
                <Cell label="Direction" value={p.isShort ? 'Short' : 'Long'} />
                <Cell
                  label="Segment"
                  value={p.segment ?? '—'}
                />
                <Cell label="Gross P&L" value={money(p.grossPnL)} />
                <Cell label="STT / CTT" value={money(p.sttCtt)} />
                <Cell label="Net P&L" value={money(p.netPnL)} tone={p.netPnL >= 0 ? 'good' : 'bad'} />
                <Cell label="Holding" value={p.holdingDays != null ? `${p.holdingDays}d` : '—'} />
              </div>
              <div className="hairline" />
              <div className="font-mono text-[9px] uppercase tracking-wider text-[color:var(--color-text-3)] break-all">
                key: {p.key}
              </div>
            </div>
          </div>
        </div>
      </td>
    </tr>
  )
}

function Cell({
  label,
  value,
  tone,
}: {
  label: string
  value: string
  tone?: 'good' | 'bad'
}) {
  const color =
    tone === 'good'
      ? 'text-[color:var(--color-good)]'
      : tone === 'bad'
        ? 'text-[color:var(--color-danger)]'
        : 'text-[color:var(--color-text-1)]'
  return (
    <>
      <div className="font-mono text-[9px] uppercase tracking-wider text-[color:var(--color-text-3)]">
        {label}
      </div>
      <div className={`num font-medium tabular-nums text-right ${color}`}>
        {value}
      </div>
    </>
  )
}

function TypeBadge({ t, short }: { t: Position['optType']; short: boolean }) {
  const label = t === 'XX' ? 'FUT' : t
  const bg = (() => {
    if (t === 'CE') return short ? 'rgba(245,185,66,0.18)' : 'rgba(62,213,152,0.18)'
    if (t === 'PE') return short ? 'rgba(183,148,246,0.20)' : 'rgba(77,171,247,0.18)'
    return short ? 'rgba(255,90,77,0.18)' : 'rgba(255,138,77,0.18)'
  })()
  const color = (() => {
    if (t === 'CE') return short ? '#f5b942' : '#3ed598'
    if (t === 'PE') return short ? '#b794f6' : '#4dabf7'
    return short ? '#ff5a4d' : '#ff8a4d'
  })()
  return (
    <span
      className="font-mono text-[10px] tracking-wider font-semibold px-1.5 py-0.5 rounded inline-flex items-center gap-1"
      style={{ background: bg, color }}
    >
      {short && <span className="opacity-70">S</span>}
      {label}
    </span>
  )
}

function StatusBadge({ s }: { s: Position['status'] }) {
  const styles: Record<Position['status'], { bg: string; fg: string }> = {
    WIN: {
      bg: 'var(--color-good-dim)',
      fg: 'var(--color-good)',
    },
    LOSS: {
      bg: 'var(--color-danger-dim)',
      fg: 'var(--color-danger)',
    },
    BREAKEVEN: {
      bg: 'rgba(144,149,163,0.12)',
      fg: 'var(--color-text-2)',
    },
    OPEN: {
      bg: 'var(--color-warn-dim)',
      fg: 'var(--color-warn)',
    },
  }
  const st = styles[s]
  return (
    <span
      className="font-mono text-[10px] tracking-wider font-semibold px-2 py-0.5 rounded uppercase"
      style={{ background: st.bg, color: st.fg }}
    >
      {s}
    </span>
  )
}

function SortIndicator({
  active,
  dir,
}: {
  active: boolean
  dir: 'asc' | 'desc'
}) {
  return (
    <svg width="8" height="10" viewBox="0 0 8 10" className="inline">
      <path
        d="M4 0L8 4H0Z"
        fill={
          active && dir === 'asc' ? 'var(--color-accent)' : 'var(--color-text-mute)'
        }
      />
      <path
        d="M4 10L0 6H8Z"
        fill={
          active && dir === 'desc' ? 'var(--color-accent)' : 'var(--color-text-mute)'
        }
      />
    </svg>
  )
}
