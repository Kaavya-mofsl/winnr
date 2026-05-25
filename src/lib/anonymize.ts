// Aggregate raw positions + BHS into a compact, anonymized payload safe to
// send to Groq. Strips client name/code. Public market symbols (NIFTY, BANKNIFTY,
// etc.) are kept — they are not PII and the AI needs them to ground findings.

import type { Position, ClientMeta } from '@/types/trade'
import type { BHSResult } from '@/lib/bhs'

export interface AnonymizedSummary {
  period: { from?: string; to?: string }
  scope: {
    positions: number
    activeDays: number
    segments: Record<string, number>
  }
  pnl: {
    netTotal: number
    bySegment: Record<string, number>
    winRate: number
    avgWin: number
    avgLoss: number
    largestWin: number
    largestLoss: number
    totalSttCtt: number
  }
  bhs: {
    score: number
    label: string
    dimensions: { name: string; risk: number; detail: string }[]
  }
  topInstruments: {
    symbol: string
    positions: number
    pctOfTotal: number
    netPnL: number
    winRate: number
  }[]
  directional: {
    shortPct: number
    longPct: number
    shortNetPnL: number
    longNetPnL: number
  }
  expiryProximity: {
    fnoPositions: number
    within2DaysCount: number
    within2DaysPct: number
    within2DaysNetPnL: number
    within2DaysWinRate: number
  }
  holdingPeriod: {
    avgWinHoldDays: number
    avgLossHoldDays: number
    holdRatioLossOverWin: number
  }
  dailyActivity: {
    avgLegsPerDay: number
    maxLegsInOneDay: number
    bigLossDays: number
    bigLossDaysFollowedBySpike: number
  }
}

const round = (n: number, d = 2) => {
  const f = Math.pow(10, d)
  return Math.round(n * f) / f
}

const daysBetween = (a: string, b: string) => {
  const d1 = new Date(a).getTime()
  const d2 = new Date(b).getTime()
  if (!Number.isFinite(d1) || !Number.isFinite(d2)) return NaN
  return Math.round((d2 - d1) / 86400000)
}

