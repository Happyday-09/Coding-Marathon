import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';

const SUPABASE_URL = 'https://bhuzchfybvzgptyffmvu.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_rhPKUyC8NdV2SO2myB4-JA_mO0VKNQd';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: Platform.OS === 'web',
  },
});

