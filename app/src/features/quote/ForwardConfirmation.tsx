import { Link } from 'react-router-dom'
import { Button } from '../../components/ui/Button'
import { formatMoney, formatRate, type ForwardContract } from '@rz/domain'

export function ForwardConfirmation({
  contract,
  onNewPayment,
}: {
  contract: ForwardContract
  onNewPayment: () => void
}) {
  return (
    <div className="rounded-lg border-2 border-indigo-300 bg-white p-6">
      <div className="flex items-center gap-3">
        <span
          className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100 text-lg text-indigo-700"
          aria-hidden
        >
          ⧗
        </span>
        <div>
          <h2 className="text-lg font-bold text-brand">Forward booked — {contract.reference}</h2>
          <p className="text-sm text-gray-500">
            {formatMoney(contract.notional)} at {formatRate(contract.lockedRate)} · value date{' '}
            {contract.valueDate} · {contract.beneficiaryName}
          </p>
        </div>
      </div>

      <div className="mt-5 rounded-md bg-surface p-4 text-sm text-gray-600">
        <p>
          Your rate of <strong>{formatRate(contract.lockedRate)}</strong> is locked until{' '}
          {contract.valueDate}. Draw down part or all of the notional from the Forwards page —
          each drawdown creates a payment at the locked rate with funding instructions.
        </p>
      </div>

      <div className="mt-5 flex gap-3">
        <Link to="/forwards">
          <Button>View forward contracts</Button>
        </Link>
        <Button variant="secondary" onClick={onNewPayment}>
          Book another
        </Button>
      </div>
    </div>
  )
}
