/**
 * Direct access to the RZ API's rail endpoints (ops tooling + rail-routed
 * payouts). Separate from the Services contract: rails are vendor plumbing,
 * not client-surface abstraction.
 */
export const RAILS_API =
  (import.meta.env.VITE_API_URL as string | undefined) ??
  (import.meta.env.DEV ? 'http://localhost:4000' : 'https://rz-forex-api.onrender.com')

export async function railsRequest<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response
  try {
    res = await fetch(`${RAILS_API}${path}`, {
      headers: { 'Content-Type': 'application/json' },
      ...init,
    })
  } catch {
    throw new Error('Cannot reach the RZ API — rail features need the API server')
  }
  const body = (await res.json().catch(() => null)) as { error?: string } | null
  if (!res.ok) throw new Error(body?.error ?? `RZ API responded ${res.status}`)
  return body as T
}
