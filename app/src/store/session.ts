import { create } from 'zustand'

export type Role = 'client_user' | 'client_admin' | 'ops_user'

export const ROLE_LABELS: Record<Role, string> = {
  client_user: 'Client user',
  client_admin: 'Client admin',
  ops_user: 'Ops (AW Fintech)',
}

interface SessionState {
  userName: string | null
  role: Role | null
  clientId: string | null
  login(userName: string, role: Role, clientId: string): void
  switchClient(clientId: string): void
  logout(): void
}

/** Mock auth session (prototype only — real auth is out of scope). */
export const useSession = create<SessionState>((set) => ({
  userName: null,
  role: null,
  clientId: null,
  login: (userName, role, clientId) => set({ userName, role, clientId }),
  switchClient: (clientId) => set({ clientId }),
  logout: () => set({ userName: null, role: null, clientId: null }),
}))
