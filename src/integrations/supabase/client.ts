// src/integrations/supabase/client.ts
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

// ใช้ชื่อให้ตรงกับที่คุณประกาศไว้ใน .env
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY; // ใช้ค่า Key ที่คุณมีอยู่

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error("Missing Supabase configuration. Check your .env file.");
}

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  }
});