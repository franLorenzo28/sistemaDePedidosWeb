import PageHeader from '../components/PageHeader.jsx';
import OrderCard from '../components/OrderCard.jsx';
import { showToast } from '../hooks/useOrders.js';

export default function EntregaView({ orders, onUpdate }) {
  const ready = orders.filter(o => o.status === 'listo');

  const handleAction = async (id, action) => {
    await onUpdate(id, action, null);
    showToast(`Pedido actualizado: Entregado.`);
  };

  return (
    <>
      <PageHeader title="Entrega" subtitle="Acá aparecen los pedidos completos que cocina marcó como listos." />
      <div className="stats">
        <div className="stat"><strong>{ready.length}</strong><span>para entregar</span></div>
      </div>
      <div>
        <h2>Pedidos listos</h2>
        <div className="order-list">
          {ready.length
            ? ready
                .sort((a, b) => Number(a.number) - Number(b.number))
                .map(o => <OrderCard key={o.id} order={o} station={null} onAction={handleAction} />)
            : <div className="empty">No hay pedidos para mostrar.</div>
          }
        </div>
      </div>
    </>
  );
}
