import { timeAgo, statusLabel, STATION_ICONS, STATION_LABELS, fmtOrderNumber } from '../lib/utils.js';
import { useState } from 'react';

export default function CompactOrder({ order, showEdit, onEdit, onAction, onDelete, onAssign }) {
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  return (
    <div className="compact-order">
      <div className="compact-head">
        <span className="compact-number">Pedido #{fmtOrderNumber(order.number)}</span>
        <span className="compact-time">{timeAgo(order.createdAt)}</span>
        <span className={`badge ${order.status}`}>{statusLabel(order.status)}</span>
        {order.customer && <span className="compact-customer">Referencia: {order.customer}</span>}
        {order.items.some(i => i.assignedTo) && <span className="compact-assigned">Asignado: {order.items.find(i => i.assignedTo)?.assignedTo}</span>}
      </div>
      <div className="compact-items">
        {order.items.map((item, i) => {
          const icon = item.station && STATION_ICONS[item.station] ? STATION_ICONS[item.station] : '';
          return (
            <div key={i} className="compact-item">
              {icon && <span className="compact-item-icon">{icon}</span>}
              <span className="compact-qty">{item.quantity}×</span>
              <span className="compact-name">{item.name}</span>
              {item.detail && <span className="compact-detail">{item.detail}</span>}
            </div>
          );
        })}
      </div>
      {order.notes && <div className="compact-note">Nota: {order.notes}</div>}
      <div className="compact-actions">
        {onAssign && [...new Set(order.items.filter(i => !i.assignedTo).map(i => i.station).filter(Boolean))].map(st => (
          <button key={st} className="btn btn-ghost compact-action-btn" onClick={() => onAssign(order.id, st)}>
            {STATION_ICONS[st]} Asignarme
          </button>
        ))}
        {showEdit && (
          <button className="btn btn-ghost compact-action-btn" onClick={() => onEdit(order.id)}>✏️ Editar</button>
        )}
        {order.status === 'listo' && (
          <button className="btn btn-primary compact-action-btn" onClick={() => onAction(order.id, 'entregado', null)}>
            Entregado
          </button>
        )}
        {onDelete && (
          <>
            {deleteConfirm ? (
              <div className="delete-confirm">
                <button className="btn btn-danger compact-action-btn" onClick={() => { onDelete(order.id); setDeleteConfirm(false); }}>
                  Sí, eliminar
                </button>
                <button className="btn btn-ghost compact-action-btn" onClick={() => setDeleteConfirm(false)}>
                  Cancelar
                </button>
              </div>
            ) : (
              <button className="btn btn-ghost compact-action-btn compact-delete-btn" onClick={() => setDeleteConfirm(true)}>
                🗑️ Eliminar
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
