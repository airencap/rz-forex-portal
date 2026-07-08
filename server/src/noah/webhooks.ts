import { createVerify } from 'node:crypto'

/**
 * Noah webhook receipt: deliveries are signed with ECDSA/SHA-384 over the
 * raw body; the base64 signature arrives in the `Webhook-Signature` header
 * and verifies against Noah's published environment public key.
 */

const SANDBOX_PUBLIC_KEY = `-----BEGIN PUBLIC KEY-----
MHYwEAYHKoZIzj0CAQYFK4EEACIDYgAEm8yBiD+kmVJ1Xc9sfRkDx0yo9+u8yiAD
PngI20KoEswz0gflp8o/z66Abqz/m9A1CBecixWdeT72pA8NZBJI6L6Osd8RV+yx
QArxeGKEVX/2QNrfPqeAKODHT5LdStGT
-----END PUBLIC KEY-----`

function publicKey(): string {
  return process.env.NOAH_WEBHOOK_PUBLIC_KEY ?? SANDBOX_PUBLIC_KEY
}

export function verifyWebhookSignature(rawBody: string, signatureBase64: string): boolean {
  try {
    const verifier = createVerify('SHA384')
    verifier.update(rawBody)
    return verifier.verify(publicKey(), Buffer.from(signatureBase64, 'base64'))
  } catch {
    return false
  }
}

// --- event store (in-memory ring; Postgres when persistence lands) ---

export type NoahTransactionStatus = 'Pending' | 'Settled' | 'Failed'

export interface NoahWebhookEvent {
  receivedAt: string
  verified: boolean
  eventType: string
  occurred?: string
  transactionId?: string
  externalId?: string
  status?: NoahTransactionStatus
  data: unknown
}

const MAX_EVENTS = 200
const events: NoahWebhookEvent[] = []

export function recordEvent(envelope: {
  EventType?: string
  Occurred?: string
  Data?: { ID?: string; ExternalID?: string; Status?: string }
}, verified: boolean): NoahWebhookEvent {
  const event: NoahWebhookEvent = {
    receivedAt: new Date().toISOString(),
    verified,
    eventType: envelope.EventType ?? 'Unknown',
    occurred: envelope.Occurred,
    transactionId: envelope.Data?.ID,
    externalId: envelope.Data?.ExternalID,
    status: envelope.Data?.Status as NoahTransactionStatus | undefined,
    data: envelope.Data,
  }
  events.push(event)
  if (events.length > MAX_EVENTS) events.shift()
  return event
}

export function eventsForTransaction(transactionId: string): NoahWebhookEvent[] {
  return events.filter((e) => e.transactionId === transactionId)
}

export function recentEvents(limit = 50): NoahWebhookEvent[] {
  return events.slice(-limit).reverse()
}
