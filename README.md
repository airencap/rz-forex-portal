# RZ Forex Client Portal

White-label B2B cross-border FX client portal for AW Fintech Pty Ltd
(ACN 125 839 572, AFSL 443886). Prototype: all data is mock; architecture is
production-shaped so the mock layer swaps for real integrations
(Banking Circle, ComplyAdvantage, Confirmation of Payee, KYC) without UI changes.

## Layout

| Workspace | What it is |
|---|---|
| `app/` | Vite + React 18 portal UI |
| `server/` | Fastify API exposing the same service contract over HTTP |
| `packages/domain/` | Shared domain: money (integer minor units), payment state machine, validation, service contract |
| `packages/mock-services/` | Deterministic mock engine used by both the browser and the server |

## Running

```sh
npm install

# fully in-browser (mock layer, same as GitHub Pages)
npm run dev

# against the API server
npm run dev:api                                   # starts http://localhost:4000
echo 'VITE_API_URL=http://localhost:4000' > app/.env.local
npm run dev
```

Delete `app/.env.local` to return to in-browser mode. Secrets/config belong in
`.env*` files (gitignored) or the host's environment — never in the repo.

`npm run typecheck` checks all workspaces; `npm run build` produces `app/dist`.
Pushes to `main` deploy the static app to GitHub Pages via Actions.
