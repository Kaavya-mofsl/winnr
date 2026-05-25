import type { ClientMeta } from '@/types/trade'
import type { Position } from '@/types/trade'
import { compactMoney, pct } from '@/lib/format'

interface Props {
  client: ClientMeta
  positions: Position[]
  ingestedAt?: string
}

export function ActiveClient({ client, positions, ingestedAt }: Props) {
  const netPnL = positions.reduce((s, p) => s + p.netPnL, 0)
  const wins = positions.filter((p) => p.status === 'WIN').length
  const losses = positions.filter((p) => p.status === 'LOSS').length
  const decided = wins + losses
  const winRate = decided > 0 ? (wins / decided) * 100 : 0
  const segments = positions.reduce<Record<string, number>>((m, p) => {
    const k = p.segment ?? 'UNKNOWN'
    m[k] = (m[k] ?? 0) + 1
    return m
  }, {})
  const ingested = ingestedAt
    ? new Date(ingestedAt).toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      })
    : '—'

  return (
    <div
      className="reveal grid grid-cols-12 gap-px bg-[color:var(--color-line)] border border-[color:var(--color-line)] rounded-xl overflow-hidden"
      style={{ ['--reveal-delay' as string]: '0ms' }}
    >
      {/* identity strip */}
      <div className="col-span-12 lg:col-span-4 bg-[color:var(--color-panel)] p-6 relative overflow-hidden">
        <div className="absolute -right-12 -top-12 h-48 w-48 rounded-full bg-[color:var(--color-accent-dim)] blur-3xl pointer-events-none" />
        <div className="kicker mb-3">Active Client</div>
        <div className="flex items-baseline gap-3">
          <h1 className="text-2xl font-semibold text-[color:var(--color-text-1)] tracking-tight leading-tight">
            {client.name ?? 'Unknown client'}
          </h1>
        </div>
        <div className="num text-xs text-[color:var(--color-text-3)] mt-1">
          {client.code ?? '—'}
        </div>
        <div className="mt-5 inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-[color:var(--color-good-dim)] border border-[color:var(--color-good)]/30">
          <div className="h-1.5 w-1.5 rounded-full bg-[color:var(--color-good)]" />
          <span className="font-mono text-[10px] tracking-wider text-[color:var(--color-good)] uppercase">
            Data Ready · Bundled
          </span>
        </div>
        <p className="text-[11px] text-[color:var(--color-text-3)] mt-4 leading-relaxed max-w-sm">
          Trade history is ingested offline by the Winnr team. Future live trades
          will stream via Motilal Oswal API.
        </p>
      </div>

      {/* metric grid */}
      <Tile
        label="Period"
        value={
          client.periodFrom && client.periodTo
            ? `${client.periodFrom?.slice(2)} → ${client.periodTo?.slice(2)}`
            : '—'
        }
        sub={`ingested ${ingested}`}
      />
      <Tile
        label="Positions"
        value={String(positions.length)}
        sub={Object.entries(segments)
          .map(([k, v]) => `${k.slice(0, 3)} ${v}`)
          .join(' · ')}
      />
      <Tile
        label="Win Rate"
        value={pct(winRate, 1)}
        sub={`${wins}W / ${losses}L`}
        tone={winRate >= 60 ? 'good' : winRate >= 45 ? 'neutral' : 'bad'}
      />
      <Tile
        label="Net P&L"
        value={compactMoney(netPnL)}
        sub={netPnL >= 0 ? 'profit' : 'loss'}
        tone={netPnL >= 0 ? 'good' : 'bad'}
      />
    </div>
  )
}

function Tile({
  label,
  value,
  sub,
  tone = 'neutral',
}: {
  label: string
  value: string
  sub?: string
  tone?: 'good' | 'bad' | 'neutral'
}) {
  const color =
    tone === 'good'
      ? 'text-[color:var(--color-good)]'
      : tone === 'bad'
        ? 'text-[color:var(--color-danger)]'
        : 'text-[color:var(--color-text-1)]'
  return (
    <div className="col-span-6 lg:col-span-2 bg-[color:var(--color-panel)] p-5 flex flex-col justify-between min-h-[120px]">
      <div className="kicker">{label}</div>
      <div>
        <div className={`num font-semibold text-xl tracking-tight ${color}`}>
          {value}
        </div>
        {sub && (
          <div className="text-[10px] text-[color:var(--color-text-3)] mt-1 font-mono uppercase tracking-wider">
            {sub}
          </div>
        )}
      </div>
    </div>
  )
}
