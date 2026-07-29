import { useState, useEffect, useRef, useCallback } from 'react';
import { useOrders, showToast } from './hooks/useOrders.js';
import Topbar from './components/Topbar.jsx';
import CajaView from './views/CajaView.jsx';
import StationView from './views/StationView.jsx';
import EntregaView from './views/EntregaView.jsx';
import StatsView from './views/StatsView.jsx';
import MonitorView from './views/MonitorView.jsx';
import EditModal from './components/EditModal.jsx';

const STATIONS = ['panchos', 'hamburguesas', 'pizzas'];
const STATION_ICONS = { panchos: '🌭', hamburguesas: '🍔', pizzas: '🍕' };

const NAV_ITEMS = [
  ['caja', 'Caja'], ['monitor', 'Monitor'], ['panchos', 'Panchos'], ['hamburguesas', 'Hamburguesas'], ['pizzas', 'Pizzas'], ['entrega', 'Entrega'], ['estadisticas', '📊 Stats']
];

function loadName() {
  try { return localStorage.getItem('lobabi-user-name') || ''; } catch { return ''; }
}
function saveName(val) { localStorage.setItem('lobabi-user-name', val); }

function playAlertSound(duration = 3) {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = 660;
    gain.gain.value = .1;
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);
    osc.stop(ctx.currentTime + duration);
  } catch { }
}

export default function App() {
  const { orders, addOrder, updateOrder, saveEditedOrder, deleteOrder, clearAllOrders, toggleSound, soundEnabled } = useOrders();
  const [view, setView] = useState(() => new URLSearchParams(location.search).get('vista') || 'caja');
  const [editingOrder, setEditingOrder] = useState(null);
  const [popupOrder, setPopupOrder] = useState(null);
  const popupTimer = useRef(null);
  const [userName, setUserName] = useState(loadName);
  const [nameInput, setNameInput] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    setView(params.get('vista') || 'caja');
  }, [location.search]);

  const handleNewOrder = useCallback((e) => {
    if (!STATIONS.includes(view)) return;
    const order = e.detail.order;
    setPopupOrder(order);
    if (soundEnabled) playAlertSound(3);
    clearTimeout(popupTimer.current);
    popupTimer.current = setTimeout(() => setPopupOrder(null), 3000);
  }, [view, soundEnabled]);

  useEffect(() => {
    window.addEventListener('new-order-popup', handleNewOrder);
    return () => window.removeEventListener('new-order-popup', handleNewOrder);
  }, [handleNewOrder]);

  const navigate = (vista) => {
    history.pushState(null, '', `?vista=${vista}`);
    setView(vista);
  };

  const handleEdit = (id) => {
    const order = orders.find(o => o.id === id);
    if (order) setEditingOrder(order);
  };

  const handleSaveEdit = async (updatedOrder) => {
    await saveEditedOrder(updatedOrder);
    setEditingOrder(null);
    showToast(`Pedido ${updatedOrder.number} actualizado.`);
  };

  const handleUpdateOrder = (id, status, station) => {
    updateOrder(id, status, station, userName);
  };

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

  return (
    <>
      <Topbar view={view} onNavigate={navigate} items={NAV_ITEMS} soundEnabled={soundEnabled} onToggleSound={toggleSound} userName={userName} />
      <main className="app-shell">
        {view === 'caja' && <CajaView orders={orders} addOrder={addOrder} onEdit={handleEdit} onUpdate={handleUpdateOrder} onDelete={deleteOrder} onClearAll={clearAllOrders} />}
        {view === 'monitor' && <MonitorView orders={orders} />}
        {view === 'entrega' && <EntregaView orders={orders} onUpdate={handleUpdateOrder} />}
        {view === 'estadisticas' && <StatsView orders={orders} />}
        {STATIONS.includes(view) && <StationView station={view} orders={orders} onUpdate={handleUpdateOrder} userName={userName} />}
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