import { createContext, useContext, type ReactNode } from 'react'
import type { Services } from '@rz/domain'
import { createMockServices } from '@rz/mock-services'
import { createHttpServices } from './http'

/**
 * Components get services via this context. Implementation is chosen once at
 * startup: set VITE_API_URL to talk to the RZ API server; leave it unset and
 * the portal runs fully in-browser on the mock layer (as on GitHub Pages).
 */
const apiUrl = import.meta.env.VITE_API_URL as string | undefined
const services: Services = apiUrl ? createHttpServices(apiUrl) : createMockServices()

if (apiUrl) console.info(`[services] using RZ API at ${apiUrl}`)

const ServicesContext = createContext<Services | null>(null)

export function ServicesProvider({ children }: { children: ReactNode }) {
  return <ServicesContext.Provider value={services}>{children}</ServicesContext.Provider>
}

export function useServices(): Services {
  const ctx = useContext(ServicesContext)
  if (!ctx) throw new Error('useServices must be used within ServicesProvider')
  return ctx
}
