import { HAPPY_PATH, STATE_LABELS, type Payment, type PaymentState } from '@rz/domain'

function formatTs(iso: string): string {
  return new Date(iso).toLocaleString('en-AU', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

interface Step {
  key: string
  label: string
  sublabel?: string
  at?: string
  status: 'done' | 'current' | 'todo' | 'terminal-bad'
}

/**
 * Currencycloud-style tracker along the happy path, with the cosmetic
 * "screening passed" compliance step. Terminal failure states replace the
 * remainder of the path.
 */
function buildSteps(payment: Payment): Step[] {
  const at = (s: PaymentState) => payment.history.find((h) => h.state === s)?.at
  const terminalBad = (['failed', 'cancelled', 'returned'] as const).find((s) => payment.state === s)
  const reachedIdx = HAPPY_PATH.reduce((acc, s, i) => (at(s) ? i : acc), -1)

  const steps: Step[] = []
  HAPPY_PATH.forEach((state) => {
    const ts = at(state)
    steps.push({
      key: state,
      label: STATE_LABELS[state],
      at: ts,
      status:
        ts && payment.state === state && state !== 'settled' && !terminalBad
          ? 'current'
          : ts
            ? 'done'
            : 'todo',
    })
    // cosmetic sanctions-screening step directly after booking
    if (state === 'booked') {
      const bookedAt = at('booked')
      const passed = !!bookedAt && (reachedIdx > 0 || !terminalBad)
      steps.push({
        key: 'screening',
        label: 'Screening passed',
        sublabel: 'Sanctions & compliance checks',
        at: passed && bookedAt ? new Date(new Date(bookedAt).getTime() + 90_000).toISOString() : undefined,
        status: passed ? 'done' : 'todo',
      })
    }
  })

  if (terminalBad) {
    const doneSteps = steps.filter((s) => s.status !== 'todo')
    doneSteps.forEach((s) => (s.status = 'done'))
    doneSteps.push({
      key: terminalBad,
      label: STATE_LABELS[terminalBad],
      at: at(terminalBad),
      status: 'terminal-bad',
    })
    return doneSteps
  }
  return steps
}

export function PaymentTimeline({ payment }: { payment: Payment }) {
  const steps = buildSteps(payment)
  return (
    <ol className="relative ml-3 space-y-6 border-l-2 border-gray-200 pl-6">
      {steps.map((step) => (
        <li key={step.key} className="relative">
          <span
            aria-hidden
            className={`absolute -left-[31px] top-0.5 flex h-4 w-4 items-center justify-center rounded-full border-2 ${
              step.status === 'done'
                ? 'border-emerald-500 bg-emerald-500'
                : step.status === 'current'
                  ? 'border-accent bg-white ring-4 ring-accent/20'
                  : step.status === 'terminal-bad'
                    ? 'border-red-500 bg-red-500'
                    : 'border-gray-300 bg-white'
            }`}
          />
          <p
            className={`text-sm font-bold ${
              step.status === 'todo'
                ? 'text-gray-400'
                : step.status === 'terminal-bad'
                  ? 'text-red-600'
                  : 'text-brand'
            }`}
          >
            {step.label}
            {step.status === 'current' && (
              <span className="ml-2 rounded-full bg-accent-soft px-2 py-0.5 text-[10px] uppercase text-brand">
                current
              </span>
            )}
          </p>
          {step.sublabel && <p className="text-xs text-gray-400">{step.sublabel}</p>}
          {step.at && <p className="text-xs text-gray-500 tabular-nums">{formatTs(step.at)}</p>}
        </li>
      ))}
    </ol>
  )
}
