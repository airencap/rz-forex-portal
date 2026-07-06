import { useEffect, useState } from 'react'
import { Button } from '../../components/ui/Button'
import { CountdownRing } from '../../components/ui/CountdownRing'
import {
  formatMoney,
  formatRate,
  pairKey,
  quoteSecondsLeft,
  type Quote,
} from '../../domain'

const QUOTE_VALIDITY_S = 30

/**
 * Wise-style total-cost transparency: rate vs mid, spread cost, fixed fee.
 * An expired quote must be re-requested — it is never silently refreshed.
 */
export function QuoteCard({ quote, onRequote }: { quote: Quote; onRequote: () => void }) {
  const [secondsLeft, setSecondsLeft] = useState(() => quoteSecondsLeft(quote))

  useEffect(() => {
    setSecondsLeft(quoteSecondsLeft(quote))
    const t = setInterval(() => setSecondsLeft(quoteSecondsLeft(quote)), 1000)
    return () => clearInterval(t)
  }, [quote])

  const expired = secondsLeft <= 0

  return (
    <div
      className={`rounded-lg border-2 p-5 transition-colors ${
        expired ? 'border-red-200 bg-red-50/50' : 'border-accent bg-white'
      }`}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-gray-400">
            {quote.kind === 'forward' ? `Forward quote · value date ${quote.valueDate}` : 'Spot quote'}
          </p>
          <p className="mt-1 text-2xl font-bold text-brand tabular-nums">
            1 AUD = {formatRate(quote.clientRate)} {quote.pair.buy}
          </p>
          <p className="text-xs text-gray-500">
            Mid-market {pairKey(quote.pair)}: {formatRate(quote.midRate)} · your margin {quote.spreadBps} bps
          </p>
        </div>
        {expired ? (
          <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-bold text-red-700">Expired</span>
        ) : (
          <CountdownRing secondsLeft={secondsLeft} total={QUOTE_VALIDITY_S} />
        )}
      </div>

      <dl className="mt-4 space-y-1.5 border-t border-gray-100 pt-4 text-sm">
        <div className="flex justify-between">
          <dt className="text-gray-500">You send</dt>
          <dd className="font-bold tabular-nums">{formatMoney(quote.sellAmount)}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-gray-500">Fixed transfer fee</dt>
          <dd className="tabular-nums text-gray-700">− {formatMoney(quote.fee)}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-gray-500">FX margin cost (vs mid-market)</dt>
          <dd className="tabular-nums text-gray-700">≈ {formatMoney(quote.spreadCost)}</dd>
        </div>
        {quote.kind === 'forward' && (
          <div className="flex justify-between">
            <dt className="text-gray-500">Forward points adjustment</dt>
            <dd className="tabular-nums text-gray-700">
              {quote.forwardPoints >= 0 ? '+' : ''}
              {formatRate(quote.forwardPoints)}
            </dd>
          </div>
        )}
        <div className="flex justify-between border-t border-gray-100 pt-2 text-base">
          <dt className="font-bold text-brand">Beneficiary receives</dt>
          <dd className="font-bold text-brand tabular-nums">{formatMoney(quote.buyAmount)}</dd>
        </div>
      </dl>

      {expired && (
        <div className="mt-4 flex items-center justify-between rounded-md bg-red-100/70 px-3 py-2">
          <p className="text-sm text-red-700">Quote expired — rates move. Request a fresh quote to continue.</p>
          <Button variant="secondary" onClick={onRequote}>
            Requote
          </Button>
        </div>
      )}
    </div>
  )
}
