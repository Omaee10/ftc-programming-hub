-- ─────────────────────────────────────────────────────────────────────────────
-- FTC Programming Hub — Supabase Storage CDN / cache setup
-- Run in the Supabase SQL Editor only if you add Storage buckets later.
--
-- This app stores code in Postgres (code_snapshot / blocks_snapshot columns),
-- not in Supabase Storage. Skip this file unless you upload public assets
-- (logos, handouts, Blockly media, etc.) to a bucket.
-- ─────────────────────────────────────────────────────────────────────────────

-- ─── 1. Enable Smart CDN (Dashboard — not SQL) ───────────────────────────────
-- Project Settings → Storage → enable "Smart CDN" for public buckets.
-- Public object URLs are then served from the edge after the first fetch,
-- which cuts repeated egress for the same file.

-- ─── 2. Example public bucket with cache-friendly defaults ───────────────────
-- Adjust names/policies for your team before running.

-- insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
-- values (
--   'class-assets',
--   'class-assets',
--   true,
--   5242880,
--   array['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml', 'application/pdf']
-- )
-- on conflict (id) do nothing;

-- ─── 3. Upload with long-lived cache headers (application code) ──────────────
-- When uploading from the app, pass cacheControl so browsers and the CDN
-- can reuse responses:
--
--   supabase.storage.from('class-assets').upload(path, file, {
--     cacheControl: '31536000',
--     upsert: true,
--   });
--
-- For mutable files, use a shorter TTL (e.g. '3600') or versioned paths
-- (/v2/logo.png) so updates invalidate cleanly without disabling cache entirely.

-- ─── 4. RLS for a public read / mentor-write bucket ──────────────────────────
-- create policy "Public read class assets"
--   on storage.objects for select
--   using (bucket_id = 'class-assets');
--
-- create policy "Mentors upload class assets"
--   on storage.objects for insert
--   with check (
--     bucket_id = 'class-assets'
--     and auth.uid() in (select user_id from mentors where user_id is not null)
--   );
