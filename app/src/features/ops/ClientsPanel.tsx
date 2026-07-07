import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { SkeletonRows } from '../../components/ui/Skeleton'
import { pairKey } from '@rz/domain'
import { useServices } from '../../services'

export function ClientsPanel() {
  const services = useServices()
  const queryClient = useQueryClient()
  const [drafts, setDrafts] = useState<Record<string, string>>({})

  const { data: clients, isPending } = useQuery({
    queryKey: ['clients'],
    queryFn: () => services.clients.getClients(),
  })

  const tierMutation = useMutation({
    mutationFn: ({ clientId, bps }: { clientId: string; bps: number }) =>
      services.admin.setTier(clientId, bps),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ['clients'] })
      setDrafts((d) => {
        const next = { ...d }
        delete next[updated.id]
        return next
      })
    },
  })

  return (
    <Card title="Client tiers & spreads">
      {isPending ? (
        <SkeletonRows rows={3} />
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wide text-gray-400">
              <th className="pb-2 font-bold">Client</th>
              <th className="pb-2 font-bold">Segment</th>
              <th className="pb-2 font-bold">Frequent corridors</th>
              <th className="pb-2 text-right font-bold">Spread (bps)</th>
              <th className="pb-2 text-right font-bold"></th>
            </tr>
          </thead>
          <tbody>
            {(clients ?? []).map((c) => {
              const draft = drafts[c.id] ?? String(c.tierSpreadBps)
              const changed = Number(draft) !== c.tierSpreadBps
              return (
                <tr key={c.id} className="border-t border-gray-100">
                  <td className="py-2.5 font-bold text-brand">{c.name}</td>
                  <td className="py-2.5 text-gray-500">{c.segment}</td>
                  <td className="py-2.5 text-gray-500">{c.frequentPairs.map(pairKey).join(', ')}</td>
                  <td className="py-2.5 text-right">
                    <label className="sr-only" htmlFor={`tier-${c.id}`}>
                      Spread for {c.name} in basis points
                    </label>
                    <input
                      id={`tier-${c.id}`}
                      type="number"
                      min={0}
                      max={300}
                      value={draft}
                      onChange={(e) => setDrafts((d) => ({ ...d, [c.id]: e.target.value }))}
                      className="w-20 rounded-md border border-gray-300 px-2 py-1 text-right text-sm tabular-nums"
                    />
                  </td>
                  <td className="py-2.5 text-right">
                    <Button
                      variant="secondary"
                      className="!px-2 !py-1 !text-xs"
                      disabled={!changed || tierMutation.isPending}
                      onClick={() => tierMutation.mutate({ clientId: c.id, bps: Number(draft) })}
                    >
                      Save
                    </Button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}
      {tierMutation.isError && (
        <p className="mt-2 text-sm text-red-600">{(tierMutation.error as Error).message}</p>
      )}
      <p className="mt-3 text-xs text-gray-400">
        New quotes for a client immediately price at the saved spread. Default tier is 50 bps
        (Wise-parity positioning); volume clients tier down.
      </p>
    </Card>
  )
}
