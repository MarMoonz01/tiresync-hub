-- Instructions for inserting secrets into Supabase Vault
-- Run these manually via the Supabase dashboard → Vault, or via psql with service_role.
-- Never run in a migration that auto-executes in prod — secrets must be injected per-environment.

-- Example (replace with real values):
-- select vault.create_secret('your-line-channel-secret', 'line_channel_secret_default');
-- select vault.create_secret('your-line-channel-token', 'line_channel_token_default');
-- select vault.create_secret('your-claude-api-key', 'claude_api_key_default');
-- select vault.create_secret('your-fb-page-token', 'fb_page_token_default');

-- This migration is a no-op — it just documents the Vault setup pattern.
select 1;
