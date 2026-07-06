import { createContext, useContext, type ReactNode } from 'react'
import type { Services } from './types'
import { createMockServices } from './mock'

/**
 * Components get services via this context — swapping the mock layer for a
 * Banking Circle-backed implementation is a one-line change here.
 */
const ServicesContext = createContext<Services | null>(null)

export function ServicesProvider({ children }: { children: ReactNode }) {
  return <ServicesContext.Provider value={createMockServices()}>{children}</ServicesContext.Provider>
}

export function useServices(): Services {
  const ctx = useContext(ServicesContext)
  if (!ctx) throw new Error('useServices must be used within ServicesProvider')
  return ctx
}
