# Pinoy Pocket Budget — recovered source baseline

This project is a recoverable, buildable baseline assembled from the existing
public deployment and the exported Supabase backend files.

## Current state

- The application is preserved as its deployed JavaScript and CSS bundles.
- The public routes, logo, database schema, generated database types, and Edge
  Functions are included.
- The build does not create or change a Site, Supabase project, custom domain,
  database record, or secret.
- `.openai/hosting.json` is intentionally absent because the original Sites
  project identity could not be recovered safely.

## Commands

```powershell
npm.cmd run build
npm.cmd run dev
```

The first command creates `dist`. The second serves the preserved application
locally on port 4173.

## Recovery stages

1. Preserve the deployed application exactly in a reproducible project.
2. Map bundle features, Supabase calls, transaction markers, and UI flows.
3. Replace compiled sections with readable React and TypeScript modules.
4. Add debt-charge and payment-allocation support only after parity tests pass.
5. Restore hosting identity or attach the existing domain only after approval.

Do not apply `ppb_debt_accounting_migration.sql` until the readable payment and
reminder logic is integrated and tested.
