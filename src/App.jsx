import { useState, useEffect } from 'react';
import { useOrders, showToast } from './hooks/useOrders.js';
import Topbar from './components/Topbar.jsx';
import CajaView from './views/CajaView.jsx';
import StationView from './views/StationView.jsx';
import EntregaView from './views/EntregaView.jsx';
import EditModal from './components/EditModal.jsx';

const NAV_ITEMS = [
  ['caja', 'Caja'], ['panchos', 'Panchos'], ['hamburguesas', 'Hamburguesas'], ['pizzas', 'Pizzas'], ['entrega', 'Entrega']
];

export default function App() {
  const { orders, addOrder, updateOrder, saveEditedOrder, deleteOrder, clearAllOrders, toggleSound, soundEnabled } = useOrders();
  const [view, setView] = useState(() => new URLSearchParams(location.search).get('vista') || 'caja');
  const [editingOrder, setEditingOrder] = useState(null);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    setView(params.get('vista') || 'caja');
  }, [location.search]);

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

  return (
    <>
      <Topbar view={view} onNavigate={navigate} items={NAV_ITEMS} soundEnabled={soundEnabled} onToggleSound={toggleSound} />
      <main className="app-shell">
        {view === 'caja' && <CajaView orders={orders} addOrder={addOrder} onEdit={handleEdit} onUpdate={updateOrder} onDelete={deleteOrder} onClearAll={clearAllOrders} />}
        {view === 'entrega' && <EntregaView orders={orders} onUpdate={updateOrder} />}
        {['panchos', 'hamburguesas', 'pizzas'].includes(view) && <StationView station={view} orders={orders} onUpdate={updateOrder} />}
      </main>
      {editingOrder && (
        <EditModal order={editingOrder} onSave={handleSaveEdit} onClose={() => setEditingOrder(null)} />
      )}
    </>
  );
}
