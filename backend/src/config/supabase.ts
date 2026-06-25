// ============================================
// Supabase Client Configuration
// Currently using dummy data — will connect to real Supabase later
// ============================================

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || 'placeholder-key';

// NOTE: This client is a placeholder. All current API operations use in-memory dummy data.
// When ready to connect to real Supabase, update .env with actual credentials.
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default supabase;
