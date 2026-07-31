import { useState, useEffect, useRef, useCallback } from 'react';
import { getSupabase, loadSupabase, supabaseReady } from '../lib/supabase.js';
import { showToast } from '../lib/toast.js';

const STORAGE_KEY = 'lobabi-sold-out';

function load() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {}; } catch { return {}; }
}

function save(state) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch { }
}

export function useSoldOut() {
  const [soldOut, setSoldOut] = useState(load);
  const stateRef = useRef(null);
  const channelRef = useRef(null);
  const syncedRef = useRef(false);

  if (stateRef.current === null) stateRef.current = soldOut;

  const applyState = useCallback((next) => {
    stateRef.current = next;
    setSoldOut(next);
    save(next);
  }, []);

  const setRemote = useCallback((id, value) => {
    if (id == null) return;
    applyState({ ...stateRef.current, [id]: Boolean(value) });
  }, [applyState]);

  const removeRemote = useCallback((id) => {
    if (id == null) return;
    const next = { ...stateRef.current };
    delete next[id];
    applyState(next);
  }, [applyState]);

  const persistProduct = useCallback((id, value) => {
    if (!syncedRef.current) return;
    const supabase = getSupabase();
    if (!supabase) return;
    supabase.from('products')
      .upsert({ id, sold_out: value, updated_at: Date.now() }, { onConflict: 'id' })
      .then(({ error }) => { if (error) showToast(`Supabase: ${error.message}`); });
  }, []);

  const setProduct = useCallback((id, value) => {
    const next = { ...stateRef.current, [id]: Boolean(value) };
    applyState(next);
    persistProduct(id, Boolean(value));
  }, [applyState, persistProduct]);

  const toggleSoldOut = useCallback((id) => {
    setProduct(id, !stateRef.current[id]);
  }, [setProduct]);

  const isSoldOut = useCallback((id) => Boolean(stateRef.current[id]), []);

  useEffect(() => {
    let cancel = false;

    if (!supabaseReady) return () => { cancel = true; };

    async function init() {
      const supabase = await loadSupabase();
      if (cancel || !supabase) return;

      const { data, error } = await supabase.from('products').select('*');
      if (cancel) return;
      if (error) return;

      const serverState = {};
      (data || []).forEach(row => { serverState[row.id] = Boolean(row.sold_out); });

      const local = stateRef.current || {};
      const merged = { ...local, ...serverState };
      syncedRef.current = true;
      applyState(merged);

      const localOnly = Object.entries(local)
        .filter(([id]) => !(id in serverState))
        .map(([id, value]) => ({ id, sold_out: Boolean(value), updated_at: Date.now() }));
      if (localOnly.length) {
        supabase.from('products').upsert(localOnly, { onConflict: 'id' })
          .then(({ error: err }) => { if (err) showToast(`Supabase: ${err.message}`); });
      }

      channelRef.current = supabase.channel('products-live')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'products' }, payload => {
          if (cancel) return;
          setRemote(payload.new.id, payload.new.sold_out);
        })
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'products' }, payload => {
          if (cancel) return;
          setRemote(payload.new.id, payload.new.sold_out);
        })
        .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'products' }, payload => {
          if (cancel) return;
          removeRemote(payload.old.id);
        })
        .subscribe();
    }

    init();

    return () => {
      cancel = true;
      channelRef.current?.unsubscribe?.();
    };
  }, [applyState, setRemote, removeRemote]);

  return { soldOut, toggleSoldOut, isSoldOut };
}
