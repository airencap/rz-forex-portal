# RZ Forex Client Portal — Project Conventions

## What this is
A white-label B2B cross-border FX client portal for AW Fintech Pty Ltd (AFSL 443886,
ACN 125 839 572), product-branded "RZ Forex". Think Currencycloud's client portal:
spot + forward FX, beneficiary management, payment tracking, statements, and an
ops/admin console. Prototype phase runs on a mock service layer; the service
interfaces are designed to be swapped for Banking Circle API calls later.

## Stack
- Vite + React 18 + TypeScript
- React Router for navigation
- Tailwind CSS (no component library; custom components per brand spec below)
- Recharts for any charts
- State: React Query for server state (against mock services), Zustand for UI state
- Mock service layer in `src/services/mock/` implementing interfaces in
  `src/services/types.ts` — ALL data access goes through these interfaces.
  No component may import mock data directly.
- Deploy target: GitHub Pages via GitHub Actions (same pattern as prior projects)

## Brand (AW Fintech / RZ Forex)
- Navy: #0B1D3A (primary, headers, sidebar)
- Teal: #00B4D8 (accent, CTAs, active states)
- Light background: #F0F6FA
- Font: Arial / system sans
- Footer on every page: "AW Fintech Pty Ltd · ACN 125 839 572 · AFSL 443886"
- White-label ready: all brand tokens live in a single theme object
  (`src/theme/`) so a partner skin (logo, colors, product name) is a
  config swap, not a code change.

## Domain rules (do not violate)
- Forward contracts ARE in scope (covered under AFSL 443886). Spot and forwards only —
  no options, no margin FX, no CFDs.
- Quotes have a validity window (e.g. 30s countdown for spot); expired quotes must
  be re-requested, never silently refreshed into a booking.
- Payment states: draft → quoted → booked → funds_pending → in_flight → settled
  (plus failed / cancelled / returned). Model as an explicit state machine.
- Every booking records: client rate, mid-market reference rate, spread (bps),
  and fixed fee — the ledger must be able to reproduce revenue per trade.
- Currency amounts are integers in minor units. Never floats for money.
- Forwards: booking date, value date (up to 12 months), locked rate, and a
  settlement schedule; show mark-to-market indicatively only (prototype).

## Mock data flavor (make it realistic)
- Corridors: AUD→NPR (Nepal, flagship), AUD→JPY, AUD→USD, AUD→LKR, AUD→EUR, AUD→GBP
- Pricing model: mid-market reference + spread; default client tier 0.50% spread
  (Wise-parity positioning), tiered down for volume
- Sample clients: construction-materials importers (target beachhead segment),
  plus a remittance partner and a manufacturing importer for variety
- Volumes/dates should look like a real book: lumpy, month-end heavy

## Code conventions
- Small components, one per file; feature folders under `src/features/`
  (quote, payments, beneficiaries, forwards, statements, admin)
- No `any`. Currency, CurrencyPair, Money, Quote, Payment, Beneficiary,
  ForwardContract are shared types in `src/domain/`
- Every screen must render sensibly with zero data (empty states) and with
  loading states
- Accessibility: keyboard-navigable forms, visible focus states
- Commit style: conventional commits (feat:, fix:, chore:)

## Working style
- Execute directly; don't ask for confirmation on decisions already covered by
  this file or SPEC.md. Ask only when the spec is genuinely silent and the
  decision is hard to reverse.
- After each feature, run the dev build and fix errors before moving on.
