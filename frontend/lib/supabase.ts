import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://bhuzchfybvzgptyffmvu.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_rhPKUyC8NdV2SO2myB4-JA_mO0VKNQd';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
