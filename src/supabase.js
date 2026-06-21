import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

/**
 * Fallback stub used when Supabase env vars aren't set (e.g. local dev or a
 * deploy missing VITE_SUPABASE_*). Every query method is implemented and
 * chainable so the app NEVER throws "x.from(...).insert is not a function".
 * All terminal calls resolve to a friendly "not configured" error that the
 * UI already handles by showing a message instead of crashing.
 */
function makeStub() {
  const notConfigured = { data: null, error: { message: "Reviews are offline — Supabase isn't configured on this deployment." } };

  // A thenable, fully-chainable query builder. Any chain of .eq/.order/.limit/etc
  // ends in a resolved promise, and insert/update/delete/upsert all exist.
  const builder = () => {
    const chain = {
      select:  () => chain,
      insert:  async () => notConfigured,
      update:  () => chain,
      upsert:  async () => notConfigured,
      delete:  () => chain,
      eq:      () => chain,
      neq:     () => chain,
      order:   () => chain,
      limit:   () => chain,
      single:  async () => notConfigured,
      maybeSingle: async () => notConfigured,
      // make the builder awaitable so `await supabase.from(x).select()...` works
      then:    (resolve) => resolve(notConfigured),
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
