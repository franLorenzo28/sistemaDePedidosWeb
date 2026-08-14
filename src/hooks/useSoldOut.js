import { useState, useEffect, useRef, useCallback } from 'react';
import { onValue, ref, set } from 'firebase/database';
import { getFirebaseDb, loadFirebase, firebaseReady } from '../lib/firebase.js';
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
  const listenerRef = useRef(null);
  const syncedRef = useRef(false);

  if (stateRef.current === null) stateRef.current = soldOut;

  const applyState = useCallback((next) => {
    stateRef.current = next;
    setSoldOut(next);
    save(next);
  }, []);

  const persistProduct = useCallback((id, value) => {
    if (!syncedRef.current) return;
    const db = getFirebaseDb();
    if (!db) return;
    set(ref(db, `products/${id}`), {
      id: String(id),
      sold_out: value,
      updated_at: Date.now(),
    }).catch(error => showToast(`Firebase: ${error.message}`));
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

    if (!firebaseReady) return () => { cancel = true; };

    async function init() {
      try {
        const db = await loadFirebase();
        if (cancel || !db) return;

        const productsPath = ref(db, 'products');
        listenerRef.current = onValue(productsPath, snapshot => {
          if (cancel) return;
          const data = snapshot.val() || {};
          const serverState = {};
          Object.entries(data).forEach(([id, row]) => {
            serverState[id] = Boolean(row?.sold_out);
          });

          const local = stateRef.current || {};
          const merged = { ...local, ...serverState };
          const localOnly = Object.entries(local)
            .filter(([id]) => !(id in serverState))
            .map(([id, value]) => set(ref(db, `products/${id}`), {
              id: String(id),
              sold_out: Boolean(value),
              updated_at: Date.now(),
            }));

          syncedRef.current = true;
          applyState(merged);
          Promise.all(localOnly).catch(error => showToast(`Firebase: ${error.message}`));
        }, error => {
          if (!cancel) showToast(`Firebase: ${error.message}`);
        });
      } catch (error) {
        if (!cancel) showToast(`Firebase: ${error.message}. Se usará el modo local.`);
      }
    }

    init();

    return () => {
      cancel = true;
      listenerRef.current?.();
    };
  }, [applyState]);

  return { soldOut, toggleSoldOut, isSoldOut };
}
