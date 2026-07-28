import PageHeader from '../components/PageHeader.jsx';
import OrderCard from '../components/OrderCard.jsx';
import { STATION_LABELS, stationStatus } from '../lib/utils.js';
import { showToast } from '../hooks/useOrders.js';

export default function StationView({ station, orders, onUpdate }) {
  const active = orders.filter(o => o.status !== 'entregado' && o.items.some(item => item.station === station));
  const pending = active.filter(o => stationStatus(o, station) === 'pendiente');
  const preparing = active.filter(o => stationStatus(o, station) === 'preparando');
  const ready = active.filter(o => stationStatus(o, station) === 'listo');

  const handleAction = async (id, action, st) => {
    await onUpdate(id, action, st);
    showToast(`Pedido actualizado: ${action === 'preparando' ? 'Preparando' : action === 'listo' ? 'Listo' : action}.`);
  };

  return (
    <>
      <PageHeader
        title={`Sector ${STATION_LABELS[station]}`}
        subtitle={`Prepará en orden los pedidos de ${STATION_LABELS[station].toLowerCase()}. Tocá un pedido para avanzar su estado.`}
      />
      <div className="station-stats">
        <div className="station-stat pending"><strong>{pending.length}</strong><span>por hacer</span></div>
        <div className="station-stat preparing"><strong>{preparing.length}</strong><span>en preparación</span></div>
        <div className="station-stat ready"><strong>{ready.length}</strong><span>listos</span></div>
      </div>
      <div className="station-queue">
        <OrderList title="Siguiente en cola" orders={pending} station={station} onAction={handleAction} />
        <OrderList title="En preparación" orders={preparing} station={station} onAction={handleAction} />
        <OrderList title="Listos · esperando entrega" orders={ready} station={station} onAction={handleAction} />
      </div>
    </>
  );
}

function OrderList({ title, orders, station, onAction }) {
  const sorted = orders
    .filter(o => o.items.some(item => item.station === station))
    .sort((a, b) => Number(a.number) - Number(b.number));
  return (
    <div>
      <h2>{title}</h2>
      <div className="order-list">
        {sorted.length
          ? sorted.map(o => <OrderCard key={o.id} order={o} station={station} onAction={onAction} />)
          : <div className="empty">No hay pedidos para mostrar.</div>
        }
      </div>
    </div>
  );
}
