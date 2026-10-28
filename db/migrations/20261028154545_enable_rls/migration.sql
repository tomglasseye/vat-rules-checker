-- Supabase's security scan (28 Oct 2026) flagged the tables in the public schema for not having Row-Level
-- Security turned on. Supabase's Data API exposes every public table to anyone with the project's anon key,
-- and RLS with no policies shuts that API out completely.
--
-- The app doesn't use the Data API: it connects to Postgres directly as the tables' owner, and owners bypass
-- RLS, so nothing changes for it. Covers every public table, including app_migrations.
--
-- Already run by hand in the Supabase SQL editor on 28 Oct 2026. Turning RLS on again changes nothing.
DO $$
DECLARE t record;
BEGIN
  FOR t IN SELECT tablename FROM pg_tables WHERE schemaname = 'public' LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t.tablename);
  END LOOP;
END $$;
