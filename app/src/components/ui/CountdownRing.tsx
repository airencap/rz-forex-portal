/**
 * Circular countdown for quote validity. Purely visual — expiry truth lives
 * on the quote's expiresAt; this just renders secondsLeft/total.
 */
export function CountdownRing({ secondsLeft, total }: { secondsLeft: number; total: number }) {
  const r = 20
  const circumference = 2 * Math.PI * r
  const fraction = Math.max(0, Math.min(1, secondsLeft / total))
  const urgent = secondsLeft <= 10
  return (
    <div className="relative h-12 w-12" role="timer" aria-label={`${secondsLeft} seconds remaining`}>
      <svg viewBox="0 0 48 48" className="h-12 w-12 -rotate-90">
        <circle cx="24" cy="24" r={r} fill="none" stroke="#e5e7eb" strokeWidth="4" />
        <circle
          cx="24"
          cy="24"
          r={r}
          fill="none"
          stroke={urgent ? '#dc2626' : 'var(--rz-accent)'}
          strokeWidth="4"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - fraction)}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 1s linear' }}
        />
      </svg>
      <span
        className={`absolute inset-0 flex items-center justify-center text-sm font-bold ${urgent ? 'text-red-600' : 'text-brand'}`}
      >
        {secondsLeft}
      </span>
    </div>
  )
}
