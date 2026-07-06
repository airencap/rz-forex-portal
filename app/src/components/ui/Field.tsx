import { useId, type InputHTMLAttributes, type SelectHTMLAttributes } from 'react'

const inputClass =
  'w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-accent'

export function TextField({
  label,
  hint,
  ...rest
}: { label: string; hint?: string } & InputHTMLAttributes<HTMLInputElement>) {
  const id = useId()
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-xs font-bold text-gray-600">
        {label}
      </label>
      <input id={id} className={inputClass} {...rest} />
      {hint && <p className="mt-1 text-xs text-gray-400">{hint}</p>}
    </div>
  )
}

export function SelectField({
  label,
  children,
  ...rest
}: { label: string } & SelectHTMLAttributes<HTMLSelectElement>) {
  const id = useId()
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-xs font-bold text-gray-600">
        {label}
      </label>
      <select id={id} className={inputClass} {...rest}>
        {children}
      </select>
    </div>
  )
}
