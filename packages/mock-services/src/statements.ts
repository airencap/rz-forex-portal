import { money, type Currency, type Money } from '@rz/domain'
import type { Statement, StatementEntry, StatementRange } from '@rz/domain'
import * as db from './db'

/**
 * Builds a statement from the payment book so it always reconciles: entries
 * are derived (funding debits, returned-funds credits, monthly deposits) and
 * the opening balance is chosen so the closing balance equals the live
 * available balance.
 */

interface RawMovement {
  date: string
  description: string
  reference: string
  minor: number // positive = credit, negative = debit
}

function movementsFor(clientId: string, currency: Currency): RawMovement[] {
  const moves: RawMovement[] = []

  if (currency === 'AUD') {
    // funding debits: any payment that reached funds_pending was funded from the AUD account
    for (const p of db.payments) {
      if (p.clientId !== clientId || p.pair.sell !== 'AUD') continue
      const funded = p.history.find((h) => h.state === 'funds_pending')
      if (!funded) continue
      moves.push({
        date: funded.at,
        description: `FX payment to ${p.beneficiaryName}`,
        reference: p.reference,
        minor: -(p.sellAmount.minor),
      })
      const returned = p.history.find((h) => h.state === 'returned')
      if (returned) {
        moves.push({
          date: returned.at,
          description: `Returned funds — ${p.beneficiaryName}`,
          reference: p.reference,
          minor: p.sellAmount.minor - p.fee.minor,
        })
      }
    }

    // monthly deposits sized to cover that month's debits (round 10k up)
    const debitsByMonth = new Map<string, number>()
    for (const m of moves) {
      if (m.minor >= 0) continue
      const month = m.date.slice(0, 7)
      debitsByMonth.set(month, (debitsByMonth.get(month) ?? 0) - m.minor)
    }
    for (const [month, total] of debitsByMonth) {
      const deposit = Math.ceil(total / 1_000_000) * 1_000_000 // nearest 10k AUD in minor units
      moves.push({
        date: `${month}-01T00:30:00Z`,
        description: 'Client deposit received',
        reference: `DEP-${month.replace('-', '')}`,
        minor: deposit,
      })
    }
  }

  return moves.sort((a, b) => a.date.localeCompare(b.date))
}

export function buildStatement(clientId: string, currency: Currency, range: StatementRange): Statement {
  const available = (db.balances[clientId] ?? []).find((b) => b.currency === currency)?.available.minor ?? 0
  const allMoves = movementsFor(clientId, currency)

  // opening balance chosen so that opening + all movements = live available balance
  const totalNet = allMoves.reduce((sum, m) => sum + m.minor, 0)
  const openingAtDawnOfTime = available - totalNet

  const fromTs = `${range.from}T00:00:00Z`
  const toTs = `${range.to}T23:59:59Z`
  const before = allMoves.filter((m) => m.date < fromTs)
  const inRange = allMoves.filter((m) => m.date >= fromTs && m.date <= toTs)

  const opening = openingAtDawnOfTime + before.reduce((sum, m) => sum + m.minor, 0)

  let running = opening
  const entries: StatementEntry[] = inRange.map((m) => {
    running += m.minor
    return {
      date: m.date,
      description: m.description,
      reference: m.reference,
      debit: m.minor < 0 ? money(currency, -m.minor) : null,
      credit: m.minor > 0 ? money(currency, m.minor) : null,
      balance: money(currency, running),
    }
  })

  const closingMoney: Money = money(currency, running)
  return {
    currency,
    range,
    opening: money(currency, opening),
    closing: closingMoney,
    entries,
  }
}
