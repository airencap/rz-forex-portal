import { useTheme } from '../../store/theme'

export function Footer() {
  const theme = useTheme((s) => s.theme)
  return (
    <footer className="border-t border-gray-200 bg-white px-6 py-3 text-center text-xs text-gray-400">
      {theme.companyLine}
    </footer>
  )
}
