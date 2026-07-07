import { Card } from '../../components/ui/Card'
import { useTheme } from '../../store/theme'
import { THEMES, type ThemeId } from '../../theme'

/**
 * White-label demo: switching the skin re-brands the entire portal at
 * runtime — logo, product name, colors, footer — from one theme object.
 */
export function SettingsPage() {
  const { themeId, setTheme } = useTheme()

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <h1 className="text-xl font-bold text-brand">Settings</h1>

      <Card title="Portal branding (white-label demo)">
        <p className="mb-4 text-sm text-gray-500">
          The entire portal is skinned from a single theme object — logo, product name, colors and
          the licence footer. Onboarding a white-label partner is a config swap, not a code change.
        </p>
        <div className="grid gap-3 sm:grid-cols-2" role="radiogroup" aria-label="Portal theme">
          {(Object.keys(THEMES) as ThemeId[]).map((id) => {
            const t = THEMES[id]
            const active = themeId === id
            return (
              <button
                key={id}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => setTheme(id)}
                className={`rounded-lg border-2 p-4 text-left transition-colors ${
                  active ? 'border-accent bg-accent-soft' : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span
                    className="flex h-9 w-9 items-center justify-center rounded-md text-sm font-bold text-white"
                    style={{ background: t.colors.accent }}
                  >
                    {t.logoMark}
                  </span>
                  <div>
                    <p className="font-bold text-brand">{t.productName}</p>
                    <p className="text-xs text-gray-400">{id === 'rz-forex' ? 'House brand' : 'Sample partner skin'}</p>
                  </div>
                </div>
                <div className="mt-3 flex gap-1.5" aria-hidden>
                  {[t.colors.brand, t.colors.accent, t.colors.surface].map((c) => (
                    <span key={c} className="h-5 w-8 rounded border border-black/10" style={{ background: c }} />
                  ))}
                </div>
              </button>
            )
          })}
        </div>
        <p className="mt-4 text-xs text-gray-400">
          Both skins operate under AW Fintech Pty Ltd · ACN 125 839 572 · AFSL 443886.
        </p>
      </Card>
    </div>
  )
}
