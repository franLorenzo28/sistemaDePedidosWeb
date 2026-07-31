import { useMemo, useCallback } from 'react';
import PageHeader from '../components/PageHeader.jsx';
import OrderCard from '../components/OrderCard.jsx';
import StockBar from '../components/StockBar.jsx';
import { STATION_LABELS, stationStatus, STATION_ICONS } from '../lib/utils.js';
import { showToast } from '../lib/toast.js';

const SECTIONS = [
  { key: 'pendiente', label: 'Por hacer', color: '#92400e', bg: '#fde68a', border: '#f59e0b' },
  { key: 'preparando', label: 'En preparación', color: '#1e3a5f', bg: '#93c5fd', border: '#3b82f6' },
  { key: 'listo', label: 'Listos', color: '#14532d', bg: '#86efac', border: '#16a34a' },
];

export default function StationView({ station, orders, onUpdate, onAssign }) {
  const active = useMemo(() => orders.filter(o => o.status !== 'entregado' && o.status !== 'cancelado' && o.items.some(item => item.station === station)), [orders, station]);
  const stationIcon = STATION_ICONS[station] || '';
  const stationLabel = STATION_LABELS[station];

  const handleAction = useCallback(async (id, action, st) => {
    await onUpdate(id, action, st);
    showToast(`Pedido actualizado: ${action === 'preparando' ? 'Preparando' : action === 'listo' ? 'Listo' : action}.`);
  }, [onUpdate]);

  const sectionOrders = useMemo(() => SECTIONS.map(s => ({
    ...s,
    orders: active
      .filter(o => stationStatus(o, station) === s.key)
      .sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0)),
  })), [active, station]);

  return (
    <div className="station-page">
      <PageHeader
        title={`${stationIcon} Sector ${stationLabel}`}
        subtitle={`Prepará en orden los pedidos de ${stationLabel.toLowerCase()}. Tocá un pedido para avanzar su estado.`}
        section={station}
      />
      <StockBar station={station} orders={orders} />
      <div className="station-queue">
        {sectionOrders.map(s => (
          <div key={s.key} className="station-section">
            <div className="station-section-header" style={{ background: s.bg, color: s.color }}>
              <h2>{s.label} <span className="section-count" style={{ color: s.color }}>{s.orders.length}</span></h2>
            </div>
            <div className="order-list">
              {s.orders.length
                ? s.orders.map(o => <OrderCard key={o.id} order={o} station={station} onAction={handleAction} onAssign={onAssign} />)
                : <div className="empty">No hay pedidos</div>
              }
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
