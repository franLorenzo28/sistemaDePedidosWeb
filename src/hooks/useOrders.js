import { useState, useEffect, useRef, useCallback } from 'react';
import { supabaseConfig } from '../supabase-config.js';

const supabaseReady = Boolean(supabaseConfig.url && supabaseConfig.anonKey);

function loadLocal() {
  try { return JSON.parse(localStorage.getItem('lobabi-orders') || '[]'); } catch { return []; }
}

function saveLocal(orders) {
  localStorage.setItem('lobabi-orders', JSON.stringify(orders));
}

function loadSoundPref() {
  try { return JSON.parse(localStorage.getItem('lobabi-sound') || 'true'); } catch { return true; }
}
function saveSoundPref(val) { localStorage.setItem('lobabi-sound', JSON.stringify(val)); }

export function useOrders() {
  const [orders, setOrders] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(loadSoundPref);
  const supabaseRef = useRef(null);
  const channelRef = useRef(null);
  const knownIdsRef = useRef(new Set());

  const toggleSound = useCallback((val) => {
    const next = typeof val === 'boolean' ? val : !soundEnabled;
    setSoundEnabled(next);
    saveSoundPref(next);
  }, [soundEnabled]);

  const notifyNewOrders = useCallback((nextOrders) => {
    const newOrders = loaded ? nextOrders.filter(o => !knownIdsRef.current.has(o.id)) : [];
    knownIdsRef.current = new Set(nextOrders.map(o => o.id));
    if (!loaded) { setLoaded(true); return; }
    if (!newOrders.length) return;
    const label = newOrders.length === 1 ? `Nuevo pedido ${newOrders[0].number}` : `${newOrders.length} pedidos nuevos`;
    showToast(`🔔 ${label}: revisar cocina.`);
    if (soundEnabled) {
      try {
        const ctx = new AudioContext();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.frequency.value = 880;
        gain.gain.value = .08;
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + .18);
      } catch { }
    }
    newOrders.forEach(o => {
      window.dispatchEvent(new CustomEvent('new-order-popup', { detail: { order: o } }));
    });
    document.title = `🔔 ${label} · Lobabi`;
    setTimeout(() => { document.title = 'Lobabi · Cantina'; }, 5000);
  }, [loaded, soundEnabled]);

  useEffect(() => {
    let cancel = false;
    async function init() {
      if (!supabaseReady) {
        const local = loadLocal();
        if (!cancel) { setOrders(local); setLoaded(true); }
        return;
      }
      const { createClient } = await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm');
      if (cancel) return;
      const supabase = createClient(supabaseConfig.url, supabaseConfig.anonKey);
      supabaseRef.current = supabase;

      async function refresh() {
        const { data, error } = await supabase.from('orders').select('*').order('created_at', { ascending: true });
        if (error) { showToast(`Supabase: ${error.message}`); return; }
        const mapped = (data || []).map(row => ({
          id: row.id, number: row.number, customer: row.customer, notes: row.notes,
          items: row.items, status: row.status, createdAt: row.created_at
        }));
        notifyNewOrders(mapped);
        if (!cancel) { setOrders(mapped); saveLocal(mapped); }
      }

      await refresh();
      channelRef.current = supabase.channel('orders-live')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, refresh)
        .subscribe();
    }
    init();
    return () => {
      cancel = true;
      channelRef.current?.unsubscribe?.();
    };
  }, [notifyNewOrders]);

  const addOrder = useCallback(async (order) => {
    if (!supabaseReady) {
      setOrders(prev => { const next = [...prev, order]; saveLocal(next); return next; });
      window.dispatchEvent(new CustomEvent('new-order-popup', { detail: { order } }));
      return;
    }
    const { error } = await supabaseRef.current.from('orders').insert({
      id: order.id, number: order.number, customer: order.customer,
      notes: order.notes, items: order.items, status: order.status, created_at: order.createdAt
    });
    if (error) throw error;
  }, []);

  const updateOrder = useCallback(async (id, status, station, assignedTo) => {
    setOrders(prev => {
      const found = prev.find(o => o.id === id);
      if (!found) return prev;
      let next;
      if (station) {
        const updatedItems = found.items.map(item =>
          item.station === station
            ? { ...item, status, assignedTo: item.assignedTo || (status === 'preparando' ? assignedTo : null) }
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
      if (!supabaseReady) { saveLocal(next); return next; }
      const updated = next.find(o => o.id === id);
      supabaseRef.current.from('orders')
        .update({ status: updated.status, items: updated.items, updated_at: Date.now() })
        .eq('id', id)
        .then(({ error }) => { if (error) showToast(`Supabase: ${error.message}`); });
      return next;
    });
  }, []);

  const saveEditedOrder = useCallback(async (order) => {
    setOrders(prev => {
      const next = prev.map(o => o.id === order.id ? order : o);
      if (!supabaseReady) { saveLocal(next); return next; }
      supabaseRef.current.from('orders')
        .update({ number: order.number, customer: order.customer, notes: order.notes, items: order.items, status: order.status, updated_at: Date.now() })
        .eq('id', order.id)
        .then(({ error }) => { if (error) showToast(`Supabase: ${error.message}`); });
      return next;
    });
  }, []);

  const deleteOrder = useCallback(async (id) => {
    setOrders(prev => {
      const next = prev.filter(o => o.id !== id);
      if (!supabaseReady) { saveLocal(next); return next; }
      supabaseRef.current.from('orders')
        .delete()
        .eq('id', id)
        .then(({ error }) => { if (error) showToast(`Supabase: ${error.message}`); });
      return next;
    });
  }, []);

  const clearAllOrders = useCallback(async () => {
    setOrders([]);
    if (supabaseReady && supabaseRef.current) {
      const { error } = await supabaseRef.current.from('orders').delete().neq('id', '');
      if (error) { showToast(`Supabase: ${error.message}`); return; }
    }
    saveLocal([]);
  }, []);

  return { orders, addOrder, updateOrder, saveEditedOrder, deleteOrder, clearAllOrders, toggleSound, soundEnabled };
}

function showToast(message) {
  const toast = document.querySelector('#toast');
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 2800);
}

export { showToast };
