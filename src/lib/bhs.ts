// Behavioral Health Score (BHS)
//
// Each of the 6 dimensions produces a 0–100 risk sub-score (higher = worse
// behavior). BHS = 100 − weighted-average(risks), so higher BHS = healthier.
//
// Bands:
//   70–100 → Disciplined Trader   (green)
//   50–69  → Mixed Discipline     (yellow)
//    0–49  → High Behavioral Risk (red)
//
// Limitation: source data is day-level (no intraday timestamps), so Revenge
// Trading detects *next-day* spikes only, not same-session tilt.

import type { Position, ClientMeta } from '@/types/trade'

export type RiskBand = 'green' | 'yellow' | 'red'

export interface DimensionScore {
  name: string
  risk: number
  weight: number
  detail: string
}

export interface BHSResult {
  bhs: number
  label: string
  band: RiskBand
  weightedRisk: number
  dimensions: DimensionScore[]
  meta: {
    totalPositions: number
    activeDays: number
    fnoPositions: number
  }
}

const WEIGHTS = {
  overtrading: 0.2,
  lossAversion: 0.25,
  shortBias: 0.1,
  revenge: 0.2,
  concentration: 0.1,
  expiry: 0.15,
}

const clamp = (n: number, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, n))
const mean = (xs: number[]) =>
  xs.length === 0 ? 0 : xs.reduce((a, b) => a + b, 0) / xs.length
const median = (xs: number[]) => {
  if (xs.length === 0) return 0
  const s = [...xs].sort((a, b) => a - b)
  const m = Math.floor(s.length / 2)
  return s.length % 2 === 0 ? (s[m - 1] + s[m]) / 2 : s[m]
}
const daysBetween = (a: string, b: string) => {
  const d1 = new Date(a).getTime()
  const d2 = new Date(b).getTime()
  if (!Number.isFinite(d1) || !Number.isFinite(d2)) return NaN
  return Math.round((d2 - d1) / 86400000)
}

// 1. Overtrading: avg legs per active day. 2 legs/day = baseline (0 risk),
//    8+ legs/day = saturated (100 risk).
function scoreOvertrading(positions: Position[]): DimensionScore {
  const legsPerDay = new Map<string, number>()
  for (const p of positions) {
    if (p.firstTradeTime)
      legsPerDay.set(p.firstTradeTime, (legsPerDay.get(p.firstTradeTime) ?? 0) + 1)
    if (p.lastTradeTime)
      legsPerDay.set(p.lastTradeTime, (legsPerDay.get(p.lastTradeTime) ?? 0) + 1)
  }
  const daily = [...legsPerDay.values()]
  const avg = mean(daily)
  const risk = clamp(((avg - 2) / 6) * 100)
  return {
    name: 'Overtrading',
    risk: Math.round(risk),
    weight: WEIGHTS.overtrading,
    detail: `avg ${avg.toFixed(1)} legs/day across ${daily.length} active days`,
  }
}

// 2. Loss Aversion: ride losers, cut winners.
//    Combines (a) holding-period asymmetry and (b) win/loss size asymmetry.
function scoreLossAversion(positions: Position[]): DimensionScore {
  const winHolds: number[] = []
  const lossHolds: number[] = []
  const wins: number[] = []
  const losses: number[] = []
  for (const p of positions) {
    if (p.status === 'WIN') {
      if (p.holdingDays != null) winHolds.push(p.holdingDays)
      wins.push(p.netPnL)
    } else if (p.status === 'LOSS') {
      if (p.holdingDays != null) lossHolds.push(p.holdingDays)
      losses.push(Math.abs(p.netPnL))
    }
  }
  const avgWinHold = mean(winHolds)
  const avgLossHold = mean(lossHolds)
  const holdRatio = avgWinHold > 0 ? avgLossHold / avgWinHold : 1
  const riskA = clamp(((holdRatio - 1) / 2) * 100)

  const avgWin = mean(wins)
  const avgLoss = mean(losses)
  const pnlRatio = avgLoss > 0 ? avgWin / avgLoss : 1.5
  const riskB = clamp(((1.5 - pnlRatio) / 1.5) * 100)

  const risk = (riskA + riskB) / 2
  return {
    name: 'Loss Aversion',
    risk: Math.round(risk),
    weight: WEIGHTS.lossAversion,
    detail: `hold loss/win=${holdRatio.toFixed(2)}x · avg win/loss size=${pnlRatio.toFixed(2)}x`,
  }
}

