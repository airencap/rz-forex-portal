import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { EmptyState } from '../../components/ui/EmptyState'
import { SkeletonRows } from '../../components/ui/Skeleton'
import {
  BANK_FIELD_LABELS,
  CORRIDORS,
  CURRENCY_FLAGS,
  type Beneficiary,
  type BeneficiaryDraft,
  type Currency,
} from '../../domain'
import { useServices } from '../../services'
import { useSession } from '../../store/session'
import { BeneficiaryForm } from './BeneficiaryForm'

type PanelState =
  | { mode: 'closed' }
  | { mode: 'create'; currency: Currency }
  | { mode: 'edit'; beneficiary: Beneficiary }

export function BeneficiariesPage() {
  const services = useServices()
  const queryClient = useQueryClient()
  const clientId = useSession((s) => s.clientId)!

  const [currencyFilter, setCurrencyFilter] = useState<Currency | 'all'>('all')
  const [panel, setPanel] = useState<PanelState>({ mode: 'closed' })
  const [createCurrency, setCreateCurrency] = useState<Currency>('NPR')

  const { data, isPending } = useQuery({
    queryKey: ['beneficiaries', clientId],
    queryFn: () => services.beneficiaries.list(clientId),
  })

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['beneficiaries', clientId] })

  const saveMutation = useMutation({
    mutationFn: (draft: BeneficiaryDraft) => {
      if (panel.mode === 'edit')
        return services.beneficiaries.update(panel.beneficiary.id, {
          clientId,
          currency: panel.beneficiary.currency,
          ...draft,
        })
      if (panel.mode === 'create')
        return services.beneficiaries.create({ clientId, currency: panel.currency, ...draft })
      throw new Error('No form open')
    },
    onSuccess: () => {
      invalidate()
      setPanel({ mode: 'closed' })
    },
  })

  const verifyMutation = useMutation({
    mutationFn: (id: string) => services.beneficiaries.verify(id),
    onSuccess: invalidate,
  })

  const filtered = (data ?? []).filter((b) => currencyFilter === 'all' || b.currency === currencyFilter)

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-brand">Beneficiaries</h1>
        <div className="flex items-center gap-2">
          <label htmlFor="new-bene-ccy" className="text-xs font-bold text-gray-500">
            Currency
          </label>
          <select
            id="new-bene-ccy"
            value={createCurrency}
            onChange={(e) => setCreateCurrency(e.target.value as Currency)}
            className="rounded-md border border-gray-300 bg-white px-2 py-1.5 text-sm"
          >
            {CORRIDORS.map(({ buy }) => (
              <option key={buy} value={buy}>
                {buy}
              </option>
            ))}
          </select>
          <Button onClick={() => setPanel({ mode: 'create', currency: createCurrency })}>
            + New beneficiary
          </Button>
        </div>
      </div>

      {panel.mode !== 'closed' && (
        <Card
          title={
            panel.mode === 'create'
              ? `New ${panel.currency} beneficiary`
              : `Edit ${panel.beneficiary.name}`
          }
        >
          <BeneficiaryForm
            key={panel.mode === 'edit' ? panel.beneficiary.id : `create-${panel.currency}`}
            currency={panel.mode === 'edit' ? panel.beneficiary.currency : panel.currency}
            initial={panel.mode === 'edit' ? panel.beneficiary : undefined}
            submitLabel={panel.mode === 'create' ? 'Add beneficiary' : 'Save changes'}
            busy={saveMutation.isPending}
            serverError={saveMutation.isError ? (saveMutation.error as Error).message : null}
            onSubmit={(draft) => saveMutation.mutate(draft)}
            onCancel={() => {
              saveMutation.reset()
              setPanel({ mode: 'closed' })
            }}
          />
          {panel.mode === 'edit' && (
            <p className="mt-3 text-xs text-amber-600">
              Changing bank details resets verification — the beneficiary will need re-verifying.
            </p>
          )}
        </Card>
      )}

      <Card>
        <div className="mb-4 flex gap-1.5" role="radiogroup" aria-label="Filter by currency">
          {(['all', ...CORRIDORS.map((c) => c.buy)] as const).map((c) => (
            <button
              key={c}
              type="button"
              role="radio"
              aria-checked={currencyFilter === c}
              onClick={() => setCurrencyFilter(c)}
              className={`rounded-full px-3 py-1 text-xs font-bold ${
                currencyFilter === c ? 'bg-brand text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
              }`}
            >
              {c === 'all' ? 'All' : c}
            </button>
          ))}
        </div>

        {isPending ? (
          <SkeletonRows rows={5} />
        ) : filtered.length === 0 ? (
          <EmptyState
            message={
              (data ?? []).length === 0
                ? 'No beneficiaries yet — add one to start making payments.'
                : `No ${currencyFilter} beneficiaries yet.`
            }
          />
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-gray-400">
                <th className="pb-2 font-bold">Name</th>
                <th className="pb-2 font-bold">Currency</th>
                <th className="pb-2 font-bold">Bank</th>
                <th className="pb-2 font-bold">Account</th>
                <th className="pb-2 font-bold">Routing</th>
                <th className="pb-2 font-bold">Status</th>
                <th className="pb-2 text-right font-bold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((b) => (
                <tr key={b.id} className="border-t border-gray-100 hover:bg-surface">
                  <td className="py-2.5 font-bold text-brand">
                    {b.name}
                    <span className="block text-xs font-normal text-gray-400">{b.country}</span>
                  </td>
                  <td className="py-2.5">
                    <span aria-hidden>{CURRENCY_FLAGS[b.currency]}</span> {b.currency}
                  </td>
                  <td className="py-2.5 text-gray-600">{b.bankName}</td>
                  <td className="py-2.5 tabular-nums text-gray-600" title={BANK_FIELD_LABELS[b.currency].account}>
                    {b.accountNumber.length > 12 ? `…${b.accountNumber.slice(-8)}` : b.accountNumber}
                  </td>
                  <td className="py-2.5 tabular-nums text-gray-600">{b.routingCode}</td>
                  <td className="py-2.5">
                    {b.verified ? (
                      <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold uppercase text-emerald-700">
                        Verified
                      </span>
                    ) : (
                      <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-bold uppercase text-gray-500">
                        Unverified
                      </span>
                    )}
                  </td>
                  <td className="py-2.5 text-right">
                    <div className="flex justify-end gap-1">
                      {!b.verified && (
                        <Button
                          variant="secondary"
                          className="!px-2 !py-1 !text-xs"
                          disabled={verifyMutation.isPending}
                          onClick={() => verifyMutation.mutate(b.id)}
                        >
                          Verify
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        className="!px-2 !py-1 !text-xs"
                        onClick={() => setPanel({ mode: 'edit', beneficiary: b })}
                      >
                        Edit
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  )
}
