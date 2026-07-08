import { Link } from 'react-router-dom'
import { Button } from '../../components/ui/Button'
import { formatMoney, type Payment } from '@rz/domain'

export function BookingConfirmation({ payment, onNewPayment }: { payment: Payment; onNewPayment: () => void }) {
  return (
    <div className="rounded-lg border-2 border-emerald-300 bg-white p-6">
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 text-lg text-emerald-700" aria-hidden>
          ✓
        </span>
        <div>
          <h2 className="text-lg font-bold text-brand">Booked — {payment.reference}</h2>
          <p className="text-sm text-gray-500">
            {formatMoney(payment.sellAmount)} → {formatMoney(payment.buyAmount)} to {payment.beneficiaryName}
            {payment.kind === 'forward' && ` · settles ${payment.valueDate}`}
          </p>
        </div>
      </div>

      <div className="mt-5 rounded-md bg-surface p-4">
        <h3 className="text-xs font-bold uppercase tracking-wide text-gray-500">
          Fund this payment — transfer {formatMoney(payment.sellAmount)} to your{' '}
          {payment.funding.currency} virtual account
        </h3>
        <dl className="mt-3 grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
          <div>
            <dt className="text-xs text-gray-400">Account name</dt>
            <dd className="font-bold text-brand">{payment.funding.accountName}</dd>
          </div>
          {payment.funding.fields.map((f) => (
            <div key={f.label}>
              <dt className="text-xs text-gray-400">{f.label}</dt>
              <dd className="font-bold text-brand tabular-nums">{f.value}</dd>
            </div>
          ))}
          <div>
            <dt className="text-xs text-gray-400">Payment reference (required)</dt>
            <dd className="font-bold text-accent tabular-nums">{payment.reference}</dd>
          </div>
        </dl>
        <p className="mt-3 text-xs text-gray-400">
          Your booked rate of {payment.clientRate.toFixed(4)} is locked. The payment is released once funds arrive.
        </p>
      </div>

      <div className="mt-5 flex gap-3">
        <Link to={`/payments/${payment.id}`}>
          <Button>Track payment</Button>
        </Link>
        <Button variant="secondary" onClick={onNewPayment}>
          Book another
        </Button>
      </div>
    </div>
  )
}
