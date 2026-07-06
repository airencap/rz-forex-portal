import { activeTheme } from '../../theme'

export function Footer() {
  return (
    <footer className="border-t border-gray-200 bg-white px-6 py-3 text-center text-xs text-gray-400">
      {activeTheme.companyLine}
    </footer>
  )
}