export function anonymize(
  positions: Position[],
  bhs: BHSResult,
  client: ClientMeta
): AnonymizedSummary {
  // segment counts + per-segment P&L
  const segments: Record<string, number> = {}
  const pnlBySegment: Record<string, number> = {}
  for (const p of positions) {
    const seg = p.segment ?? 'UNKNOWN'
    segments[seg] = (segments[seg] ?? 0) + 1
    pnlBySegment[seg] = round((pnlBySegment[seg] ?? 0) + p.netPnL)
  }

  // win/loss aggregates
  const wins = positions.filter((p) => p.status === 'WIN')
  const losses = positions.filter((p) => p.status === 'LOSS')
  const decided = wins.length + losses.length
  const winRate = decided > 0 ? (wins.length / decided) * 100 : 0
  const avgWin =
    wins.length > 0
      ? wins.reduce((s, p) => s + p.netPnL, 0) / wins.length
      : 0
  const avgLoss =
    losses.length > 0
      ? losses.reduce((s, p) => s + p.netPnL, 0) / losses.length
      : 0
  const largestWin = wins.reduce((m, p) => Math.max(m, p.netPnL), 0)
  const largestLoss = losses.reduce((m, p) => Math.min(m, p.netPnL), 0)

  // top instruments by position count
  const bySym = new Map<
    string,
    { count: number; pnl: number; wins: number; decided: number }
  >()
  for (const p of positions) {
    const cur = bySym.get(p.symbol) ?? { count: 0, pnl: 0, wins: 0, decided: 0 }
    cur.count++
    cur.pnl += p.netPnL
    if (p.status === 'WIN') {
      cur.wins++
      cur.decided++
    } else if (p.status === 'LOSS') {
      cur.decided++
    }
    bySym.set(p.symbol, cur)
  }
  const topInstruments = [...bySym.entries()]
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 5)
    .map(([symbol, s]) => ({
      symbol,
      positions: s.count,
      pctOfTotal: round((s.count / positions.length) * 100, 1),
      netPnL: round(s.pnl),
      winRate: s.decided > 0 ? round((s.wins / s.decided) * 100, 1) : 0,
    }))

  // directional
  const shorts = positions.filter((p) => p.isShort)
  const longs = positions.filter((p) => !p.isShort)
  const directional = {
    shortPct: round((shorts.length / positions.length) * 100, 1),
    longPct: round((longs.length / positions.length) * 100, 1),
    shortNetPnL: round(shorts.reduce((s, p) => s + p.netPnL, 0)),
    longNetPnL: round(longs.reduce((s, p) => s + p.netPnL, 0)),
  }

  // expiry proximity (F&O only)
  const fno = positions.filter(
    (p) => p.segment === 'FNO' && p.expiry && p.firstTradeTime
  )
  const nearExpiry = fno.filter((p) => {
    const d = daysBetween(p.firstTradeTime, p.expiry)
    return Number.isFinite(d) && d >= 0 && d <= 2
  })
  const nearWinDecided = nearExpiry.filter(
    (p) => p.status === 'WIN' || p.status === 'LOSS'
  )
  const nearWins = nearExpiry.filter((p) => p.status === 'WIN').length
  const expiryProximity = {
    fnoPositions: fno.length,
    within2DaysCount: nearExpiry.length,
    within2DaysPct:
      fno.length > 0 ? round((nearExpiry.length / fno.length) * 100, 1) : 0,
    within2DaysNetPnL: round(nearExpiry.reduce((s, p) => s + p.netPnL, 0)),
    within2DaysWinRate:
      nearWinDecided.length > 0
        ? round((nearWins / nearWinDecided.length) * 100, 1)
        : 0,
  }

  // holding period asymmetry
  const winHolds = wins.map((p) => p.holdingDays).filter((d): d is number => d != null)
  const lossHolds = losses.map((p) => p.holdingDays).filter((d): d is number => d != null)
  const avgWinHold =
    winHolds.length > 0 ? winHolds.reduce((a, b) => a + b, 0) / winHolds.length : 0
  const avgLossHold =
    lossHolds.length > 0
      ? lossHolds.reduce((a, b) => a + b, 0) / lossHolds.length
      : 0

  // daily activity
  const legsPerDay = new Map<string, number>()
  const pnlPerDay = new Map<string, number>()
  for (const p of positions) {
    if (p.firstTradeTime)
      legsPerDay.set(p.firstTradeTime, (legsPerDay.get(p.firstTradeTime) ?? 0) + 1)
    if (p.lastTradeTime) {
      legsPerDay.set(p.lastTradeTime, (legsPerDay.get(p.lastTradeTime) ?? 0) + 1)
      pnlPerDay.set(p.lastTradeTime, (pnlPerDay.get(p.lastTradeTime) ?? 0) + p.netPnL)
    }
  }
  const dailyLegs = [...legsPerDay.values()]
  const dailyLegsSorted = [...dailyLegs].sort((a, b) => a - b)
  const medLegs =
    dailyLegsSorted.length > 0
      ? dailyLegsSorted[Math.floor(dailyLegsSorted.length / 2)]
      : 0
  const allDates = [...new Set([...pnlPerDay.keys(), ...legsPerDay.keys()])]
    .filter(Boolean)
    .sort()
  const pnlValuesSorted = [...pnlPerDay.values()].sort((a, b) => a - b)
  const q1 =
    pnlValuesSorted.length > 0
      ? pnlValuesSorted[Math.floor(pnlValuesSorted.length / 4)]
      : 0
  const bigLossDays = allDates.filter((d) => {
    const v = pnlPerDay.get(d) ?? 0
    return v <= q1 && v < 0
  })
  let spikes = 0
  for (const d of bigLossDays) {
    const idx = allDates.indexOf(d)
    const next = allDates[idx + 1]
    if (!next) continue
    if ((legsPerDay.get(next) ?? 0) > 1.5 * medLegs) spikes++
  }

  const activeDays = new Set<string>()
  for (const p of positions) {
    if (p.firstTradeTime) activeDays.add(p.firstTradeTime)
    if (p.lastTradeTime) activeDays.add(p.lastTradeTime)
  }

  void client // intentionally unused — anonymizer drops all client identity

  return {
    period: { from: client.periodFrom, to: client.periodTo },
    scope: {
      positions: positions.length,
      activeDays: activeDays.size,
      segments,
    },
    pnl: {
      netTotal: round(positions.reduce((s, p) => s + p.netPnL, 0)),
      bySegment: pnlBySegment,
      winRate: round(winRate, 1),
      avgWin: round(avgWin),
      avgLoss: round(avgLoss),
      largestWin: round(largestWin),
      largestLoss: round(largestLoss),
      totalSttCtt: round(positions.reduce((s, p) => s + p.sttCtt, 0)),
    },
    bhs: {
      score: bhs.bhs,
      label: bhs.label,
      dimensions: bhs.dimensions.map((d) => ({
        name: d.name,
        risk: d.risk,
        detail: d.detail,
      })),
    },
    topInstruments,
    directional,
    expiryProximity,
    holdingPeriod: {
      avgWinHoldDays: round(avgWinHold, 1),
      avgLossHoldDays: round(avgLossHold, 1),
      holdRatioLossOverWin:
        avgWinHold > 0 ? round(avgLossHold / avgWinHold, 2) : 0,
    },
    dailyActivity: {
      avgLegsPerDay:
        dailyLegs.length > 0
          ? round(dailyLegs.reduce((a, b) => a + b, 0) / dailyLegs.length, 1)
          : 0,
      maxLegsInOneDay: dailyLegs.length > 0 ? Math.max(...dailyLegs) : 0,
      bigLossDays: bigLossDays.length,
      bigLossDaysFollowedBySpike: spikes,
    },
  }
}
