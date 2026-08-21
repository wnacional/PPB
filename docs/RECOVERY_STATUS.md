# Recovery status

## Included

- Live homepage HTML
- Terms, Privacy, and Help route HTML
- All discovered JavaScript and CSS bundles
- Original deployed logo
- Exported `schema.sql`
- Generated `database.types.ts`
- `delete-account` Edge Function
- `send-due-reports` Edge Function

## Verified public behavior markers

The main bundle contains the existing account, income, savings, expense,
installment, debt, credit-card charge, due-date, due-payment, and advanced-
payment markers used by the current application.

## Not recovered

- Original uncompiled React/TypeScript components
- Source maps
- Original package lockfile
- Original Sites identity file
- Private environment values and server-side secrets

## Change-control rule

Treat the recovered static application as the behavior reference. Reconstruct
one feature area at a time and compare its results with the live application.
Do not modify production or apply migrations during parity reconstruction.

## Readable modules completed

- Transaction marker parser and encoder
- Money validation
- Account and maintaining-balance calculations
- Debt-charge and due-payment transaction creation
- Supabase-compatible finance repository
- Compensating rollback service for loan and credit-card charges and payments
- Readable account editor with maintaining balance for eligible bank accounts
- Readable debt-charge form and payment breakdown dialog
- Readable finance dashboard for accounts, loans, credit cards, charges, and payments
- Authenticated Supabase dashboard controller and refresh/error states
- Readable authentication shell and React application entry point
- Browser-memory demo mode with no Supabase access
- Corrected card charge separation and partial-payment charge preservation
