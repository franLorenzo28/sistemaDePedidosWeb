import { useState, useEffect, useRef, useCallback } from 'react';
import {
  get,
  onValue,
  ref,
  remove,
  runTransaction,
  set,
  update,
} from 'firebase/database';
import { getFirebaseDb, loadFirebase, firebaseReady } from '../lib/firebase.js';
import { showToast } from '../lib/toast.js';
import { nextNumber } from '../lib/utils.js';

export { showToast } from '../lib/toast.js';

const REFRESH_INTERVAL_MS = 60000;

function loadLocal() {
  try { return JSON.parse(localStorage.getItem('lobabi-orders') || '[]'); } catch { return []; }
}

function loadSoundPref() {
  try { return JSON.parse(localStorage.getItem('lobabi-sound') || 'true'); } catch { return true; }
}

function saveSoundPref(val) { localStorage.setItem('lobabi-sound', JSON.stringify(val)); }

function normalizeItems(items) {
  if (Array.isArray(items)) return items;
  return Object.values(items || {});
}

function mapOrder(id, row = {}) {
  return {
    id,
    number: row.number,
    customer: row.customer,
    notes: row.notes,
    items: normalizeItems(row.items),
    status: row.status,
    createdAt: row.created_at,
  };
}

function mapOrders(snapshot) {
  const data = snapshot.val() || {};
  return Object.entries(data)
    .map(([id, row]) => mapOrder(id, row))
    .sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
}

function orderData(order) {
  return {
    number: order.number,
    customer: order.customer,
    notes: order.notes,
    items: order.items,
    status: order.status,
    created_at: order.createdAt,
  };
}

function calculateStatus(items, fallbackStatus = 'pendiente') {
  const statuses = items.map(item => item.status || fallbackStatus);
  return statuses.every(status => status === 'entregado') ? 'entregado'
    : statuses.every(status => status === 'listo' || status === 'entregado') ? 'listo'
      : statuses.some(status => status !== 'pendiente') ? 'preparando' : 'pendiente';
}

