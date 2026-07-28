import { formatTime, statusLabel } from '../lib/utils.js';

export default function CompactOrder({ order, showEdit, onEdit, onAction, onDelete }) {
  return (
    <div className="compact-order">
      <div className="compact-head">
        <span className="compact-number">#{order.number}</span>
        <span className="compact-time">{formatTime(order.createdAt)}</span>
        <span className={`badge ${order.status}`}>{statusLabel(order.status)}</span>
        {order.customer && <span className="compact-customer">{order.customer}</span>}
      </div>
      <div className="compact-items">
        {order.items.map((item, i) => (
          <div key={i} className="compact-item">
            <span className="compact-qty">{item.quantity}×</span>
            <span className="compact-name">{item.name}</span>
            {item.detail && <span className="compact-detail">{item.detail}</span>}
          </div>
        ))}
      </div>
      {order.notes && <div className="compact-note">Nota: {order.notes}</div>}
      <div className="compact-actions">
        {showEdit && <button className="btn btn-ghost compact-edit-btn" onClick={() => onEdit(order.id)}>Editar</button>}
        {order.status === 'listo' && (
          <button className="btn btn-primary compact-action-btn" onClick={() => onAction(order.id, 'entregado', null)}>
            Marcar entregado
          </button>
        )}
        {onDelete && (
          <button className="btn btn-danger compact-delete-btn" onClick={() => { if (confirm('¿Eliminar este pedido?')) onDelete(order.id); }}>
            Eliminar
          </button>
        )}
      </div>
    </div>
  );
}
