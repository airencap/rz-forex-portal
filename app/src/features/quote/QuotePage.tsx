import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { isQuoteExpired, type Payment, type QuoteRequest } from '../../domain'
import { useServices } from '../../services'
import { useSession } from '../../store/session'
import { BeneficiaryPicker } from './BeneficiaryPicker'
import { BookingConfirmation } from './BookingConfirmation'
import { QuoteCard } from './QuoteCard'
import { QuoteForm } from './QuoteForm'

export function QuotePage() {
  const services = useServices()
  const queryClient = useQueryClient()
  const clientId = useSession((s) => s.clientId)!

  const [lastRequest, setLastRequest] = useState<QuoteRequest | null>(null)
  const [beneficiaryId, setBeneficiaryId] = useState<string | null>(null)
  const [booked, setBooked] = useState<Payment | null>(null)

  const quoteMutation = useMutation({
    mutationFn: (req: QuoteRequest) => services.rates.getQuote(req),
  })

  const bookMutation = useMutation({
    mutationFn: ({ quoteId, beneficiaryId }: { quoteId: string; beneficiaryId: string }) =>
      services.rates.bookQuote(quoteId, beneficiaryId),
    onSuccess: (payment) => {
      setBooked(payment)
      quoteMutation.reset()
      queryClient.invalidateQueries({ queryKey: ['payments', clientId] })
      queryClient.invalidateQueries({ queryKey: ['balances', clientId] })
    },
  })

  function requestQuote(req: QuoteRequest) {
    setBooked(null)
    setLastRequest(req)
    quoteMutation.mutate(req)
  }

  function reset() {
    setBooked(null)
    setBeneficiaryId(null)
    setLastRequest(null)
    quoteMutation.reset()
    bookMutation.reset()
  }

  const quote = quoteMutation.data

  // tick so the Book button disables the moment the quote expires
  const [expired, setExpired] = useState(false)
  useEffect(() => {
    if (!quote) return
    setExpired(isQuoteExpired(quote))
    const t = setInterval(() => setExpired(isQuoteExpired(quote)), 1000)
    return () => clearInterval(t)
  }, [quote])

  const canBook = !!quote && !!beneficiaryId && !expired && !bookMutation.isPending

  if (booked) {
    return (
      <div className="mx-auto max-w-2xl">
        <h1 className="mb-4 text-xl font-bold text-brand">New payment</h1>
        <BookingConfirmation payment={booked} onNewPayment={reset} />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="mb-4 text-xl font-bold text-brand">New payment</h1>
      <div className="grid gap-5 lg:grid-cols-5">
        <Card title="Request a quote" className="lg:col-span-2 self-start">
          <QuoteForm clientId={clientId} disabled={quoteMutation.isPending} onSubmit={requestQuote} />
          {quoteMutation.isError && (
            <p className="mt-3 text-sm text-red-600">{(quoteMutation.error as Error).message}</p>
          )}
        </Card>

        <div className="space-y-5 lg:col-span-3">
          {quoteMutation.isPending && (
            <div className="rounded-lg border-2 border-dashed border-gray-200 bg-white p-10 text-center text-sm text-gray-400">
              Fetching live rate…
            </div>
          )}

          {quote && !quoteMutation.isPending && (
            <>
              <QuoteCard quote={quote} onRequote={() => lastRequest && requestQuote(lastRequest)} />

              <Card>
                <BeneficiaryPicker
                  clientId={clientId}
                  currency={quote.pair.buy}
                  selectedId={beneficiaryId}
                  onSelect={setBeneficiaryId}
                />

                {bookMutation.isError && (
                  <p className="mt-3 text-sm text-red-600">{(bookMutation.error as Error).message}</p>
                )}

                <Button
                  className="mt-4 w-full"
                  disabled={!canBook}
                  onClick={() => quote && beneficiaryId && bookMutation.mutate({ quoteId: quote.id, beneficiaryId })}
                >
                  {bookMutation.isPending
                    ? 'Booking…'
                    : quote.kind === 'forward'
                      ? 'Book forward contract'
                      : 'Book payment'}
                </Button>
                {!beneficiaryId && (
                  <p className="mt-2 text-center text-xs text-gray-400">Select a beneficiary to book.</p>
                )}
              </Card>
            </>
          )}

          {!quote && !quoteMutation.isPending && (
            <div className="rounded-lg border-2 border-dashed border-gray-200 bg-white p-10 text-center text-sm text-gray-400">
              Your live quote will appear here — with mid-market comparison and full cost breakdown.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
