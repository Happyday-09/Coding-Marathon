// ============================================
// Supabase Client Configuration
// Currently using dummy data — will connect to real Supabase later
// ============================================

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || 'https://placeholder.supabase.co';
// Use the Service Role Key for backend administration to bypass Row Level Security (RLS)
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || 'placeholder-key';

export const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  }
});

export default supabase;
