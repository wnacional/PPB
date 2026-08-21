# Pinoy Pocket Budget

A Filipino-focused personal budget app for tracking income, expenses, loans, credit cards, debt payments, and due dates.

## Local setup

1. Copy `.env.example` to `.env` and add the Supabase anon key.
2. Run the SQL migration in `supabase/migrations` through Supabase.
3. Run `npm install`, then `npm run dev`.

Never commit `.env` or Supabase service-role credentials.
