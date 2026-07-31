import { PRODUCT_GROUPS } from '../lib/catalog.js';

export default function SoldOutManager({ soldOut, onToggle, onClose }) {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal card soldout-modal" onClick={e => e.stopPropagation()}>
        <div className="order-head">
          <h2>📦 Productos agotados</h2>
          <button type="button" className="modal-close" onClick={onClose}>×</button>
        </div>
        <p className="soldout-sub">Desactivá un producto y no podrá agregarse desde la caja hasta que lo vuelvas a activar.</p>
        {PRODUCT_GROUPS.map(group => (
          <div key={group.station} className="soldout-group">
            <h3>{group.icon} {group.label}</h3>
            <div className="soldout-grid">
              {group.items.map(item => {
                const out = Boolean(soldOut[item.id]);
                return (
                  <label key={item.id} className={`soldout-item ${out ? 'agotado' : ''}`}>
                    <input type="checkbox" checked={out} onChange={() => onToggle(item.id)} />
                    <span className="soldout-name">{item.name}</span>
                    <span className="soldout-state">{out ? 'Agotado' : 'Disponible'}</span>
                  </label>
                );
              })}
            </div>
          </div>
        ))}
        <div className="modal-actions">
          <button type="button" className="btn btn-secondary" onClick={onClose}>Listo</button>
        </div>
      </div>
    </div>
  );
}
