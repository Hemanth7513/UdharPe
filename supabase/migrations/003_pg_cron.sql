-- Daily overdue reminders via pg_cron + pg_net
-- Requires extensions: pg_cron, pg_net
-- Set secrets in the database before enabling:
--   ALTER DATABASE postgres SET app.settings.supabase_url = 'https://YOUR_REF.supabase.co';
--   ALTER DATABASE postgres SET app.settings.cron_secret = 'YOUR_CRON_SECRET';
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
    url := current_setting('app.settings.supabase_url', true) || '/functions/v1/send-reminders',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.cron_secret', true)
    ),
    body := '{}'::jsonb
  );
  $$
);
