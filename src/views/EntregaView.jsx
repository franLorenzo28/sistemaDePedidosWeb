import PageHeader from '../components/PageHeader.jsx';
import OrderCard from '../components/OrderCard.jsx';
import { showToast } from '../hooks/useOrders.js';

export default function EntregaView({ orders, onUpdate }) {
  const ready = orders.filter(o => o.status === 'listo');

  const handleAction = async (id) => {
    await onUpdate(id, 'entregado', null);
    showToast('Pedido actualizado: Entregado.');
  };

  return (
    <div className="entrega-page">
      <PageHeader title="🚗 Entrega" subtitle="Pedidos listos para entregar al cliente." section="entrega" />
      <div className="stats">
        <div className="stat"><strong>{ready.length}</strong><span>Para entregar</span></div>
      </div>
      <div>
        <h2>Pedidos listos</h2>
        <div className="order-list">
          {ready.length
            ? ready
                .sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0))
                .map(o => <OrderCard key={o.id} order={o} station={null} onAction={handleAction} />)
            : <div className="empty">No hay pedidos para entregar.</div>
          }
        </div>
      </div>
    </div>
  );
}
