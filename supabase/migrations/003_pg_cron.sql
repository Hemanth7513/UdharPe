-- Daily overdue reminders via pg_cron + pg_net + Supabase Vault
-- Requires extensions: pg_cron, pg_net
-- Store secrets in Supabase Vault (hosted Postgres does not allow ALTER DATABASE SET app.settings.*):
--   SELECT vault.create_secret('https://YOUR_REF.supabase.co', 'supabase_url');
--   SELECT vault.create_secret('YOUR_CRON_SECRET', 'cron_secret');
-- The edge function send-reminders requires Authorization: Bearer <CRON_SECRET>

CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

GRANT USAGE ON SCHEMA cron TO postgres;

-- Unschedule previous placeholder job if present
SELECT cron.unschedule(jobid)
FROM cron.job
WHERE jobname = 'daily-reminders';

SELECT cron.schedule(
  'daily-reminders',
  '30 3 * * *',
  $$
  SELECT net.http_post(
    url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'supabase_url' LIMIT 1) || '/functions/v1/send-reminders',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'cron_secret' LIMIT 1)
    ),
    body := '{}'::jsonb
  );
  $$
);
