import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Button } from '../../components/ui/Button'
import { SkeletonRows } from '../../components/ui/Skeleton'
import { type BeneficiaryDraft, type Currency } from '@rz/domain'
import { useServices } from '../../services'
import { BeneficiaryForm } from '../beneficiaries/BeneficiaryForm'

export function BeneficiaryPicker({
  clientId,
  currency,
  selectedId,
  onSelect,
}: {
  clientId: string
  currency: Currency
  selectedId: string | null
  onSelect: (id: string) => void
}) {
  const services = useServices()
  const queryClient = useQueryClient()
  const [creating, setCreating] = useState(false)

  const { data: beneficiaries, isPending } = useQuery({
    queryKey: ['beneficiaries', clientId, currency],
    queryFn: () => services.beneficiaries.list(clientId, currency),
  })

  const createMutation = useMutation({
    mutationFn: (draft: BeneficiaryDraft) =>
      services.beneficiaries.create({ clientId, currency, ...draft }),
    onSuccess: (bene) => {
      queryClient.invalidateQueries({ queryKey: ['beneficiaries', clientId] })
      onSelect(bene.id)
      setCreating(false)
    },
  })

  if (isPending) return <SkeletonRows rows={2} />

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-bold text-brand">Pay to</h3>

      {(beneficiaries ?? []).length === 0 && !creating && (
        <p className="text-sm text-gray-500">No {currency} beneficiaries yet — add one below.</p>
      )}

      <div className="space-y-2" role="radiogroup" aria-label="Beneficiary">
        {(beneficiaries ?? []).map((b) => (
          <button
            key={b.id}
            type="button"
            role="radio"
            aria-checked={selectedId === b.id}
            onClick={() => onSelect(b.id)}
            className={`flex w-full items-center justify-between rounded-md border px-3 py-2.5 text-left text-sm transition-colors ${
              selectedId === b.id ? 'border-accent bg-accent-soft' : 'border-gray-200 bg-white hover:border-gray-300'
            }`}
          >
            <span>
              <span className="font-bold text-brand">{b.name}</span>
              <span className="ml-2 text-xs text-gray-500">
                {b.bankName} · {b.accountNumber.length > 10 ? `…${b.accountNumber.slice(-6)}` : b.accountNumber}
              </span>
            </span>
            {b.verified ? (
              <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold uppercase text-emerald-700">
                Verified
              </span>
            ) : (
              <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-bold uppercase text-gray-500">
                Unverified
              </span>
            )}
          </button>
        ))}
      </div>

      {creating ? (
        <div className="rounded-md border border-gray-200 bg-surface p-4">
          <p className="mb-3 text-xs font-bold uppercase tracking-wide text-gray-500">
            New {currency} beneficiary
          </p>
          <BeneficiaryForm
            currency={currency}
            submitLabel="Save beneficiary"
            busy={createMutation.isPending}
            serverError={createMutation.isError ? (createMutation.error as Error).message : null}
            onSubmit={(draft) => createMutation.mutate(draft)}
            onCancel={() => {
              createMutation.reset()
              setCreating(false)
            }}
          />
        </div>
      ) : (
        <Button variant="secondary" onClick={() => setCreating(true)}>
          + New beneficiary
        </Button>
      )}
    </div>
  )
}
