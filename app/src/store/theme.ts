import { create } from 'zustand'
import { applyTheme, THEMES, type Theme, type ThemeId } from '../theme'

const STORAGE_KEY = 'rz-portal-theme'

function initialThemeId(): ThemeId {
  const stored = localStorage.getItem(STORAGE_KEY)
  return stored && stored in THEMES ? (stored as ThemeId) : 'rz-forex'
}

interface ThemeState {
  themeId: ThemeId
  theme: Theme
  setTheme(id: ThemeId): void
}

export const useTheme = create<ThemeState>((set) => ({
  themeId: initialThemeId(),
  theme: THEMES[initialThemeId()],
  setTheme: (id) => {
    localStorage.setItem(STORAGE_KEY, id)
    applyTheme(THEMES[id])
    set({ themeId: id, theme: THEMES[id] })
  },
}))
