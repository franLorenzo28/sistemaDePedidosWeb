import { supabaseConfig } from '../supabase-config.js';

export const supabaseReady = Boolean(supabaseConfig.url && supabaseConfig.anonKey);

let client = null;
let clientPromise = null;

export function getSupabase() {
  return client;
}

export function loadSupabase() {
  if (!supabaseReady) return Promise.resolve(null);
  if (client) return Promise.resolve(client);
  if (!clientPromise) {
    clientPromise = import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm')
      .then(({ createClient }) => {
        client = createClient(supabaseConfig.url, supabaseConfig.anonKey);
        return client;
      });
  }
  return clientPromise;
}
