import { useState, useEffect, useRef, useCallback } from 'react';
import { useOrders } from './hooks/useOrders.js';
import { showToast } from './lib/toast.js';
import { STATIONS, STATION_ICONS, NAV_ITEMS, LEFT_NAV_ITEMS } from './lib/constants.js';
import Topbar from './components/Topbar.jsx';
import CajaView from './views/CajaView.jsx';
import StationView from './views/StationView.jsx';
import EntregaView from './views/EntregaView.jsx';
import StatsView from './views/StatsView.jsx';
import MonitorView from './views/MonitorView.jsx';
import EditModal from './components/EditModal.jsx';

function loadName() {
  try { return localStorage.getItem('lobabi-user-name') || ''; } catch { return ''; }
}
function saveName(val) { localStorage.setItem('lobabi-user-name', val); }

function playAlertSound() {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = 660;
    gain.gain.value = .08;
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + .15);
  } catch { }
}

export default function App() {
  const { orders, loaded, connection, addOrder, updateOrder, assignItems, saveEditedOrder, deleteOrder, clearAllOrders, refreshOrders, toggleSound, soundEnabled } = useOrders();
  const [view, setView] = useState(() => new URLSearchParams(location.search).get('vista') || 'caja');
  const [editingOrder, setEditingOrder] = useState(null);
  const [popupOrder, setPopupOrder] = useState(null);
  const popupTimer = useRef(null);
  const [userName, setUserName] = useState(loadName);
  const [nameInput, setNameInput] = useState('');
  const soundEnabledRef = useRef(soundEnabled);
  soundEnabledRef.current = soundEnabled;
  const lastPopupId = useRef(null);

  const [darkMode, setDarkMode] = useState(() => {
    try { return JSON.parse(localStorage.getItem('lobabi-dark-mode')) || false; } catch { return false; }
  });

  const toggleDark = useCallback(() => {
    setDarkMode(prev => {
      const next = !prev;
      localStorage.setItem('lobabi-dark-mode', JSON.stringify(next));
      return next;
    });
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = darkMode ? 'dark' : '';
  }, [darkMode]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    setView(params.get('vista') || 'caja');
  }, [location.search]);

  const handleNewOrder = useCallback((e) => {
    if (!STATIONS.includes(view)) return;
    const order = e.detail.order;
    if (lastPopupId.current === order.id) return;
    lastPopupId.current = order.id;
    setPopupOrder(order);
    if (soundEnabledRef.current) playAlertSound();
    clearTimeout(popupTimer.current);
    popupTimer.current = setTimeout(() => setPopupOrder(null), 2000);
  }, [view]);

  useEffect(() => {
    window.addEventListener('new-order-popup', handleNewOrder);
    return () => window.removeEventListener('new-order-popup', handleNewOrder);
  }, [handleNewOrder]);

  const navigate = useCallback((vista) => {
    history.pushState(null, '', `?vista=${vista}`);
    setView(vista);
  }, []);

  const handleEdit = useCallback((id) => {
    const order = orders.find(o => o.id === id);
    if (order) setEditingOrder(order);
  }, [orders]);

  const handleSaveEdit = useCallback(async (updatedOrder) => {
    await saveEditedOrder(updatedOrder);
    setEditingOrder(null);
    showToast(`Pedido ${updatedOrder.number} actualizado.`);
  }, [saveEditedOrder]);

  const handleUpdateOrder = useCallback((id, status, station) => {
    return updateOrder(id, status, station, userName);
  }, [updateOrder, userName]);

  const handleAssign = useCallback((id, station) => {
    return assignItems(id, station, userName);
  }, [assignItems, userName]);

  const handleDelete = useCallback((id) => {
    return deleteOrder(id);
  }, [deleteOrder]);

  const handleClearAll = useCallback(() => {
    clearAllOrders();
    showToast('Todos los pedidos fueron eliminados.');
  }, [clearAllOrders]);

  const stationItems = popupOrder ? popupOrder.items.filter(item => STATIONS.includes(item.station)) : [];

  const handleConfirmName = (e) => {
    e.preventDefault();
    const trimmed = nameInput.trim();
    if (!trimmed) return;
    setUserName(trimmed);
    saveName(trimmed);
  };

  if (!userName) {
    return (
      <div className="name-prompt-overlay">
        <form className="name-prompt-card" onSubmit={handleConfirmName}>
          <div className="name-prompt-icon">👋</div>
          <div className="name-prompt-title">Bienvenido</div>
          <div className="name-prompt-sub">Ingresá tu nombre para empezar</div>
          <input className="name-prompt-input" placeholder="Tu nombre..." value={nameInput} onChange={e => setNameInput(e.target.value)} autoFocus />
          <button className="btn btn-secondary name-prompt-btn" type="submit" disabled={!nameInput.trim()}>Ingresar</button>
        </form>
      </div>
    );
  }

  if (!loaded && connection !== 'local') {
    return <LoadingScreen connection={connection} onRetry={refreshOrders} />;
  }

  return (
    <>
      <Topbar view={view} onNavigate={navigate} items={NAV_ITEMS} leftItems={LEFT_NAV_ITEMS} soundEnabled={soundEnabled} onToggleSound={toggleSound} userName={userName} darkMode={darkMode} onToggleDark={toggleDark} connection={connection} />
      <main className="app-shell">
        {view === 'caja' && <CajaView orders={orders} addOrder={addOrder} onEdit={handleEdit} onUpdate={handleUpdateOrder} onDelete={handleDelete} onClearAll={handleClearAll} onAssign={handleAssign} />}
        {view === 'monitor' && <MonitorView orders={orders} />}
        {view === 'entrega' && <EntregaView orders={orders} onUpdate={handleUpdateOrder} />}
        {view === 'estadisticas' && <StatsView orders={orders} />}
        {STATIONS.includes(view) && <StationView station={view} orders={orders} onUpdate={handleUpdateOrder} onAssign={handleAssign} userName={userName} />}
      </main>
      {editingOrder && (
        <EditModal order={editingOrder} onSave={handleSaveEdit} onClose={() => setEditingOrder(null)} />
      )}
      {popupOrder && (
        <div className="popup-overlay" onClick={() => setPopupOrder(null)}>
          <div className="popup-card" onClick={e => e.stopPropagation()}>
            <div className="popup-header">🔔 Nuevo pedido</div>
            <div className="popup-number">#{popupOrder.number}</div>
            {popupOrder.customer && <div className="popup-customer">{popupOrder.customer}</div>}
            <div className="popup-items">
              {stationItems.map((item, i) => (
                <div key={i} className="popup-item">
                  <span className="popup-item-icon">{STATION_ICONS[item.station]}</span>
                  <span className="popup-item-qty">{item.quantity}×</span>
                  <span className="popup-item-name">{item.name}</span>
                </div>
              ))}
            </div>
            {popupOrder.notes && <div className="popup-notes">📝 {popupOrder.notes}</div>}
          </div>
        </div>
      )}
    </>
  );
}

function LoadingScreen({ connection, onRetry }) {
  const messages = {
    connecting: 'Cargando pedidos…',
    reconnecting: 'Sin conexión con el servidor. Reconectando…',
    offline: 'Estás sin conexión. Reintentá cuando vuelvas.',
  };
  return (
    <div className="app-loading">
      <div className="loader" />
      <p>{messages[connection] || messages.connecting}</p>
      <button className="btn btn-secondary" onClick={onRetry} disabled={connection === 'connecting'}>Reintentar</button>
    </div>
  );
}
