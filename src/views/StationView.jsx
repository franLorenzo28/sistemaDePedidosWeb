import PageHeader from '../components/PageHeader.jsx';
import OrderCard from '../components/OrderCard.jsx';
import { STATION_LABELS, stationStatus, STATION_ICONS } from '../lib/utils.js';
import { showToast } from '../hooks/useOrders.js';

const SECTIONS = [
  { key: 'pendiente', label: 'Por hacer', color: '#92400e', bg: '#fde68a', border: '#f59e0b' },
  { key: 'preparando', label: 'En preparación', color: '#1e3a5f', bg: '#93c5fd', border: '#3b82f6' },
  { key: 'listo', label: 'Listos', color: '#14532d', bg: '#86efac', border: '#16a34a' },
];

export default function StationView({ station, orders, onUpdate }) {
  const active = orders.filter(o => o.status !== 'entregado' && o.items.some(item => item.station === station));
  const stationIcon = STATION_ICONS[station] || '';
  const stationLabel = STATION_LABELS[station];

  const handleAction = async (id, action, st) => {
    await onUpdate(id, action, st);
    showToast(`Pedido actualizado: ${action === 'preparando' ? 'Preparando' : action === 'listo' ? 'Listo' : action}.`);
  };

  return (
    <>
      <PageHeader
        title={`${stationIcon} Sector ${stationLabel}`}
        subtitle={`Prepará en orden los pedidos de ${stationLabel.toLowerCase()}. Tocá un pedido para avanzar su estado.`}
      />
<div className="station-queue">
        {SECTIONS.map(s => {
          const sectionOrders = active.filter(o => stationStatus(o, station) === s.key);
          const sorted = sectionOrders
            .filter(o => o.items.some(item => item.station === station))
            .sort((a, b) => Number(a.number) - Number(b.number));
          return (
            <div key={s.key} className="station-section">
              <div className="station-section-header" style={{ background: s.bg, color: s.color }}>
                <h2>{s.label} <span className="section-count" style={{ color: s.color }}>{sorted.length}</span></h2>
              </div>
              <div className="order-list">
                {sorted.length
                  ? sorted.map(o => <OrderCard key={o.id} order={o} station={station} onAction={handleAction} />)
                  : <div className="empty">No hay pedidos</div>
                }
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