export function useOrders() {
  const [orders, setOrders] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [connection, setConnection] = useState(firebaseReady ? 'connecting' : 'local');
  const [soundEnabled, setSoundEnabled] = useState(loadSoundPref);

  const listenerRef = useRef(null);
  const ordersRef = useRef([]);
  const knownIdsRef = useRef(new Set());
  const loadedRef = useRef(false);
  const pendingSaveRef = useRef(null);
  const saveTimerRef = useRef(null);
  const refreshRef = useRef(null);

  const persistOrders = useCallback((next) => {
    pendingSaveRef.current = next;
    clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      try { localStorage.setItem('lobabi-orders', JSON.stringify(pendingSaveRef.current)); } catch { }
    }, 400);
  }, []);

  const setAllOrders = useCallback((next) => {
    ordersRef.current = next;
    knownIdsRef.current = new Set(next.map(order => order.id));
    setOrders(next);
    persistOrders(next);
  }, [persistOrders]);

  const insertOrder = useCallback((order) => {
    const isNew = !knownIdsRef.current.has(order.id);
    const next = [...ordersRef.current.filter(item => item.id !== order.id), order];
    setAllOrders(next);
    return isNew;
  }, [setAllOrders]);

  const notifyNewOrders = useCallback((newOrders) => {
    if (!newOrders.length) return;
    const label = newOrders.length === 1 ? `Nuevo pedido ${newOrders[0].number}` : `${newOrders.length} pedidos nuevos`;
    showToast(`🔔 ${label}: revisar cocina.`);
    newOrders.forEach(order => {
      window.dispatchEvent(new CustomEvent('new-order-popup', { detail: { order } }));
    });
    document.title = `🔔 ${label} · Lobabi`;
    setTimeout(() => { document.title = 'Lobabi · Cantina'; }, 5000);
  }, []);

  const toggleSound = useCallback((val) => {
    const next = typeof val === 'boolean' ? val : !soundEnabled;
    setSoundEnabled(next);
    saveSoundPref(next);
  }, [soundEnabled]);

  useEffect(() => {
    let cancel = false;
    let refreshInterval = null;

    const useLocalMode = () => {
      const local = loadLocal();
      loadedRef.current = true;
      setAllOrders(local);
      setLoaded(true);
      setConnection('local');
    };

    if (!firebaseReady) {
      useLocalMode();
      return () => { cancel = true; };
    }

    async function init() {
      setConnection('connecting');

      try {
        const db = await loadFirebase();
        if (cancel || !db) return;

        const ordersPath = ref(db, 'orders');

        async function refresh() {
          const snapshot = await get(ordersPath);
          if (cancel) return;
          const mapped = mapOrders(snapshot);
          if (loadedRef.current) {
            notifyNewOrders(mapped.filter(order => !knownIdsRef.current.has(order.id)));
          }
          setAllOrders(mapped);
          if (!loadedRef.current) {
            loadedRef.current = true;
            setLoaded(true);
          }
          setConnection('connected');
        }

        refreshRef.current = refresh;
        await refresh();
        if (cancel) return;

        listenerRef.current = onValue(ordersPath, snapshot => {
          if (cancel) return;
          const mapped = mapOrders(snapshot);
          if (loadedRef.current) {
            notifyNewOrders(mapped.filter(order => !knownIdsRef.current.has(order.id)));
          }
          setAllOrders(mapped);
          if (!loadedRef.current) {
            loadedRef.current = true;
            setLoaded(true);
          }
          setConnection('connected');
        }, error => {
          if (cancel) return;
          showToast(`Firebase: ${error.message}`);
          setConnection('reconnecting');
        });

        refreshInterval = setInterval(refresh, REFRESH_INTERVAL_MS);
      } catch (error) {
        if (cancel) return;
        showToast(`Firebase: ${error.message}. Se usará el modo local.`);
        useLocalMode();
      }
    }

    init();

    const handleOnline = () => {
      setConnection('reconnecting');
      refreshRef.current?.();
    };
    const handleOffline = () => setConnection('offline');
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      cancel = true;
      clearInterval(refreshInterval);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      listenerRef.current?.();
      if (pendingSaveRef.current != null) {
        try { localStorage.setItem('lobabi-orders', JSON.stringify(pendingSaveRef.current)); } catch { }
      }
    };
  }, [setAllOrders, notifyNewOrders]);

  const refreshOrders = useCallback(() => {
    if (!firebaseReady) return;
    setConnection('reconnecting');
    refreshRef.current?.();
  }, []);

  const addOrder = useCallback(async (order) => {
    if (!firebaseReady) {
      insertOrder(order);
      loadedRef.current = true;
      setLoaded(true);
      window.dispatchEvent(new CustomEvent('new-order-popup', { detail: { order } }));
      return;
    }

    if (knownIdsRef.current.has(order.id)) return;
    const db = getFirebaseDb();
    if (!db) { showToast('Sin conexión. Reintentá en un momento.'); return; }
    try {
      const counterResult = await runTransaction(ref(db, 'meta/orderNumber'), current => {
        const lastNumber = Number(current);
        if (!Number.isFinite(lastNumber) || lastNumber <= 0) return Number(nextNumber(ordersRef.current));
        return lastNumber >= 100 ? 1 : lastNumber + 1;
      });
      if (!counterResult.committed) throw new Error('No se pudo reservar un número de pedido.');

      const savedOrder = { ...order, number: Number(counterResult.snapshot.val()) };
      await set(ref(db, `orders/${savedOrder.id}`), orderData(savedOrder));
      insertOrder(savedOrder);
      return savedOrder;
    } catch (error) {
      showToast(`Firebase: ${error.message}`);
      throw error;
    }
  }, [insertOrder]);

  const updateOrder = useCallback(async (id, status, station) => {
    const previous = ordersRef.current;
    const found = previous.find(order => order.id === id);
    if (!found) return false;

    let next;
    if (station) {
      const updatedItems = found.items.map(item => item.station === station ? { ...item, status } : item);
      const newStatus = calculateStatus(updatedItems, found.status);
      next = previous.map(order => order.id === id ? { ...order, items: updatedItems, status: newStatus } : order);
    } else {
      next = previous.map(order => order.id === id ? { ...order, status } : order);
    }
    setAllOrders(next);

    if (!firebaseReady) return true;
    const db = getFirebaseDb();
    if (!db) return true;

    try {
      if (station) {
        const result = await runTransaction(ref(db, `orders/${id}`), current => {
          if (!current) return;
          const currentItems = normalizeItems(current.items);
          const updatedItems = currentItems.map(item => item.station === station ? { ...item, status } : item);
          const updatedStatus = calculateStatus(updatedItems, current.status);
          return { ...current, items: updatedItems, status: updatedStatus, updated_at: Date.now() };
        });
        if (!result.committed) return false;
        const serverOrder = mapOrder(id, result.snapshot.val());
        setAllOrders(ordersRef.current.map(order => order.id === id ? serverOrder : order));
        return true;
      }

      const updated = next.find(order => order.id === id);
      await update(ref(db, `orders/${id}`), { status: updated.status, updated_at: Date.now() });
      return true;
    } catch (error) {
      showToast(`Firebase: ${error.message}`);
      return false;
    }
  }, [setAllOrders]);

  const assignItems = useCallback(async (id, station, assignedTo) => {
    const previous = ordersRef.current;
    const found = previous.find(order => order.id === id);
    if (!found) return false;
    const updatedItems = found.items.map(item => (
      item.station === station && !item.assignedTo ? { ...item, assignedTo } : item
    ));
    const next = previous.map(order => order.id === id ? { ...order, items: updatedItems } : order);
    setAllOrders(next);

    if (!firebaseReady) return true;
    const db = getFirebaseDb();
    if (!db) return true;

    try {
      const result = await runTransaction(ref(db, `orders/${id}`), current => {
        if (!current) return;
        const currentItems = normalizeItems(current.items);
        const serverItems = currentItems.map(item => (
          item.station === station && !item.assignedTo ? { ...item, assignedTo } : item
        ));
        return { ...current, items: serverItems, updated_at: Date.now() };
      });
      if (!result.committed) return false;
      const serverOrder = mapOrder(id, result.snapshot.val());
      setAllOrders(ordersRef.current.map(order => order.id === id ? serverOrder : order));
      return true;
    } catch (error) {
      showToast(`Firebase: ${error.message}`);
      return false;
    }
  }, [setAllOrders]);

  const saveEditedOrder = useCallback(async (order) => {
    const next = ordersRef.current.map(current => current.id === order.id ? order : current);
    setAllOrders(next);
    if (!firebaseReady) return true;
    const db = getFirebaseDb();
    if (!db) return true;

    try {
      await update(ref(db, `orders/${order.id}`), { ...orderData(order), updated_at: Date.now() });
      return true;
    } catch (error) {
      showToast(`Firebase: ${error.message}`);
      return false;
    }
  }, [setAllOrders]);

  const deleteOrder = useCallback(async (id) => {
    setAllOrders(ordersRef.current.filter(order => order.id !== id));
    if (!firebaseReady) return true;
    const db = getFirebaseDb();
    if (!db) return true;

    try {
      await remove(ref(db, `orders/${id}`));
      return true;
    } catch (error) {
      showToast(`Firebase: ${error.message}`);
      return false;
    }
  }, [setAllOrders]);

  return {
    orders,
    loaded,
    connection,
    addOrder,
    updateOrder,
    assignItems,
    saveEditedOrder,
    deleteOrder,
    refreshOrders,
    toggleSound,
    soundEnabled,
  };
}
