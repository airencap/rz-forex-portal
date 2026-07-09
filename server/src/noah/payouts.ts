import { randomUUID } from 'node:crypto'
import { noah, noahRequest } from './client'

/**
 * USD payout via Noah's sell rail (sandbox): pick a US local-clearing
 * channel, map our beneficiary onto the channel's form schema, prepare a
 * locked quote (DelayedSell defers the balance check), then execute.
 */

interface NoahChannel {
  ID: string
  Country: string
  FiatCurrency: string
  FeeConfig?: { Fixed?: string; Percentage?: string }
  Limits?: { MinLimit?: string; MaxLimit?: string }
  PaymentMethodCategory?: string
}

export interface PayoutBeneficiary {
  name: string
  accountNumber: string
  /** 9-digit ABA routing number for USD. */
  routingCode: string
}

export interface PreparePayoutRequest {
  fiatAmount: string
  beneficiary: PayoutBeneficiary
  reference: string
}

let channelCache: { at: number; channels: NoahChannel[] } | null = null

async function usdChannels(): Promise<NoahChannel[]> {
  if (channelCache && Date.now() - channelCache.at < 300_000) return channelCache.channels
  const res = await noahRequest<{ Items: NoahChannel[] }>(
    '/channels/sell?FiatCurrency=USD&CryptoCurrency=USDC_TEST',
  )
  channelCache = { at: Date.now(), channels: res.Items }
  return res.Items
}

/** US local channels whose limits fit the amount, cheapest first. */
function usableChannels(channels: NoahChannel[], amount: number): NoahChannel[] {
  const usable = channels.filter((c) => {
    const min = Number(c.Limits?.MinLimit ?? 0)
    const max = Number(c.Limits?.MaxLimit ?? Infinity)
    return c.Country === 'US' && amount >= min && amount <= max
  })
  const cost = (c: NoahChannel) =>
    Number(c.FeeConfig?.Fixed ?? 0) + (amount * Number(c.FeeConfig?.Percentage ?? 0)) / 100
  return usable.sort((a, b) => cost(a) - cost(b))
}

interface PrepareResponse {
  TotalFee?: string
  Rate?: string
  CryptoAmountEstimate?: string
  CryptoAuthorizedAmount?: string
  FormSessionID?: string
  NextStep?: unknown
}

export async function preparePayout(req: PreparePayoutRequest) {
  if (!/^\d{9}$/.test(req.beneficiary.routingCode.trim()))
    throw new Error('Noah USD payouts need a 9-digit ABA routing number on the beneficiary')
  const amount = Number(req.fiatAmount)
  if (!Number.isFinite(amount) || amount <= 0) throw new Error('Invalid amount')

  const candidates = usableChannels(await usdChannels(), amount)
  if (candidates.length === 0) throw new Error('No Noah USD channel accepts this amount')

  // field names discovered against the live sandbox (the published FormSchema
  // says BankCode / PascalCase address, but validation wants these):
  const buildBody = (channel: NoahChannel) => ({
    ChannelID: channel.ID,
    CryptoCurrency: 'USDC_TEST',
    FiatAmount: req.fiatAmount,
    // fixed quotes (Quoted: true) are not enabled for this sandbox profile;
    // rate is indicative at prepare and finalizes at execution.
    // DelayedSell defers the balance check until the sell request.
    DelayedSell: true,
    Form: {
      AccountHolderName: { AccountHolderType: 'Business', Name: req.beneficiary.name.slice(0, 50) },
      // prototype: sandbox placeholder address (beneficiary model has no street address yet)
      AccountHolderAddress: {
        line1: '100 Market Street',
        city: 'San Francisco',
        state: 'CA',
        postalCode: '94105',
        countryCode: 'US',
      },
      BankDetails: {
        AccountNumber: req.beneficiary.accountNumber.trim(),
        RoutingNumber: req.beneficiary.routingCode.trim(),
        AccountType: 'Checking',
      },
      PaymentPurpose: 'Goods and services',
      Reference: req.reference.slice(0, 30),
    },
  })

  // some channels are policy-gated per profile (premium clearing tiers) —
  // walk the list cheapest-first and use the first the profile may access
  let lastError: Error | null = null
  for (const channel of candidates) {
    try {
      const res = await noahRequest<PrepareResponse>('/transactions/sell/prepare', {
        method: 'POST',
        body: JSON.stringify(buildBody(channel)),
      })
      if (res.NextStep)
        throw new Error('Noah requires additional form steps this prototype does not implement yet')
      if (!res.FormSessionID) throw new Error('Noah did not return a form session')
      return {
        formSessionId: res.FormSessionID,
        cryptoAuthorizedAmount: res.CryptoAuthorizedAmount ?? res.CryptoAmountEstimate,
        totalFeeUsd: res.TotalFee,
        rate: res.Rate,
        channel: {
          id: channel.ID,
          fee: channel.FeeConfig,
          category: channel.PaymentMethodCategory,
        },
      }
    } catch (err) {
      const message = (err as Error).message
      if (/channel policy denied/i.test(message)) {
        lastError = err as Error
        continue
      }
      throw err
    }
  }
  throw lastError ?? new Error('No accessible Noah USD channel for this profile')
}

export async function executePayout(req: {
  formSessionId: string
  cryptoAuthorizedAmount: string
  fiatAmount: string
  externalId: string
}) {
  // 202 SellResponse: { Transaction: { ID, Status, ... } }
  const res = await noahRequest<{
    Transaction?: { ID?: string; Status?: string }
    ID?: string
    TransactionID?: string
  }>('/transactions/sell', {
    method: 'POST',
    body: JSON.stringify({
      CryptoCurrency: 'USDC_TEST',
      CryptoAuthorizedAmount: req.cryptoAuthorizedAmount,
      FiatAmount: req.fiatAmount,
      FormSessionID: req.formSessionId,
      Nonce: randomUUID(),
      ExternalID: req.externalId,
    }),
  })
  const transactionId = res.Transaction?.ID ?? res.ID ?? res.TransactionID
  if (!transactionId) throw new Error('Noah did not return a transaction id')
  return { transactionId, status: res.Transaction?.Status }
}

export function getTransaction(id: string) {
  return noah.transaction(id)
}
