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
        {showEdit && (
          <button className="icon-btn icon-edit" title="Editar" onClick={() => onEdit(order.id)}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.83 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>
          </button>
        )}
        {order.status === 'listo' && (
          <button className="btn btn-primary compact-action-btn" onClick={() => onAction(order.id, 'entregado', null)}>
            Entregado
          </button>
        )}
        {onDelete && (
          <button className="icon-btn icon-delete" title="Eliminar" onClick={() => { if (confirm('¿Eliminar este pedido?')) onDelete(order.id); }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
          </button>
        )}
      </div>
    </div>
  );
}
