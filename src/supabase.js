import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Guard: createClient throws if URL/key are missing. The fallback stub keeps the
// app usable (free tier, no auth) when Supabase env vars aren't configured.
export const supabase = (SUPABASE_URL && SUPABASE_ANON_KEY)
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : {
      from: () => ({ select: async () => ({ data: null, error: new Error("Supabase not configured") }) }),
      channel: () => ({ on: () => ({ subscribe: () => {} }) }),
      removeChannel: () => {},
      auth: {
        getSession: async () => ({ data: { session: null } }),
        onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
        signInWithOtp: async () => ({ error: new Error("Supabase not configured") }),
        signOut: async () => ({ error: null }),
      },
    };
