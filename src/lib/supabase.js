import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

function makeStub() {
  const notConfigured = { data: null, error: { message: "Reviews are offline — Supabase isn't configured on this deployment." } };
  const builder = () => {
    const chain = {
      select: () => chain,
      insert: async () => notConfigured,
      update: () => chain,
      upsert: async () => notConfigured,
      delete: () => chain,
      eq: () => chain,
      neq: () => chain,
      order: () => chain,
      limit: () => chain,
      single: async () => notConfigured,
      maybeSingle: async () => notConfigured,
      then: (resolve) => resolve(notConfigured),
    };
    return chain;
  };
  return {
    from: () => builder(),
    channel: () => ({ on: () => ({ subscribe: () => ({}) }) }),
    removeChannel: () => {},
    auth: {
      getSession: async () => ({ data: { session: null } }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
      signInWithOtp: async () => ({ error: { message: "Auth offline — Supabase isn't configured." } }),
      signOut: async () => ({ error: null }),
    },
  };
}

export const supabase = isSupabaseConfigured
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : makeStub();