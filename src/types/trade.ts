export type OptType = 'CE' | 'PE' | 'XX'
export type PositionStatus = 'WIN' | 'LOSS' | 'BREAKEVEN' | 'OPEN'
export type Segment = 'EQUITY' | 'FNO' | 'COMMODITY'

export interface Position {
  key: string
  symbol: string
  expiry: string
  strike: number
  optType: OptType
  buyQty: number
  sellQty: number
  matchedQty: number
  avgBuyRate: number
  avgSellRate: number
  buyAmount: number
  sellAmount: number
  brokerage: number
  sttCtt: number
  grossPnL: number
  netPnL: number
  status: PositionStatus
  firstTradeTime: string
  lastTradeTime: string
  legCount: number
  holdingDays?: number
  segment?: Segment
  isShort?: boolean
}

export interface ClientMeta {
  name?: string
  code?: string
  periodFrom?: string
  periodTo?: string
}

export interface ParseResult {
  positions: Position[]
  client: ClientMeta
  source: 'CSV' | 'XLSX' | 'PDF'
  ingestedAt?: string
}
