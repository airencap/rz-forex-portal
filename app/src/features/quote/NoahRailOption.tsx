import { useMutation, useQuery } from '@tanstack/react-query'
import { useEffect } from 'react'
import { formatMoney, toMajor, type Quote } from '@rz/domain'
import { railsRequest } from '../../lib/railsApi'
import { useServices } from '../../services'

export interface NoahPrepared {
  formSessionId: string
  cryptoAuthorizedAmount?: string
  totalFeeUsd?: string
  channel?: { id: string; fee?: { Fixed?: string; Percentage?: string }; category?: string }
}

/**
 * Optional Noah-rail execution for USD payouts (sandbox evaluation).
 * Prepares a locked Noah quote against the selected beneficiary; the actual
 * sell executes at booking time in QuotePage.
 */
export function NoahRailOption({
  quote,
  clientId,
  beneficiaryId,
  enabled,
  onToggle,
  onPrepared,
}: {
  quote: Quote
  clientId: string
  beneficiaryId: string | null
  enabled: boolean
  onToggle: (on: boolean) => void
  onPrepared: (prepared: NoahPrepared | null) => void
}) {
  const services = useServices()

  const { data: beneficiaries } = useQuery({
    queryKey: ['beneficiaries', clientId, quote.pair.buy],
    queryFn: () => services.beneficiaries.list(clientId, quote.pair.buy),
  })
  const beneficiary = (beneficiaries ?? []).find((b) => b.id === beneficiaryId) ?? null

  const prepareMutation = useMutation({
    mutationFn: () =>
      railsRequest<NoahPrepared>('/api/noah/payouts/prepare', {
        method: 'POST',
        body: JSON.stringify({
          fiatAmount: toMajor(quote.buyAmount).toFixed(2),
          beneficiary: {
            name: beneficiary!.name,
            accountNumber: beneficiary!.accountNumber,
            routingCode: beneficiary!.routingCode,
          },
          reference: quote.id,
        }),
      }),
    onSuccess: (prepared) => onPrepared(prepared),
    onError: () => onPrepared(null),
  })

  // re-prepare when the quote or beneficiary changes while enabled
  useEffect(() => {
    onPrepared(null)
    prepareMutation.reset()
    if (enabled && beneficiary) prepareMutation.mutate()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, quote.id, beneficiaryId])

  if (quote.kind !== 'spot' || quote.pair.buy !== 'USD') return null

  const prepared = prepareMutation.data

  return (
    <div className="mt-4 rounded-md border border-gray-200 bg-surface p-4">
      <label className="flex items-start gap-2 text-sm">
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) => onToggle(e.target.checked)}
          className="mt-0.5 h-4 w-4 accent-(--rz-accent)"
        />
        <span>
          <span className="font-bold text-brand">Execute payout via Noah rail</span>
          <span className="ml-1.5 rounded bg-indigo-50 px-1.5 py-0.5 text-[10px] font-bold uppercase text-indigo-600">
            sandbox test
          </span>
          <span className="block text-xs text-gray-500">
            USD local clearing on Noah's sell rail (USDC-settled). Booking will execute a real
            sandbox transaction.
          </span>
        </span>
      </label>

      {enabled && !beneficiary && (
        <p className="mt-2 text-xs text-amber-600">Select a beneficiary to prepare the Noah quote.</p>
      )}
      {enabled && prepareMutation.isPending && (
        <p className="mt-2 text-xs text-gray-500">Preparing Noah quote…</p>
      )}
      {enabled && prepareMutation.isError && (
        <p className="mt-2 text-xs text-red-600">{(prepareMutation.error as Error).message}</p>
      )}
      {enabled && prepared && (
        <dl className="mt-3 space-y-1 border-t border-gray-200 pt-2 text-xs">
          <div className="flex justify-between">
            <dt className="text-gray-500">Beneficiary receives</dt>
            <dd className="font-bold tabular-nums">{formatMoney(quote.buyAmount)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-gray-500">Noah channel fee (all-in)</dt>
            <dd className="tabular-nums">{prepared.totalFeeUsd ?? '—'} USD</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-gray-500">USDC required (authorized)</dt>
            <dd className="tabular-nums">{prepared.cryptoAuthorizedAmount ?? '—'} USDC</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-gray-500">Channel</dt>
            <dd className="tabular-nums">
              {prepared.channel?.category ?? 'Bank'} · fixed {prepared.channel?.fee?.Fixed ?? '0'} +{' '}
              {prepared.channel?.fee?.Percentage ?? '0'}%
            </dd>
          </div>
        </dl>
      )}
    </div>
  )
}
