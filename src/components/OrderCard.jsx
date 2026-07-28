import { timeAgo, statusLabel, relevantItems, STATION_ICONS } from '../lib/utils.js';

export default function OrderCard({ order, station, onAction }) {
  const items = relevantItems(order, station);
  const currentStatus = station
    ? items.every(item => (item.status || order.status) === 'listo') ? 'listo'
      : items.some(item => (item.status || order.status) !== 'pendiente') ? 'preparando' : 'pendiente'
    : order.status;
  const next = currentStatus === 'pendiente' ? 'preparando'
    : currentStatus === 'preparando' ? 'listo'
    : currentStatus === 'listo' && !station ? 'entregado' : null;
  const stationIcon = station ? STATION_ICONS[station] : '';
  const actionLabel = next === 'entregado' ? 'Entregado' : next === 'preparando' ? 'Empezar' : next === 'listo' ? 'Listo' : null;
  const actionClass = next === 'entregado' ? 'btn-primary' : 'btn-secondary';
  const totalQty = items.reduce((sum, i) => sum + (Number(i.quantity) || 0), 0);

  return (
    <article className={`order-card status-${currentStatus}`}>
      <div className="order-head">
        <div>
          <span className="order-number">#{order.number}</span>
          <span className="order-qty"> ×{totalQty}</span>
          <span className="time"> · {timeAgo(order.createdAt)}</span>
          {order.customer && <span className="order-customer"> · {order.customer}</span>}
        </div>
        <span className={`badge ${currentStatus}`}>{statusLabel(currentStatus)}</span>
      </div>
      <div className="order-items">
        {items.map((item, i) => (
          <div key={i} className="item-line">
            <span className="item-icon">{stationIcon}</span>
            <span className="item-name">{item.name}</span>
            <span className="item-qty">{item.quantity}×</span>
            {item.detail && <span className="item-detail">{item.detail}</span>}
          </div>
        ))}
      </div>
      {!station && order.notes && <p className="order-notes">📝 {order.notes}</p>}
      {next && (
        <button className={`btn ${actionClass} order-action-btn`} onClick={() => onAction(order.id, next, station || null)}>
          {actionLabel}
        </button>
      )}
    </article>
  );
}
