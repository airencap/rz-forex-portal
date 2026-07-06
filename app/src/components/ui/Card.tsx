import type { ReactNode } from 'react'

export function Card({
  title,
  action,
  children,
  className = '',
}: {
  title?: string
  action?: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <section className={`rounded-lg bg-white shadow-sm border border-gray-200 ${className}`}>
      {(title || action) && (
        <header className="flex items-center justify-between border-b border-gray-100 px-5 py-3">
          {title && <h2 className="text-sm font-bold uppercase tracking-wide text-brand">{title}</h2>}
          {action}
        </header>
      )}
      <div className="p-5">{children}</div>
    </section>
  )
}
