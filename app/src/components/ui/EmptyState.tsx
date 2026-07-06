import type { ReactNode } from 'react'

export function EmptyState({ message, action }: { message: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-3 py-10 text-center">
      <div className="text-3xl" aria-hidden>
        🗂️
      </div>
      <p className="text-sm text-gray-500">{message}</p>
      {action}
    </div>
  )
}
