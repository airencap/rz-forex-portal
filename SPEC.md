# RZ Forex Client Portal — Prototype Specification

## Purpose
A demonstration-grade but production-shaped client portal proving what the
AW Fintech / RZ Forex product experience should be. Audience: internal
stakeholders and prospective white-label partners. Runs entirely on a mock
service layer; architecture must allow the mock layer to be replaced by a
Banking Circle-backed API without touching UI code.

## Personas
1. **Client user** (importer finance manager) — quotes, books, pays, reconciles
2. **Client admin** — manages users, beneficiaries, approval rules
3. **Ops user (AW Fintech)** — monitors payments, manages client tiers/spreads,
   sees revenue
4. **White-label partner admin** (later phase) — same as ops but scoped to
   their own client book, their branding

## Build order (phases)

### Phase 1 — Shell + Quote-to-Book (build first, demo-able on its own)
- App shell: navy sidebar nav, top bar with client/entity switcher, AFSL footer
- Login screen (mock auth, role selection for demo purposes)
- **Dashboard**: balances by currency (virtual account balances), recent
  payments, indicative rates panel for the client's frequent pairs, pending
  actions (quotes expiring, forwards approaching value date)
- **Quote & Book flow** (the hero flow — make this excellent):
  1. Sell/buy currency + amount (either-side entry: "I want to send X" or
     "beneficiary must receive Y")
  2. Live quote: client rate, mid-market comparison, fee breakdown, total cost
     transparency (Wise-style), 30-second validity countdown with visual timer
  3. Spot vs Forward toggle — forward adds value-date picker (up to 12 months)
     and shows forward points adjustment
  4. Select or create beneficiary inline
  5. Confirm → booking reference, funding instructions (virtual account details),
     payment enters state machine
- Payment detail page with a visual state-machine timeline (Currencycloud-style
  tracker: booked → funded → in flight → settled) incl. timestamps

### Phase 2 — Book of record
- **Payments list**: filterable/sortable, status chips, CSV export
- **Beneficiaries**: list + create/edit with per-currency required fields
  (NPR: bank + branch + account; JPY: zengin fields; USD: ABA/SWIFT; EUR: IBAN),
  validation states, "verified" badge flow
- **Forwards page**: open contracts table (rate, value date, notional, MTM
  indicator), drawdown/settle action (mock), utilization bar
- **Statements**: per-currency account statements, running balance, PDF-style
  print view, CSV export

### Phase 3 — Admin & white-label
- **Ops console** (role-gated): client list with tier/spread management,
  global payment monitor across clients, revenue view (spread + fee income by
  corridor and by client, month-to-date)
- **Approvals**: client-admin-configurable rule (payments > threshold require
  second approval) with an approvals queue
- **Theme demo**: settings page toggle that flips the whole portal to a sample
  partner skin (different logo/name/colors) to prove the white-label model

## Service layer contract (`src/services/types.ts`)
Define and implement against interfaces, e.g.:
- `RateService.getIndicativeRates(pairs)` / `getQuote(request)` (returns quote
  with expiry) / `bookQuote(quoteId)`
- `PaymentService.list(filter)` / `get(id)` / `advance(id)` (mock-only state
  advancer for demos)
- `BeneficiaryService` CRUD with per-currency validation schemas
- `ForwardService.list()` / `book()` / `drawdown()`
- `AccountService.getBalances()` / `getStatement(currency, range)`
- `AdminService.getClients()` / `setTier()` / `getRevenue(range)`
Mock implementations: deterministic seeded data + a small drift simulator so
rates tick realistically during demos. A "demo controls" dev panel may advance
payment states.

## Non-goals (prototype)
- Real auth, real KYC/onboarding flows (represent with static placeholder screens)
- Real sanctions screening (show a "screening passed" step in the payment
  timeline to communicate the compliance posture, but it is cosmetic)
- Options/margin products of any kind
- Mobile-first layouts (responsive-reasonable is enough; desktop is primary)

## Definition of done (prototype)
- All Phase 1–3 screens function against mock services with realistic data
- Zero TypeScript errors; builds clean; deployed to GitHub Pages
- A 5-minute demo path exists: login as client → quote AUD→NPR → book forward →
  fund → watch it settle (via demo controls) → switch to ops role → see the
  revenue line it generated → flip partner skin
