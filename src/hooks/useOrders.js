import { useState, useEffect, useRef, useCallback } from 'react';
import { getSupabase, loadSupabase, supabaseReady } from '../lib/supabase.js';
import { showToast } from '../lib/toast.js';

export { showToast } from '../lib/toast.js';

const REFRESH_INTERVAL_MS = 60000;

function loadLocal() {
  try { return JSON.parse(localStorage.getItem('lobabi-orders') || '[]'); } catch { return []; }
}

function loadSoundPref() {
  try { return JSON.parse(localStorage.getItem('lobabi-sound') || 'true'); } catch { return true; }
}
function saveSoundPref(val) { localStorage.setItem('lobabi-sound', JSON.stringify(val)); }

function mapRow(row) {
  return {
    id: row.id, number: row.number, customer: row.customer, notes: row.notes,
    items: row.items, status: row.status, createdAt: row.created_at
  };
}

export function useOrders() {
  const [orders, setOrders] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [connection, setConnection] = useState(supabaseReady ? 'connecting' : 'local');
  const [soundEnabled, setSoundEnabled] = useState(loadSoundPref);

  const channelRef = useRef(null);
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
    knownIdsRef.current = new Set(next.map(o => o.id));
    setOrders(next);
    persistOrders(next);
  }, [persistOrders]);

  const insertOrder = useCallback((order) => {
    const isNew = !knownIdsRef.current.has(order.id);
    const next = [...ordersRef.current.filter(o => o.id !== order.id), order];
    setAllOrders(next);
    return isNew;
  }, [setAllOrders]);

  const notifyNewOrders = useCallback((newOrders) => {
    if (!newOrders.length) return;
    const label = newOrders.length === 1 ? `Nuevo pedido ${newOrders[0].number}` : `${newOrders.length} pedidos nuevos`;
    showToast(`🔔 ${label}: revisar cocina.`);
    newOrders.forEach(o => {
      window.dispatchEvent(new CustomEvent('new-order-popup', { detail: { order: o } }));
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

    if (!supabaseReady) {
      const local = loadLocal();
      loadedRef.current = true;
      setAllOrders(local);
      setLoaded(true);
      setConnection('local');
      return () => { cancel = true; };
    }

    async function init() {
      setConnection('connecting');
      const supabase = await loadSupabase();
      if (cancel || !supabase) return;

      async function refresh() {
        const { data, error } = await supabase.from('orders').select('*').order('created_at', { ascending: true });
        if (cancel) return;
        if (error) {
          showToast(`Supabase: ${error.message}`);
          setConnection('reconnecting');
          return;
        }
        const mapped = (data || []).map(mapRow);
        if (loadedRef.current) {
          notifyNewOrders(mapped.filter(o => !knownIdsRef.current.has(o.id)));
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

      channelRef.current = supabase.channel('orders-live')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'orders' }, payload => {
          if (cancel) return;
          const order = mapRow(payload.new);
          const isNew = insertOrder(order);
          if (isNew && loadedRef.current) notifyNewOrders([order]);
        })
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders' }, payload => {
          if (cancel) return;
          const incoming = mapRow(payload.new);
          if (!knownIdsRef.current.has(incoming.id)) {
            setAllOrders([...ordersRef.current, incoming]);
            return;
          }
          setAllOrders(ordersRef.current.map(o => o.id === incoming.id ? incoming : o));
        })
        .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'orders' }, payload => {
          if (cancel) return;
          setAllOrders(ordersRef.current.filter(o => o.id !== payload.old.id));
        })
        .subscribe(status => {
          if (cancel) return;
          if (status === 'SUBSCRIBED') setConnection('connected');
          else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') setConnection('reconnecting');
        });

      refreshInterval = setInterval(refresh, REFRESH_INTERVAL_MS);
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
      channelRef.current?.unsubscribe?.();
      if (pendingSaveRef.current != null) {
        try { localStorage.setItem('lobabi-orders', JSON.stringify(pendingSaveRef.current)); } catch { }
      }
    };
  }, [setAllOrders, insertOrder, notifyNewOrders]);

  const refreshOrders = useCallback(() => {
    if (!supabaseReady) return;
    setConnection('reconnecting');
    refreshRef.current?.();
  }, []);

  const addOrder = useCallback(async (order) => {
    if (!supabaseReady) {
      insertOrder(order);
      loadedRef.current = true;
      setLoaded(true);
      window.dispatchEvent(new CustomEvent('new-order-popup', { detail: { order } }));
      return;
    }
    if (knownIdsRef.current.has(order.id)) return;
    const supabase = getSupabase();
    if (!supabase) { showToast('Sin conexión. Reintentá en un momento.'); return; }
    const { error } = await supabase.from('orders').insert({
      id: order.id, number: order.number, customer: order.customer,
      notes: order.notes, items: order.items, status: order.status, created_at: order.createdAt
    });
    if (error) { showToast(`Supabase: ${error.message}`); throw error; }
    insertOrder(order);
  }, [insertOrder]);

  const updateOrder = useCallback(async (id, status, station, assignedTo) => {
    const prev = ordersRef.current;
    const found = prev.find(o => o.id === id);
    if (!found) return false;
    let next;
    if (station) {
      const updatedItems = found.items.map(item =>
        item.station === station
          ? { ...item, status }
          : item
      );
      const itemStatuses = updatedItems.map(item => item.status || found.status || 'pendiente');
      const newStatus = itemStatuses.every(s => s === 'entregado') ? 'entregado'
        : itemStatuses.every(s => s === 'listo' || s === 'entregado') ? 'listo'
        : itemStatuses.some(s => s !== 'pendiente') ? 'preparando' : 'pendiente';
      next = prev.map(o => o.id === id ? { ...o, items: updatedItems, status: newStatus } : o);
    } else {
      next = prev.map(o => o.id === id ? { ...o, status } : o);
    }
    setAllOrders(next);
    if (!supabaseReady) return true;
    const supabase = getSupabase();
    if (!supabase) return true;
    const updated = next.find(o => o.id === id);
    if (station) {
      const { data, error } = await supabase.rpc('set_item_status', { p_order_id: id, p_station: station, p_status: status });
      if (!error && data) {
        const serverOrder = mapRow(data);
        setAllOrders(ordersRef.current.map(o => o.id === serverOrder.id ? serverOrder : o));
        return true;
      }
      if (error) {
        const { error: fallbackError } = await supabase.from('orders')
          .update({ status: updated.status, items: updated.items, updated_at: Date.now() })
          .eq('id', id);
        if (fallbackError) { showToast(`Supabase: ${fallbackError.message}`); return false; }
        return true;
      }
      return true;
    }
    const { error } = await supabase.from('orders')
      .update({ status: updated.status, items: updated.items, updated_at: Date.now() })
      .eq('id', id);
    if (error) { showToast(`Supabase: ${error.message}`); return false; }
    return true;
  }, [setAllOrders]);

  const assignItems = useCallback(async (id, station, assignedTo) => {
    const prev = ordersRef.current;
    const found = prev.find(o => o.id === id);
    if (!found) return false;
    const updatedItems = found.items.map(item =>
      item.station === station && !item.assignedTo
        ? { ...item, assignedTo }
        : item
    );
    const next = prev.map(o => o.id === id ? { ...o, items: updatedItems } : o);
    setAllOrders(next);
    if (!supabaseReady) return true;
    const supabase = getSupabase();
    if (!supabase) return true;
    const { data, error } = await supabase.rpc('assign_item', { p_order_id: id, p_station: station, p_assigned_to: assignedTo });
    if (!error && data) {
      const serverOrder = mapRow(data);
      setAllOrders(ordersRef.current.map(o => o.id === serverOrder.id ? serverOrder : o));
      return true;
    }
    if (error) {
      const { error: fallbackError } = await supabase.from('orders')
        .update({ items: updatedItems, updated_at: Date.now() })
        .eq('id', id);
      if (fallbackError) { showToast(`Supabase: ${fallbackError.message}`); return false; }
      return true;
    }
    return true;
  }, [setAllOrders]);

  const saveEditedOrder = useCallback(async (order) => {
    const next = ordersRef.current.map(o => o.id === order.id ? order : o);
    setAllOrders(next);
    if (!supabaseReady) return true;
    const supabase = getSupabase();
    if (!supabase) return true;
    const { error } = await supabase.from('orders')
      .update({ number: order.number, customer: order.customer, notes: order.notes, items: order.items, status: order.status, updated_at: Date.now() })
      .eq('id', order.id);
    if (error) { showToast(`Supabase: ${error.message}`); return false; }
    return true;
  }, [setAllOrders]);

  const deleteOrder = useCallback(async (id) => {
    setAllOrders(ordersRef.current.filter(o => o.id !== id));
    if (!supabaseReady) return true;
    const supabase = getSupabase();
    if (!supabase) return true;
    const { error } = await supabase.from('orders').delete().eq('id', id);
    if (error) { showToast(`Supabase: ${error.message}`); return false; }
    return true;
  }, [setAllOrders]);

  const clearAllOrders = useCallback(async () => {
    setAllOrders([]);
    if (supabaseReady) {
      const supabase = getSupabase();
      if (!supabase) return;
      const { error } = await supabase.from('orders').delete().neq('id', '');
      if (error) { showToast(`Supabase: ${error.message}`); return; }
    }
  }, [setAllOrders]);

  return { orders, loaded, connection, addOrder, updateOrder, assignItems, saveEditedOrder, deleteOrder, clearAllOrders, refreshOrders, toggleSound, soundEnabled };
}
