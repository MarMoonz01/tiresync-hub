-- Add vault reference columns to stores
-- Existing line_channel_secret / line_channel_access_token kept for backward compat
-- (line-webhook still reads them until Phase 2 migration)

alter table public.stores
  add column if not exists facebook_page_id text,
  add column if not exists vault_line_secret_ref text,
  add column if not exists vault_line_token_ref text,
  add column if not exists vault_line_oa_ref text,
  add column if not exists vault_fb_token_ref text;
