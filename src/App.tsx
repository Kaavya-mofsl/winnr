import { useEffect, useMemo } from 'react'
import clientData from '@/data/client.json'
import type { ParseResult } from '@/types/trade'
import { calculateBHS, printBHS } from '@/lib/bhs'
import { Header } from '@/features/dashboard/Header'
import { Section } from '@/features/dashboard/Section'
import { ActiveClient } from '@/features/dashboard/ActiveClient'
import { BHSHero } from '@/features/dashboard/BHSHero'
import { AIAnalysis } from '@/features/dashboard/AIAnalysis'
import { PnLByInstrument } from '@/features/dashboard/PnLByInstrument'
import { StrategyDistribution } from '@/features/dashboard/StrategyDistribution'
import { ActivityHeatmap } from '@/features/dashboard/ActivityHeatmap'
import { PositionsTable } from '@/features/dashboard/PositionsTable'

const data = clientData as unknown as ParseResult

export default function App() {
  const { client, positions, ingestedAt } = data
  const bhs = useMemo(() => calculateBHS(positions), [positions])

  useEffect(() => {
    printBHS(bhs, client)
  }, [bhs, client])

  return (
    <div className="min-h-screen text-[color:var(--color-text-1)]">
      <Header client={client} positionCount={positions.length} />

      <main className="max-w-[1320px] mx-auto px-8 py-10 space-y-12 print-expand-all">
        {/* 1 — Active Client (replaces upload area) */}
        <ActiveClient client={client} positions={positions} ingestedAt={ingestedAt} />

        {/* 2/3 — BHS + dimensions */}
        <Section
          index="01"
          title="Behavioral Health Score"
          subtitle="A weighted measure of trading discipline across six behavioral dimensions."
          delay={120}
        >
          <BHSHero bhs={bhs} />
        </Section>

        {/* 4/5 — AI Findings + Talking Points */}
        <Section
          index="02"
          title="AI Behavioral Analysis"
          subtitle="Anonymized summary sent to Groq · raw trades stay on device."
          delay={180}
        >
          <AIAnalysis positions={positions} bhs={bhs} client={client} />
        </Section>

        {/* 6/7 — P&L by Instrument + Strategy Distribution */}
        <Section
          index="03"
          title="Book Composition"
          subtitle="Where the money came from, and what shapes the book."
          delay={240}
        >
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <PnLByInstrument positions={positions} />
            <StrategyDistribution positions={positions} />
          </div>
        </Section>

        {/* 8 — Activity heatmap */}
        <Section
          index="04"
          title="Trading Activity"
          subtitle="Day-of-week × week-of-year. Intraday timestamps require Motilal Trade Book export."
          delay={300}
        >
          <ActivityHeatmap positions={positions} />
        </Section>

        {/* 9 — Positions table */}
        <Section
          index="05"
          title="All Positions"
          subtitle="Sort any column · click a row to expand trade legs · search by symbol."
          delay={360}
        >
          <PositionsTable positions={positions} />
        </Section>

        <footer className="pt-8 pb-4 border-t border-[color:var(--color-line)] text-[10px] font-mono text-[color:var(--color-text-3)] uppercase tracking-wider flex items-center justify-between">
          <span>WINNR.AI · Behavioral Intelligence for Indian F&O Markets</span>
          <span>Not investment advice · Historical pattern reporting only</span>
        </footer>
      </main>
    </div>
  )
}
