import React, { useMemo } from 'react';
import { fmtOrderNumber } from '../lib/utils.js';

const COLUMNS_CONFIG = [
  { key: 'preparando', title: 'En preparación', color: '#1e3a5f', border: '#3b82f6' },
  { key: 'listo', title: 'A entregar', color: '#14532d', border: '#16a34a' },
  { key: 'entregado', title: 'Entregados', color: '#475569', border: '#94a3b8' },
];

export default function MonitorView({ orders }) {
  const columns = useMemo(() => COLUMNS_CONFIG.map(col => ({
    ...col,
    items: orders
      .filter(o => o.status === col.key)
      .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)),
  })), [orders]);

  return (
    <div className="monitor-page">
      <div className="monitor-layout">
      {columns.map((col, i) => (
        <React.Fragment key={col.key}>
          {i > 0 && <div className="monitor-sep" />}
          <div className="monitor-col">
            <div className="monitor-col-header" style={{ borderColor: col.border }}>
              <h2 style={{ color: col.color }}>{col.title} <span className="monitor-count" style={{ background: `${col.border}22`, color: col.color }}>{col.items.length}</span></h2>
            </div>
            <div className="monitor-col-body">
              {col.items.length === 0
                ? <div className="monitor-empty">—</div>
                : col.items.map(order => (
                    <div key={order.id} className="monitor-card">
                      <div className="monitor-num">{fmtOrderNumber(order.number)}</div>
                      {order.customer && <div className="monitor-ref">{order.customer}</div>}
                    </div>
                  ))}
            </div>
          </div>
        </React.Fragment>
      ))}
      </div>
    </div>
  );
}