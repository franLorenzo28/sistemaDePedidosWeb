import { memo, useState } from 'react';
import { timeAgo, statusLabel, STATION_ICONS, fmtOrderNumber } from '../lib/utils.js';
import ConfirmDialog from './ConfirmDialog.jsx';

function CompactOrder({ order, showEdit, onEdit, onAction, onDelete, onAssign }) {
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmDelivery, setConfirmDelivery] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);

  const canCancel = order.status !== 'entregado' && order.status !== 'cancelado';

  const runDelete = async () => {
    if (busy) return;
    setBusy(true);
    try { await onDelete(order.id); } finally { setBusy(false); }
  };

  const runDeliver = async () => {
    if (busy) return;
    setBusy(true);
    try { await onAction(order.id, 'entregado', null); } finally { setBusy(false); }
  };

  const runCancel = async () => {
    if (busy) return;
    setBusy(true);
    try { await onAction(order.id, 'cancelado', null); } finally { setBusy(false); }
  };

  return (
    <>
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
            <button key={st} className="btn btn-ghost compact-action-btn" onClick={() => onAssign(order.id, st)} disabled={busy}>
              {STATION_ICONS[st]} Asignarme
            </button>
          ))}
          {showEdit && (
            <button className="btn btn-ghost compact-action-btn" onClick={() => onEdit(order.id)} disabled={busy}>✏️ Editar</button>
          )}
          {order.status === 'listo' && (
            <button className="btn btn-primary compact-action-btn" onClick={() => setConfirmDelivery(true)} disabled={busy}>
              Entregado
            </button>
          )}
          {canCancel && (
            <button className="btn btn-ghost compact-action-btn compact-cancel-btn" onClick={() => setConfirmCancel(true)} disabled={busy}>
              🚫 Cancelar
            </button>
          )}
          {onDelete && (
            <button className="btn btn-ghost compact-action-btn compact-delete-btn" onClick={() => setConfirmDelete(true)} disabled={busy}>
              🗑️ Eliminar
            </button>
          )}
        </div>
      </div>
      <ConfirmDialog
        open={confirmDelete}
        title="Eliminar pedido"
        message={`¿Eliminar el pedido #${fmtOrderNumber(order.number)}? Esta acción no se puede deshacer.`}
        confirmLabel="Eliminar"
        danger
        busy={busy}
        onConfirm={() => { setConfirmDelete(false); runDelete(); }}
        onCancel={() => setConfirmDelete(false)}
      />
      <ConfirmDialog
        open={confirmDelivery}
        title="Entregar pedido"
        message={`¿Confirmás la entrega del pedido #${fmtOrderNumber(order.number)}?`}
        confirmLabel="Entregar"
        busy={busy}
        onConfirm={() => { setConfirmDelivery(false); runDeliver(); }}
        onCancel={() => setConfirmDelivery(false)}
      />
      <ConfirmDialog
        open={confirmCancel}
        title="Cancelar pedido"
        message={`¿Cancelar el pedido #${fmtOrderNumber(order.number)}? Pasara a la lista de cancelados.`}
        confirmLabel="Cancelar"
        danger
        busy={busy}
        onConfirm={() => { setConfirmCancel(false); runCancel(); }}
        onCancel={() => setConfirmCancel(false)}
      />
    </>
  );
}

export default memo(CompactOrder);