// 3. Short Only Bias: directional skew toward shorts.
//    Pure short-heavy is the flagged side (matches the dimension name).
function scoreShortBias(positions: Position[]): DimensionScore {
  const total = positions.length
  const shorts = positions.filter((p) => p.isShort).length
  const pct = total > 0 ? shorts / total : 0
  const risk = clamp((pct - 0.5) * 200, 0, 100)
  return {
    name: 'Short Only Bias',
    risk: Math.round(risk),
    weight: WEIGHTS.shortBias,
    detail: `${(pct * 100).toFixed(0)}% of positions are short`,
  }
}

// 4. Revenge Trading: next-day leg spike after a big-loss day.
//    Big-loss day = bottom-quartile daily P&L. Spike = next-day legs > 1.5× median.
function scoreRevenge(positions: Position[]): DimensionScore {
  const dailyPnL = new Map<string, number>()
  const dailyLegs = new Map<string, number>()
  for (const p of positions) {
    if (p.lastTradeTime)
      dailyPnL.set(
        p.lastTradeTime,
        (dailyPnL.get(p.lastTradeTime) ?? 0) + p.netPnL
      )
    if (p.firstTradeTime)
      dailyLegs.set(p.firstTradeTime, (dailyLegs.get(p.firstTradeTime) ?? 0) + 1)
    if (p.lastTradeTime)
      dailyLegs.set(p.lastTradeTime, (dailyLegs.get(p.lastTradeTime) ?? 0) + 1)
  }
  const allDates = [...new Set([...dailyPnL.keys(), ...dailyLegs.keys()])]
    .filter(Boolean)
    .sort()
  const pnlValues = [...dailyPnL.values()].sort((a, b) => a - b)
  if (pnlValues.length < 4) {
    return {
      name: 'Revenge Trading',
      risk: 0,
      weight: WEIGHTS.revenge,
      detail: 'insufficient daily P&L history to detect',
    }
  }
  const q1Threshold = pnlValues[Math.floor(pnlValues.length / 4)]
  const medLegs = median([...dailyLegs.values()])
  const bigLossDays = allDates.filter((d) => {
    const v = dailyPnL.get(d) ?? 0
    return v <= q1Threshold && v < 0
  })
  let spikes = 0
  for (const d of bigLossDays) {
    const idx = allDates.indexOf(d)
    const next = allDates[idx + 1]
    if (!next) continue
    const legs = dailyLegs.get(next) ?? 0
    if (legs > 1.5 * medLegs) spikes++
  }
  const pct = bigLossDays.length > 0 ? spikes / bigLossDays.length : 0
  return {
    name: 'Revenge Trading',
    risk: Math.round(clamp(pct * 100)),
    weight: WEIGHTS.revenge,
    detail: `${spikes}/${bigLossDays.length} big-loss days followed by next-day leg spike (median ${medLegs} legs/day)`,
  }
}

// 5. Instrument Concentration: % of positions in the single top underlying.
function scoreConcentration(positions: Position[]): DimensionScore {
  if (positions.length === 0) {
    return {
      name: 'Instrument Concentration',
      risk: 0,
      weight: WEIGHTS.concentration,
      detail: 'no positions',
    }
  }
  const bySym = new Map<string, number>()
  for (const p of positions) {
    bySym.set(p.symbol, (bySym.get(p.symbol) ?? 0) + 1)
  }
  let topSym = ''
  let topCount = 0
  for (const [s, c] of bySym) {
    if (c > topCount) {
      topCount = c
      topSym = s
    }
  }
  const share = topCount / positions.length
  const risk = clamp(((share - 0.2) / 0.4) * 100)
  return {
    name: 'Instrument Concentration',
    risk: Math.round(risk),
    weight: WEIGHTS.concentration,
    detail: `top symbol "${topSym}" = ${(share * 100).toFixed(0)}% of positions`,
  }
}

