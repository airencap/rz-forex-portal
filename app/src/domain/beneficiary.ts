import type { Currency } from './currency'

export interface Beneficiary {
  id: string
  clientId: string
  name: string
  currency: Currency
  country: string
  bankName: string
  /** Account number / IBAN / zengin account depending on currency. */
  accountNumber: string
  /** Branch / BSB / ABA / SWIFT — labelled per currency in the UI. */
  routingCode: string
  verified: boolean
  createdAt: string
}

/** Per-currency labels for the two bank-detail fields (full schemas arrive in Phase 2). */
export const BANK_FIELD_LABELS: Record<Currency, { account: string; routing: string }> = {
  AUD: { account: 'Account number', routing: 'BSB' },
  NPR: { account: 'Account number', routing: 'Bank & branch code' },
  JPY: { account: 'Account number (zengin)', routing: 'Bank & branch code' },
  USD: { account: 'Account number', routing: 'ABA / SWIFT' },
  LKR: { account: 'Account number', routing: 'Bank & branch code' },
  EUR: { account: 'IBAN', routing: 'BIC / SWIFT' },
  GBP: { account: 'Account number', routing: 'Sort code' },
}
