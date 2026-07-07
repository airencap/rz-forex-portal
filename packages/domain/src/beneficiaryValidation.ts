import type { Currency } from './currency'

export interface BeneficiaryDraft {
  name: string
  country: string
  bankName: string
  accountNumber: string
  routingCode: string
}

export type BeneficiaryFieldErrors = Partial<Record<keyof BeneficiaryDraft, string>>

/** ISO 13616 mod-97 IBAN check (incremental to avoid bigint). */
export function isValidIban(input: string): boolean {
  const iban = input.replace(/\s/g, '').toUpperCase()
  if (!/^[A-Z]{2}\d{2}[A-Z0-9]{11,30}$/.test(iban)) return false
  const rearranged = iban.slice(4) + iban.slice(0, 4)
  let remainder = 0
  for (const ch of rearranged) {
    const val = ch >= 'A' ? String(ch.charCodeAt(0) - 55) : ch
    for (const digit of val) remainder = (remainder * 10 + Number(digit)) % 97
  }
  return remainder === 1
}

const digits = (min: number, max: number) => new RegExp(`^\\d{${min},${max}}$`)

interface Rule {
  test: (v: string) => boolean
  message: string
}

/** Per-currency required formats for account + routing fields. */
const CURRENCY_RULES: Record<Currency, { account: Rule; routing: Rule; routingRequired: boolean }> = {
  AUD: {
    account: { test: (v) => digits(6, 9).test(v), message: 'Account number must be 6–9 digits' },
    routing: { test: (v) => /^\d{3}-?\d{3}$/.test(v), message: 'BSB must be 6 digits (e.g. 062-000)' },
    routingRequired: true,
  },
  NPR: {
    account: { test: (v) => digits(8, 17).test(v), message: 'Account number must be 8–17 digits' },
    routing: { test: (v) => v.trim().length >= 3, message: 'Bank & branch code is required' },
    routingRequired: true,
  },
  JPY: {
    account: { test: (v) => digits(7, 7).test(v), message: 'Zengin account number must be exactly 7 digits' },
    routing: {
      test: (v) => /^\d{4}-\d{3}$/.test(v),
      message: 'Zengin code must be bank-branch, e.g. 0005-231',
    },
    routingRequired: true,
  },
  USD: {
    account: { test: (v) => digits(4, 17).test(v), message: 'Account number must be 4–17 digits' },
    routing: {
      test: (v) => /^\d{9}$/.test(v) || /^[A-Z0-9]{8}([A-Z0-9]{3})?$/i.test(v),
      message: 'Enter a 9-digit ABA routing number or an 8/11-character SWIFT code',
    },
    routingRequired: true,
  },
  LKR: {
    account: { test: (v) => digits(6, 16).test(v), message: 'Account number must be 6–16 digits' },
    routing: { test: (v) => v.trim().length >= 3, message: 'Bank & branch code is required' },
    routingRequired: true,
  },
  EUR: {
    account: { test: isValidIban, message: 'Enter a valid IBAN (checksum failed)' },
    routing: {
      test: (v) => /^[A-Z]{6}[A-Z0-9]{2}([A-Z0-9]{3})?$/i.test(v),
      message: 'BIC must be 8 or 11 characters, e.g. COBADEFFXXX',
    },
    routingRequired: true,
  },
  GBP: {
    account: { test: (v) => digits(8, 8).test(v), message: 'Account number must be exactly 8 digits' },
    routing: {
      test: (v) => /^\d{2}-?\d{2}-?\d{2}$/.test(v),
      message: 'Sort code must be 6 digits, e.g. 20-00-00',
    },
    routingRequired: true,
  },
}

export function validateBeneficiary(currency: Currency, draft: BeneficiaryDraft): BeneficiaryFieldErrors {
  const errors: BeneficiaryFieldErrors = {}
  if (draft.name.trim().length < 2) errors.name = 'Beneficiary name is required'
  if (draft.country.trim().length < 2) errors.country = 'Country is required'
  if (draft.bankName.trim().length < 2) errors.bankName = 'Bank name is required'

  const rules = CURRENCY_RULES[currency]
  const account = draft.accountNumber.trim()
  const routing = draft.routingCode.trim()

  if (!account) errors.accountNumber = 'Required'
  else if (!rules.account.test(account)) errors.accountNumber = rules.account.message

  if (!routing && rules.routingRequired) errors.routingCode = 'Required'
  else if (routing && !rules.routing.test(routing)) errors.routingCode = rules.routing.message

  return errors
}
