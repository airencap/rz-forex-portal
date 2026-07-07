import { pairKey, type Payment } from '@rz/domain'
import type { RevenueLine, RevenueReport, StatementRange } from '@rz/domain'
import * as db from './db'

/**
 * Revenue reproduced from per-trade pricing snapshots (client rate, mid
 * reference, fee) — exactly what the domain rules require the ledger to do.
 * Spread income in AUD = converted principal × (1 − clientRate/midRate).
 */

const REVENUE_STATES = new Set(['booked', 'funds_pending', 'in_flight', 'settled', 'returned'])

function spreadIncomeMinor(p: Payment): number {
  const principal = p.sellAmount.minor - p.fee.minor
  return Math.round(principal * (1 - p.clientRate / p.midRate))
}

function accumulate(lines: Map<string, RevenueLine>, key: string, label: string, p: Payment): void {
  const line = lines.get(key) ?? { key, label, spreadMinor: 0, feeMinor: 0, volumeMinor: 0, trades: 0 }
  line.spreadMinor += spreadIncomeMinor(p)
  line.feeMinor += p.fee.minor
  line.volumeMinor += p.sellAmount.minor
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
    totals.spreadMinor += spreadIncomeMinor(p)
    totals.feeMinor += p.fee.minor
    totals.volumeMinor += p.sellAmount.minor
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
