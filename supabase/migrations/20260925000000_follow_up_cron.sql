-- Daily follow-up emails: 9:00 AM IST (03:30 UTC) call the api function's cron route.
create extension if not exists pg_cron;
create extension if not exists pg_net with schema extensions;

select cron.schedule(
  'grievance-follow-up',
  '30 3 * * *',
  $$ select net.http_post(url := 'https://wkhlisjkosshmkupqccp.supabase.co/functions/v1/api/cron/follow-up') $$
);
