import type { ClientMeta } from '@/types/trade'

interface Props {
  client: ClientMeta
  positionCount: number
}

export function Header({ client, positionCount }: Props) {
  const initials = (client.name ?? 'Client')
    .split(/\s+/)
    .map((s) => s[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase()

  return (
    <header className="sticky top-0 z-30 backdrop-blur-md bg-[color:var(--color-bg)]/85 border-b border-[color:var(--color-line)] no-print">
      <div className="max-w-[1320px] mx-auto px-8 h-16 flex items-center gap-8">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="h-2 w-2 rounded-full bg-[color:var(--color-good)]" />
            <div className="absolute inset-0 h-2 w-2 rounded-full bg-[color:var(--color-good)] animate-ping opacity-60" />
          </div>
          <span className="font-mono text-[11px] tracking-[0.22em] text-[color:var(--color-text-1)] font-semibold">
            WINNR<span className="text-[color:var(--color-accent)]">.</span>AI
          </span>
          <span className="kicker">Behavioral Intelligence</span>
        </div>

        <div className="hidden md:flex items-center gap-6 ml-auto">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-full bg-gradient-to-br from-[color:var(--color-accent)] to-[#a06b14] grid place-items-center text-[10px] font-bold text-black">
              {initials}
            </div>
            <div className="leading-tight">
              <div className="text-sm text-[color:var(--color-text-1)] font-medium">
                {client.name ?? 'Unknown client'}
              </div>
              <div className="num text-[10px] text-[color:var(--color-text-3)]">
                {client.code ?? '—'} · {positionCount} positions
              </div>
            </div>
          </div>

          <div className="h-8 w-px bg-[color:var(--color-line-strong)]" />

          <div className="leading-tight text-right">
            <div className="kicker">Period</div>
            <div className="num text-xs text-[color:var(--color-text-2)] mt-0.5">
              {client.periodFrom && client.periodTo
                ? `${client.periodFrom} → ${client.periodTo}`
                : '—'}
            </div>
          </div>

          <button
            onClick={() => window.print()}
            className="ml-2 inline-flex items-center gap-2 px-3.5 h-8 rounded-md border border-[color:var(--color-line-strong)] bg-[color:var(--color-panel)] hover:bg-[color:var(--color-panel-hover)] text-[11px] font-medium text-[color:var(--color-text-1)] transition-colors"
            title="Print to PDF"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2M6 14h12v8H6z" />
            </svg>
            <span className="font-mono tracking-wider">PRINT · PDF</span>
          </button>
        </div>
      </div>
    </header>
  )
}
