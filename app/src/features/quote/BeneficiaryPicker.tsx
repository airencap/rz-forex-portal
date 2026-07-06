import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState, type FormEvent } from 'react'
import { Button } from '../../components/ui/Button'
import { TextField } from '../../components/ui/Field'
import { SkeletonRows } from '../../components/ui/Skeleton'
import { BANK_FIELD_LABELS, type Currency } from '../../domain'
import { useServices } from '../../services'

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
  const [form, setForm] = useState({ name: '', country: '', bankName: '', accountNumber: '', routingCode: '' })

  const { data: beneficiaries, isPending } = useQuery({
    queryKey: ['beneficiaries', clientId, currency],
    queryFn: () => services.beneficiaries.list(clientId, currency),
  })

  const createMutation = useMutation({
    mutationFn: () => services.beneficiaries.create({ clientId, currency, ...form }),
    onSuccess: (bene) => {
      queryClient.invalidateQueries({ queryKey: ['beneficiaries', clientId] })
      onSelect(bene.id)
      setCreating(false)
      setForm({ name: '', country: '', bankName: '', accountNumber: '', routingCode: '' })
    },
  })

  function handleCreate(e: FormEvent) {
    e.preventDefault()
    createMutation.mutate()
  }

  const labels = BANK_FIELD_LABELS[currency]

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
        <form onSubmit={handleCreate} className="space-y-3 rounded-md border border-gray-200 bg-surface p-4">
          <p className="text-xs font-bold uppercase tracking-wide text-gray-500">New {currency} beneficiary</p>
          <TextField
            label="Beneficiary name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
          />
          <div className="grid grid-cols-2 gap-3">
            <TextField
              label="Country"
              value={form.country}
              onChange={(e) => setForm({ ...form, country: e.target.value })}
            />
            <TextField
              label="Bank name"
              value={form.bankName}
              onChange={(e) => setForm({ ...form, bankName: e.target.value })}
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <TextField
              label={labels.account}
              value={form.accountNumber}
              onChange={(e) => setForm({ ...form, accountNumber: e.target.value })}
              required
            />
            <TextField
              label={labels.routing}
              value={form.routingCode}
              onChange={(e) => setForm({ ...form, routingCode: e.target.value })}
            />
          </div>
          {createMutation.isError && (
            <p className="text-sm text-red-600">{(createMutation.error as Error).message}</p>
          )}
          <div className="flex gap-2">
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? 'Saving…' : 'Save beneficiary'}
            </Button>
            <Button variant="ghost" onClick={() => setCreating(false)}>
              Cancel
            </Button>
          </div>
        </form>
      ) : (
        <Button variant="secondary" onClick={() => setCreating(true)}>
          + New beneficiary
        </Button>
      )}
    </div>
  )
}
