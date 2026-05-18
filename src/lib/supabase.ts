import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

// ============================================================
// Replace these with your Supabase project values
// Get them from: https://app.supabase.com → Project Settings → API
// ============================================================
const SUPABASE_URL = 'YOUR_SUPABASE_URL_HERE';
const SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY_HERE';

// If credentials aren't set, the app runs in OFFLINE MODE — all data
// stays on device via AsyncStorage. SAVE INJECTION will work, photos
// will be stored as local URIs. When you add real credentials, the app
// will start syncing to your Supabase project automatically.
export const SUPABASE_CONFIGURED =
  SUPABASE_URL !== 'YOUR_SUPABASE_URL_HERE' &&
  SUPABASE_ANON_KEY !== 'YOUR_SUPABASE_ANON_KEY_HERE';

export const supabase = SUPABASE_CONFIGURED
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        storage: AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
    })
  : null;
