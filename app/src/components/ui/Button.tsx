import type { ButtonHTMLAttributes } from 'react'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'

const styles: Record<Variant, string> = {
  primary:
    'bg-accent text-white hover:brightness-110 disabled:bg-gray-300 disabled:text-gray-500',
  secondary:
    'bg-white text-brand border border-gray-300 hover:border-accent hover:text-accent disabled:text-gray-400',
  ghost: 'bg-transparent text-brand hover:bg-black/5 disabled:text-gray-400',
  danger: 'bg-red-600 text-white hover:bg-red-700 disabled:bg-gray-300',
}

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
}

export function Button({ variant = 'primary', className = '', type = 'button', ...rest }: Props) {
  return (
    <button
      type={type}
      className={`rounded-md px-4 py-2 text-sm font-bold transition-colors disabled:cursor-not-allowed ${styles[variant]} ${className}`}
      {...rest}
    />
  )
}
