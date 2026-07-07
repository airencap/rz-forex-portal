import { STATE_LABELS, type PaymentState } from '@rz/domain'

const colors: Record<PaymentState, string> = {
  draft: 'bg-gray-100 text-gray-600',
  quoted: 'bg-blue-50 text-blue-700',
  booked: 'bg-indigo-50 text-indigo-700',
  funds_pending: 'bg-amber-50 text-amber-700',
  in_flight: 'bg-cyan-50 text-cyan-700',
  settled: 'bg-emerald-50 text-emerald-700',
  failed: 'bg-red-50 text-red-700',
  cancelled: 'bg-gray-100 text-gray-500',
  returned: 'bg-orange-50 text-orange-700',
}

export function StatusChip({ state }: { state: PaymentState }) {
  return (
    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-bold ${colors[state]}`}>
      {STATE_LABELS[state]}
    </span>
  )
}
