import { useQuery } from '@tanstack/react-query'
import { useEffect, useState, type FormEvent } from 'react'
import { Button } from '../../components/ui/Button'
import { SelectField, TextField } from '../../components/ui/Field'
import {
  CURRENCY_FLAGS,
  CURRENCY_NAMES,
  formatMoney,
  PAYOUT_CURRENCIES,
  toMinor,
  type Currency,
  type FixedSide,
  type QuoteKind,
  type QuoteRequest,
} from '@rz/domain'
import { useServices } from '../../services'

function isoDatePlus(days: number): string {
  const d = new Date(Date.now() + days * 24 * 3600 * 1000)
  return d.toISOString().slice(0, 10)
}

export function QuoteForm({
  clientId,
  disabled,
  onSubmit,
}: {
  clientId: string
  disabled: boolean
  onSubmit: (req: QuoteRequest) => void
}) {
  const services = useServices()
  const [sellCurrency, setSellCurrency] = useState<Currency>('AUD')
  const [buyCurrency, setBuyCurrency] = useState<Currency>('NPR')
  const [fixedSide, setFixedSide] = useState<FixedSide>('sell')
  const [amount, setAmount] = useState('50000')
  const [kind, setKind] = useState<QuoteKind>('spot')
  const [valueDate, setValueDate] = useState(isoDatePlus(30))
  const [error, setError] = useState<string | null>(null)

  // funding comes from the client's virtual accounts — any currency they hold
  const { data: balances } = useQuery({
    queryKey: ['balances', clientId],
    queryFn: () => services.accounts.getBalances(clientId),
  })
  const fundingCurrencies = (balances ?? []).map((b) => b.currency)

  useEffect(() => {
    if (fundingCurrencies.length && !fundingCurrencies.includes(sellCurrency)) {
      setSellCurrency(fundingCurrencies[0])
    }
  }, [fundingCurrencies, sellCurrency])

  const buyOptions = PAYOUT_CURRENCIES.filter((c) => c !== sellCurrency)

  useEffect(() => {
    if (buyCurrency === sellCurrency) setBuyCurrency(buyOptions[0])
  }, [sellCurrency, buyCurrency, buyOptions])

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const parsed = Number(amount.replace(/,/g, ''))
    if (!Number.isFinite(parsed) || parsed <= 0) {
      setError('Enter a positive amount')
      return
    }
    setError(null)
    const fixedCurrency: Currency = fixedSide === 'sell' ? sellCurrency : buyCurrency
    onSubmit({
      clientId,
      pair: { sell: sellCurrency, buy: buyCurrency },
      fixedSide,
      amountMinor: toMinor(fixedCurrency, parsed),
      kind,
      valueDate: kind === 'forward' ? valueDate : undefined,
    })
  }

  const fixedCurrency = fixedSide === 'sell' ? sellCurrency : buyCurrency

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* spot / forward toggle */}
      <div role="radiogroup" aria-label="Deal type" className="flex rounded-md border border-gray-300 p-0.5">
        {(['spot', 'forward'] as const).map((k) => (
          <button
            key={k}
            type="button"
            role="radio"
            aria-checked={kind === k}
            onClick={() => setKind(k)}
            className={`flex-1 rounded px-3 py-1.5 text-sm font-bold capitalize transition-colors ${
              kind === k ? 'bg-brand text-white' : 'text-gray-500 hover:text-brand'
            }`}
          >
            {k}
          </button>
        ))}
      </div>

      <SelectField
        label="Pay from account"
        value={sellCurrency}
        onChange={(e) => setSellCurrency(e.target.value as Currency)}
      >
        {(balances ?? []).map((b) => (
          <option key={b.currency} value={b.currency}>
            {CURRENCY_FLAGS[b.currency]} {b.currency} — {formatMoney(b.available, { withCode: false })}{' '}
            available
          </option>
        ))}
      </SelectField>

      <SelectField
        label="Beneficiary receives"
        value={buyCurrency}
        onChange={(e) => setBuyCurrency(e.target.value as Currency)}
      >
        {buyOptions.map((buy) => (
          <option key={buy} value={buy}>
            {CURRENCY_FLAGS[buy]} {buy} — {CURRENCY_NAMES[buy]}
          </option>
        ))}
      </SelectField>

      {/* either-side entry */}
      <div role="radiogroup" aria-label="Amount entry side" className="flex gap-2">
        <button
          type="button"
          role="radio"
          aria-checked={fixedSide === 'sell'}
          onClick={() => setFixedSide('sell')}
          className={`flex-1 rounded-md border px-3 py-2 text-left text-xs font-bold ${
            fixedSide === 'sell' ? 'border-accent bg-accent-soft text-brand' : 'border-gray-200 text-gray-500'
          }`}
        >
          I want to send a fixed {sellCurrency} amount
        </button>
        <button
          type="button"
          role="radio"
          aria-checked={fixedSide === 'buy'}
          onClick={() => setFixedSide('buy')}
          className={`flex-1 rounded-md border px-3 py-2 text-left text-xs font-bold ${
            fixedSide === 'buy' ? 'border-accent bg-accent-soft text-brand' : 'border-gray-200 text-gray-500'
          }`}
        >
          Beneficiary must receive an exact amount
        </button>
      </div>

      <TextField
        label={fixedSide === 'sell' ? `You send (${fixedCurrency})` : `Beneficiary receives (${fixedCurrency})`}
        inputMode="decimal"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        placeholder="0.00"
      />

      {kind === 'forward' && (
        <TextField
          label="Value date"
          type="date"
          value={valueDate}
          min={isoDatePlus(2)}
          max={isoDatePlus(365)}
          onChange={(e) => setValueDate(e.target.value)}
          hint="Forwards can be booked up to 12 months out."
        />
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}

      <Button type="submit" className="w-full" disabled={disabled}>
        Get quote
      </Button>
    </form>
  )
}
