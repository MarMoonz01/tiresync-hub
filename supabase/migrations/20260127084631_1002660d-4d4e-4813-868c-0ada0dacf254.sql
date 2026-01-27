-- Add webhook verification columns to stores table
ALTER TABLE public.stores 
ADD COLUMN IF NOT EXISTS line_webhook_verified BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS line_webhook_verified_at TIMESTAMP WITH TIME ZONE;