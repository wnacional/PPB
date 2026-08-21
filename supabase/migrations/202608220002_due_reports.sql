create table if not exists public.user_notification_settings(
 user_id uuid primary key references auth.users(id) on delete cascade,
 due_reports_enabled boolean not null default true,
 updated_at timestamptz not null default now()
);
create table if not exists public.due_report_deliveries(
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 debt_id uuid not null references public.debts(id) on delete cascade,
 due_date date not null,
 report_type text not null check(report_type in('upcoming_15_days','overdue_3_days')),
 resend_email_id text,
 sent_at timestamptz not null default now(),
 unique(user_id,debt_id,due_date,report_type)
);

alter table public.user_notification_settings enable row level security;
alter table public.due_report_deliveries enable row level security;
create policy "Users manage own notification settings" on public.user_notification_settings for all using(auth.uid()=user_id) with check(auth.uid()=user_id);
create policy "Users view own due report deliveries" on public.due_report_deliveries for select using(auth.uid()=user_id);

create or replace view public.due_report_items with(security_invoker=true) as
select id as debt_id,user_id,name,debt_type,current_balance as amount_due,due_date
from public.debts where due_date is not null and current_balance>0;

-- Run once after deploying the Edge Function and setting secrets.
-- Replace the two placeholders, then execute this block in Supabase SQL Editor.
-- select cron.unschedule('pinoy-pocket-budget-due-reports')
-- where exists(select 1 from cron.job where jobname='pinoy-pocket-budget-due-reports');
-- select cron.schedule(
--   'pinoy-pocket-budget-due-reports','15 0 * * *',
--   $$select net.http_post(
--     url:='https://niaxwyjawzyefbqqjlgy.supabase.co/functions/v1/send-due-reports',
--     headers:=jsonb_build_object('Content-Type','application/json','Authorization','Bearer REPLACE_WITH_DUE_REPORT_CRON_SECRET'),
--     body:='{}'::jsonb
--   );$$
-- );
