import { pairKey, type Payment } from '@rz/domain'
import type { RevenueLine, RevenueReport, StatementRange } from '@rz/domain'
import * as db from './db'
import { convertMinor } from './marketData'

/**
 * Revenue reproduced from per-trade pricing snapshots (client rate, mid
 * reference, fee) — exactly what the domain rules require the ledger to do.
 * Income arises in the funding (sell) currency; the report is
 * AUD-denominated, converting at current mids.
 */

const REVENUE_STATES = new Set(['booked', 'funds_pending', 'in_flight', 'settled', 'returned'])

function spreadIncomeAudMinor(p: Payment): number {
  const principal = p.sellAmount.minor - p.fee.minor
  const spreadSellMinor = Math.round(principal * (1 - p.clientRate / p.midRate))
  return convertMinor(p.pair.sell, 'AUD', spreadSellMinor)
}

function accumulate(lines: Map<string, RevenueLine>, key: string, label: string, p: Payment): void {
  const line = lines.get(key) ?? { key, label, spreadMinor: 0, feeMinor: 0, volumeMinor: 0, trades: 0 }
  line.spreadMinor += spreadIncomeAudMinor(p)
  line.feeMinor += convertMinor(p.pair.sell, 'AUD', p.fee.minor)
  line.volumeMinor += convertMinor(p.pair.sell, 'AUD', p.sellAmount.minor)
  line.trades += 1
  lines.set(key, line)
}

export function buildRevenueReport(range: StatementRange): RevenueReport {
  const fromTs = `${range.from}T00:00:00Z`
  const toTs = `${range.to}T23:59:59Z`
  const inScope = db.payments.filter(
    (p) =>
      REVENUE_STATES.has(p.state) &&
      p.approval?.status !== 'pending' &&
      p.createdAt >= fromTs &&
      p.createdAt <= toTs,
  )

  const byCorridor = new Map<string, RevenueLine>()
  const byClient = new Map<string, RevenueLine>()
  for (const p of inScope) {
    accumulate(byCorridor, pairKey(p.pair), pairKey(p.pair), p)
    const client = db.clients.find((c) => c.id === p.clientId)
    accumulate(byClient, p.clientId, client?.name ?? p.clientId, p)
  }

  const totals = { spreadMinor: 0, feeMinor: 0, volumeMinor: 0, trades: 0 }
  for (const p of inScope) {
    totals.spreadMinor += spreadIncomeAudMinor(p)
    totals.feeMinor += convertMinor(p.pair.sell, 'AUD', p.fee.minor)
    totals.volumeMinor += convertMinor(p.pair.sell, 'AUD', p.sellAmount.minor)
    totals.trades += 1
  }

  const desc = (a: RevenueLine, b: RevenueLine) =>
    b.spreadMinor + b.feeMinor - (a.spreadMinor + a.feeMinor)
  return {
    range,
    totals,
    byCorridor: [...byCorridor.values()].sort(desc),
    byClient: [...byClient.values()].sort(desc),
  }
}
