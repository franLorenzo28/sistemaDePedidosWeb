import { formatTime, statusLabel, relevantItems, stationStatus } from '../lib/utils.js';

export default function OrderCard({ order, station, onAction, onDelete }) {
  const items = relevantItems(order, station);
  const currentStatus = station
    ? items.every(item => (item.status || order.status) === 'listo') ? 'listo'
      : items.some(item => (item.status || order.status) !== 'pendiente') ? 'preparando' : 'pendiente'
    : order.status;
  const next = currentStatus === 'pendiente' ? 'preparando'
    : currentStatus === 'preparando' ? 'listo'
    : currentStatus === 'listo' && !station ? 'entregado' : null;

  return (
    <article className={`order-card status-${currentStatus}`}>
      <div className="order-head">
        <div>
          <div className="order-number">Pedido {order.number}</div>
          <div className="time">{formatTime(order.createdAt)}{order.customer && ` · ${order.customer}`}</div>
        </div>
        <span className={`badge ${currentStatus}`}>{statusLabel(currentStatus)}</span>
      </div>
      <div>
        {items.map((item, i) => (
          <div key={i} className="item-line">
            <span>
              <span className="item-name">{item.quantity} × {item.name}</span>
              {item.detail && <><br /><small className="item-detail">{item.detail}</small></>}
            </span>
          </div>
        ))}
      </div>
      {!station && order.notes && <p className="item-detail">Nota: {order.notes}</p>}
      <div className="order-actions">
        {next && (
          <button
            className={`btn ${next === 'entregado' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => onAction(order.id, next, station || null)}
          >
            {next === 'entregado' ? 'Marcar entregado' : next === 'preparando' ? 'Empezar' : 'Marcar listo'}
          </button>
        )}
        {onDelete && (
          <button className="btn btn-danger" onClick={() => { if (confirm('¿Eliminar este pedido?')) onDelete(order.id); }}>
            Eliminar
          </button>
        )}
      </div>
    </article>
  );
}
