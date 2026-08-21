# Pinoy Pocket Budget

A Filipino-focused personal budget app for tracking income, expenses, loans, credit cards, debt payments, and due dates.

## Local setup

1. Copy `.env.example` to `.env` and add the Supabase anon key.
2. Run the SQL migration in `supabase/migrations` through Supabase.
3. Run `npm install`, then `npm run dev`.

Never commit `.env` or Supabase service-role credentials.

## Production configuration

Configure these Cloudflare build variables:

- `VITE_SUPABASE_URL=https://niaxwyjawzyefbqqjlgy.supabase.co`
- `VITE_SUPABASE_ANON_KEY=<Supabase publishable key>`

In Supabase Auth URL Configuration, set:

- Site URL: `https://pinoypocketbudget.app`
- Redirect URL: `https://pinoypocketbudget.app/**`

Cloudflare builds with `npm run build` and deploys with `npx wrangler deploy`. The Worker serves `dist/` with SPA fallback so `/help`, `/privacy`, and `/terms` resolve correctly.

## Due-date email reports

The `send-due-reports` Supabase Edge Function sends a report exactly 15 days before a due date and 3 days after an unpaid due date. It skips unconfirmed email addresses, users who disabled reports, and deliveries already logged for the same debt and due date.

Set `RESEND_API_KEY`, `REPORT_FROM_EMAIL`, and `DUE_REPORT_CRON_SECRET` as Supabase Edge Function secrets. The scheduler template in migration `202608220002_due_reports.sql` runs daily at `00:15 UTC` (`8:15 AM` Philippine time).