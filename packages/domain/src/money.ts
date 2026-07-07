import { MINOR_EXPONENT, type Currency } from './currency'

/** Amounts are ALWAYS integers in minor units. Never floats for money. */
export interface Money {
  currency: Currency
  minor: number
}

export function money(currency: Currency, minor: number): Money {
  return { currency, minor: Math.round(minor) }
}

/** Convert a major-unit number (e.g. user input) to minor units. */
export function toMinor(currency: Currency, major: number): number {
  return Math.round(major * 10 ** MINOR_EXPONENT[currency])
}

export function toMajor(m: Money): number {
  return m.minor / 10 ** MINOR_EXPONENT[m.currency]
}

export function formatMoney(m: Money, opts?: { withCode?: boolean }): string {
  const exp = MINOR_EXPONENT[m.currency]
  const formatted = new Intl.NumberFormat('en-AU', {
    minimumFractionDigits: exp,
    maximumFractionDigits: exp,
  }).format(toMajor(m))
  return opts?.withCode === false ? formatted : `${formatted} ${m.currency}`
}

export function formatRate(rate: number): string {
  // rates display with enough precision for small-unit currencies
  return rate >= 10 ? rate.toFixed(3) : rate.toFixed(5)
}
