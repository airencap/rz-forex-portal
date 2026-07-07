/**
 * White-label theme. All brand tokens live here — a partner skin is a
 * different Theme object passed to applyTheme(), never a code change.
 */
export interface Theme {
  productName: string
  companyLine: string
  logoMark: string // short text mark rendered in the sidebar
  colors: {
    brand: string
    brandSoft: string
    accent: string
    accentSoft: string
    surface: string
  }
  fontFamily: string
}

export const rzForexTheme: Theme = {
  productName: 'RZ Forex',
  companyLine: 'AW Fintech Pty Ltd · ACN 125 839 572 · AFSL 443886',
  logoMark: 'RZ',
  colors: {
    brand: '#0B1D3A',
    brandSoft: '#16305C',
    accent: '#00B4D8',
    accentSoft: '#E0F7FC',
    surface: '#F0F6FA',
  },
  fontFamily: 'Arial, Helvetica, system-ui, sans-serif',
}

/**
 * Sample partner skin proving the white-label model: same portal, different
 * product identity, still operated under AW Fintech's licence.
 */
export const novaPayTheme: Theme = {
  productName: 'NovaPay FX',
  companyLine: 'NovaPay FX is a product of AW Fintech Pty Ltd · ACN 125 839 572 · AFSL 443886',
  logoMark: 'N▲',
  colors: {
    brand: '#2E1065',
    brandSoft: '#4C1D95',
    accent: '#F59E0B',
    accentSoft: '#FEF3C7',
    surface: '#FAF7F2',
  },
  fontFamily: 'Arial, Helvetica, system-ui, sans-serif',
}

export type ThemeId = 'rz-forex' | 'novapay'

export const THEMES: Record<ThemeId, Theme> = {
  'rz-forex': rzForexTheme,
  novapay: novaPayTheme,
}

export function applyTheme(theme: Theme): void {
  const root = document.documentElement.style
  root.setProperty('--rz-brand', theme.colors.brand)
  root.setProperty('--rz-brand-soft', theme.colors.brandSoft)
  root.setProperty('--rz-accent', theme.colors.accent)
  root.setProperty('--rz-accent-soft', theme.colors.accentSoft)
  root.setProperty('--rz-surface', theme.colors.surface)
  root.setProperty('--rz-font', theme.fontFamily)
  document.title = `${theme.productName} — Client Portal`
}
