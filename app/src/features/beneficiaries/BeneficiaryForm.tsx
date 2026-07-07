import { useState, type FormEvent } from 'react'
import { Button } from '../../components/ui/Button'
import { TextField } from '../../components/ui/Field'
import {
  BANK_FIELD_LABELS,
  validateBeneficiary,
  type Beneficiary,
  type BeneficiaryDraft,
  type BeneficiaryFieldErrors,
  type Currency,
} from '../../domain'

const EMPTY: BeneficiaryDraft = { name: '', country: '', bankName: '', accountNumber: '', routingCode: '' }

/**
 * Shared create/edit form with per-currency validation. Errors show after a
 * field is touched (or on submit), so pristine forms aren't a wall of red.
 */
export function BeneficiaryForm({
  currency,
  initial,
  submitLabel,
  busy,
  serverError,
  onSubmit,
  onCancel,
}: {
  currency: Currency
  initial?: Beneficiary
  submitLabel: string
  busy: boolean
  serverError: string | null
  onSubmit: (draft: BeneficiaryDraft) => void
  onCancel: () => void
}) {
  const [draft, setDraft] = useState<BeneficiaryDraft>(
    initial
      ? {
          name: initial.name,
          country: initial.country,
          bankName: initial.bankName,
          accountNumber: initial.accountNumber,
          routingCode: initial.routingCode,
        }
      : EMPTY,
  )
  const [touched, setTouched] = useState<Partial<Record<keyof BeneficiaryDraft, boolean>>>({})
  const [submitted, setSubmitted] = useState(false)

  const errors: BeneficiaryFieldErrors = validateBeneficiary(currency, draft)
  const visibleError = (field: keyof BeneficiaryDraft) =>
    submitted || touched[field] ? errors[field] : undefined

  const set = (field: keyof BeneficiaryDraft) => (e: { target: { value: string } }) =>
    setDraft((d) => ({ ...d, [field]: e.target.value }))
  const touch = (field: keyof BeneficiaryDraft) => () => setTouched((t) => ({ ...t, [field]: true }))

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setSubmitted(true)
    if (Object.keys(errors).length === 0) onSubmit(draft)
  }

  const labels = BANK_FIELD_LABELS[currency]

  const field = (
    key: keyof BeneficiaryDraft,
    label: string,
    hint?: string,
  ) => (
    <div>
      <TextField
        label={label}
        value={draft[key]}
        onChange={set(key)}
        onBlur={touch(key)}
        aria-invalid={!!visibleError(key)}
        hint={visibleError(key) ? undefined : hint}
      />
      {visibleError(key) && <p className="mt-1 text-xs text-red-600">{visibleError(key)}</p>}
    </div>
  )

  return (
    <form onSubmit={handleSubmit} className="space-y-3" noValidate>
      {field('name', 'Beneficiary name')}
      <div className="grid grid-cols-2 gap-3">
        {field('country', 'Country')}
        {field('bankName', 'Bank name')}
      </div>
      <div className="grid grid-cols-2 gap-3">
        {field('accountNumber', `${labels.account} (${currency})`)}
        {field('routingCode', labels.routing)}
      </div>
      {serverError && <p className="text-sm text-red-600">{serverError}</p>}
      <div className="flex gap-2">
        <Button type="submit" disabled={busy}>
          {busy ? 'Saving…' : submitLabel}
        </Button>
        <Button variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  )
}
