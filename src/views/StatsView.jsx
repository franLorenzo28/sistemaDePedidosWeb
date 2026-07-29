import PageHeader from '../components/PageHeader.jsx';
import { STATION_LABELS, STATION_ICONS } from '../lib/utils.js';

export default function StatsView({ orders }) {
  const entregados = orders.filter(o => o.status === 'entregado');

  const products = ['panchos', 'hamburguesas', 'pizzas'];
  const stats = products.map(station => {
    const items = entregados.flatMap(o =>
      o.items.filter(item => item.station === station)
    );
    const totalItems = items.reduce((sum, i) => sum + (Number(i.quantity) || 0), 0);
    const totalOrders = entregados.filter(o =>
      o.items.some(item => item.station === station)
    ).length;

    const grouped = {};
    items.forEach(item => {
      const name = item.name;
      grouped[name] = (grouped[name] || 0) + (Number(item.quantity) || 0);
    });
    const top = Object.entries(grouped).sort((a, b) => b[1] - a[1]).slice(0, 5);

    return { station, label: STATION_LABELS[station], icon: STATION_ICONS[station], totalItems, totalOrders, top };
  });

  const totalEntregados = entregados.length;
  const totalItems = entregados.reduce((sum, o) =>
    sum + o.items.reduce((s, i) => s + (Number(i.quantity) || 0), 0), 0);

  return (
    <>
      <PageHeader title="📊 Estadísticas" subtitle="Pedidos entregados por sector." />
      <div className="stats" style={{ marginBottom: 16 }}>
        <div className="stat"><strong>{totalEntregados}</strong><span>Pedidos entregados</span></div>
        <div className="stat"><strong>{totalItems}</strong><span>Productos vendidos</span></div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16 }}>
        {stats.map(s => (
          <div key={s.station} className="card">
            <h2>{s.icon} {s.label}</h2>
            <div className="stats" style={{ marginBottom: 8 }}>
              <div className="stat"><strong>{s.totalOrders}</strong><span>Pedidos</span></div>
              <div className="stat"><strong>{s.totalItems}</strong><span>Productos vendidos</span></div>
            </div>
            {s.top.length > 0 && (
              <>
                <label className="field-label">Más vendidos</label>
                <div className="delivered-list">
                  {s.top.map(([name, qty]) => (
                    <div key={name} className="delivered-item">
                      <span style={{ fontWeight: 700, flex: 1 }}>{name}</span>
                      <span style={{ fontWeight: 900, color: 'var(--green-700)' }}>{qty}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
            {s.totalOrders === 0 && <div className="empty">Sin entregados aún.</div>}
          </div>
        ))}
      </div>
    </>
  );
}