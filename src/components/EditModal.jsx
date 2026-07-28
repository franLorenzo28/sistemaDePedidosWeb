import { useState } from 'react';
import { STATION_ICONS, STATION_LABELS } from '../lib/utils.js';

export default function EditModal({ order, onSave, onClose }) {
  const [customer, setCustomer] = useState(order.customer || '');
  const [notes, setNotes] = useState(order.notes || '');
  const [items, setItems] = useState(order.items.map((item, i) => ({ ...item, index: i, delete: false })));
  const [showAdd, setShowAdd] = useState(false);
  const [newStation, setNewStation] = useState('panchos');
  const [newName, setNewName] = useState('');
  const [newQty, setNewQty] = useState(1);
  const [newDetail, setNewDetail] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    const updatedItems = items
      .filter(item => !item.delete)
      .map(item => ({ station: item.station, name: item.name, quantity: item.quantity, detail: item.detail, status: item.status }));
    onSave({ ...order, customer: customer.trim(), notes: notes.trim(), items: updatedItems });
  };

  const updateItem = (index, field, value) => {
    setItems(prev => prev.map(item => item.index === index ? { ...item, [field]: value } : item));
  };

  const handleAddItem = () => {
    if (!newName.trim()) return;
    const maxIndex = items.length ? Math.max(...items.map(i => i.index)) + 1 : 0;
    setItems(prev => [...prev, {
      station: newStation, name: newName.trim(), quantity: newQty, detail: newDetail.trim(),
      status: 'pendiente', index: maxIndex, delete: false
    }]);
    setNewName('');
    setNewQty(1);
    setNewDetail('');
    setShowAdd(false);
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <form className="modal card" onSubmit={handleSubmit} onClick={e => e.stopPropagation()}>
        <div className="order-head">
          <h2>Editar pedido {order.number}</h2>
          <button type="button" className="modal-close" onClick={onClose}>×</button>
        </div>
        <label className="field-label">Nombre o referencia</label>
        <input value={customer} onChange={e => setCustomer(e.target.value)} />
        <div className="edit-items">
          {items.map((item) => (
            <div key={item.index} className="edit-item">
              <div className="edit-item-title">{STATION_ICONS[item.station] || ''} {item.station} · {item.name}</div>
              <label className="field-label">Cantidad</label>
              <input className="edit-quantity" type="number" min="1" value={item.quantity}
                onChange={e => updateItem(item.index, 'quantity', Number(e.target.value) || 1)} />
              <label className="field-label">Detalles</label>
              <input className="edit-detail" value={item.detail || ''}
                onChange={e => updateItem(item.index, 'detail', e.target.value)} />
              <label className="edit-remove">
                <input className="edit-delete" type="checkbox" checked={item.delete}
                  onChange={e => updateItem(item.index, 'delete', e.target.checked)} />
                {' '}Quitar este producto
              </label>
            </div>
          ))}
        </div>
        {showAdd ? (
          <div className="edit-item" style={{ marginTop: 12 }}>
            <div className="edit-item-title">Nuevo producto</div>
            <label className="field-label">Sector</label>
            <select value={newStation} onChange={e => setNewStation(e.target.value)}>
              {Object.entries(STATION_LABELS).map(([key, label]) => (
                <option key={key} value={key}>{STATION_ICONS[key]} {label}</option>
              ))}
            </select>
            <label className="field-label">Nombre del producto</label>
            <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Ej: Pancho clásico" />
            <label className="field-label">Cantidad</label>
            <input type="number" min="1" value={newQty} onChange={e => setNewQty(Number(e.target.value) || 1)} />
            <label className="field-label">Detalles</label>
            <input value={newDetail} onChange={e => setNewDetail(e.target.value)} placeholder="Ej: con mayonesa y ketchup" />
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              <button type="button" className="btn btn-primary" onClick={handleAddItem}>Agregar</button>
              <button type="button" className="btn btn-ghost" onClick={() => setShowAdd(false)}>Cancelar</button>
            </div>
          </div>
        ) : (
          <button type="button" className="btn btn-ghost full" style={{ marginTop: 12 }}
            onClick={() => setShowAdd(true)}>+ Agregar producto</button>
        )}
        <label className="field-label">Notas generales</label>
        <textarea value={notes} onChange={e => setNotes(e.target.value)} />
        <div className="modal-actions">
          <button type="button" className="btn btn-ghost" onClick={onClose}>Cancelar</button>
          <button type="submit" className="btn btn-secondary">Guardar cambios</button>
        </div>
      </form>
    </div>
  );
}