// 6. Expiry Dependency: F&O positions opened within 48h of expiry.
function scoreExpiry(positions: Position[]): DimensionScore {
  const fno = positions.filter(
    (p) => p.segment === 'FNO' && p.expiry && p.firstTradeTime
  )
  if (fno.length === 0) {
    return {
      name: 'Expiry Dependency',
      risk: 0,
      weight: WEIGHTS.expiry,
      detail: 'no F&O positions with expiry data',
    }
  }
  let nearExpiry = 0
  for (const p of fno) {
    const d = daysBetween(p.firstTradeTime, p.expiry)
    if (Number.isFinite(d) && d >= 0 && d <= 2) nearExpiry++
  }
  const pct = nearExpiry / fno.length
  const risk = clamp(((pct - 0.1) / 0.5) * 100)
  return {
    name: 'Expiry Dependency',
    risk: Math.round(risk),
    weight: WEIGHTS.expiry,
    detail: `${(pct * 100).toFixed(0)}% of F&O positions opened within 48h of expiry`,
  }
}

export function calculateBHS(positions: Position[]): BHSResult {
  const dimensions: DimensionScore[] = [
    scoreOvertrading(positions),
    scoreLossAversion(positions),
    scoreShortBias(positions),
    scoreRevenge(positions),
    scoreConcentration(positions),
    scoreExpiry(positions),
  ]
  const weightedRisk = dimensions.reduce((s, d) => s + d.risk * d.weight, 0)
  const bhs = Math.round(clamp(100 - weightedRisk))
  let label = 'High Behavioral Risk'
  let band: RiskBand = 'red'
  if (bhs >= 70) {
    label = 'Disciplined Trader'
    band = 'green'
  } else if (bhs >= 50) {
    label = 'Mixed Discipline'
    band = 'yellow'
  }

  const activeDays = new Set<string>()
  for (const p of positions) {
    if (p.firstTradeTime) activeDays.add(p.firstTradeTime)
    if (p.lastTradeTime) activeDays.add(p.lastTradeTime)
  }

  return {
    bhs,
    label,
    band,
    weightedRisk: Math.round(weightedRisk),
    dimensions,
    meta: {
      totalPositions: positions.length,
      activeDays: activeDays.size,
      fnoPositions: positions.filter((p) => p.segment === 'FNO').length,
    },
  }
}

export function printBHS(result: BHSResult, client?: ClientMeta) {
  console.groupCollapsed(
    `%cBHS ${result.bhs} — ${result.label}`,
    `color:${result.band}; font-weight:bold; font-size:14px`
  )
  if (client?.name) {
    console.log(
      `Client : ${client.name}${client.code ? ' (' + client.code + ')' : ''}`
    )
  }
  if (client?.periodFrom && client?.periodTo) {
    console.log(`Period : ${client.periodFrom} → ${client.periodTo}`)
  }
  console.log(
    `Scope  : ${result.meta.totalPositions} positions · ${result.meta.activeDays} active days · ${result.meta.fnoPositions} F&O`
  )
  console.log('')
  console.log('Dimension                  Risk  Weight  Detail')
  console.log('─'.repeat(80))
  for (const d of result.dimensions) {
    console.log(
      `${d.name.padEnd(26)} ${String(d.risk).padStart(4)}  ${d.weight.toFixed(2).padStart(6)}  ${d.detail}`
    )
  }
  console.log('─'.repeat(80))
  console.log(`Weighted Risk : ${result.weightedRisk}`)
  console.log(
    `%cBHS           : ${result.bhs} — ${result.label}`,
    `color:${result.band}; font-weight:bold`
  )
  console.log('')
  console.log(
    '%cNote: Source data is day-level only. Same-day tilt (intraday revenge trading) needs a Motilal Trade Book export with timestamps.',
    'color:#888; font-style:italic'
  )
  console.groupEnd()
}
