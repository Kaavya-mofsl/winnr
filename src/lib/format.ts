const inrFmt = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 })

export function money(n: number, opts: { sign?: boolean } = {}): string {
  if (!Number.isFinite(n)) return '—'
  const sign = n < 0 ? '−' : opts.sign && n > 0 ? '+' : ''
  return `${sign}₹${inrFmt.format(Math.abs(n))}`
}

export function compactMoney(n: number): string {
  if (!Number.isFinite(n)) return '—'
  const abs = Math.abs(n)
  const sign = n < 0 ? '−' : ''
  if (abs >= 10_000_000) return `${sign}₹${(abs / 10_000_000).toFixed(2)}Cr`
  if (abs >= 100_000) return `${sign}₹${(abs / 100_000).toFixed(2)}L`
  if (abs >= 1_000) return `${sign}₹${(abs / 1_000).toFixed(1)}K`
  return `${sign}₹${abs.toFixed(0)}`
}

export function pct(n: number, digits = 0): string {
  if (!Number.isFinite(n)) return '—'
  return `${n.toFixed(digits)}%`
}

export function num(n: number, digits = 2): string {
  if (!Number.isFinite(n)) return '—'
  return inrFmt.format(Number(n.toFixed(digits)))
}
