export const CURRENCIES = ['AUD', 'NPR', 'JPY', 'USD', 'LKR', 'EUR', 'GBP'] as const
export type Currency = (typeof CURRENCIES)[number]

/** Minor-unit exponent per ISO 4217 (JPY has no minor unit). */
export const MINOR_EXPONENT: Record<Currency, number> = {
  AUD: 2,
  NPR: 2,
  JPY: 0,
  USD: 2,
  LKR: 2,
  EUR: 2,
  GBP: 2,
}

export const CURRENCY_NAMES: Record<Currency, string> = {
  AUD: 'Australian Dollar',
  NPR: 'Nepalese Rupee',
  JPY: 'Japanese Yen',
  USD: 'US Dollar',
  LKR: 'Sri Lankan Rupee',
  EUR: 'Euro',
  GBP: 'British Pound',
}

export const CURRENCY_FLAGS: Record<Currency, string> = {
  AUD: '🇦🇺',
  NPR: '🇳🇵',
  JPY: '🇯🇵',
  USD: '🇺🇸',
  LKR: '🇱🇰',
  EUR: '🇪🇺',
  GBP: '🇬🇧',
}

export interface CurrencyPair {
  sell: Currency
  buy: Currency
}

export function pairKey(pair: CurrencyPair): string {
  return `${pair.sell}/${pair.buy}`
}

/** Currencies we can pay out to beneficiaries. */
export const PAYOUT_CURRENCIES: Currency[] = ['NPR', 'JPY', 'USD', 'LKR', 'EUR', 'GBP', 'AUD']

/**
 * Historic AUD-out corridors — still used for client "frequent pairs" on the
 * dashboard. Funding is account-agnostic: any virtual-account currency can
 * fund a payment to any payout currency.
 */
export const CORRIDORS: CurrencyPair[] = (['NPR', 'JPY', 'USD', 'LKR', 'EUR', 'GBP'] as const).map(
  (buy) => ({ sell: 'AUD', buy }),
)
