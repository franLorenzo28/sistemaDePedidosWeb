export default function Topbar({ view, onNavigate, items, soundEnabled, onToggleSound }) {
  return (
    <header className="topbar">
      <a className="brand" href="?vista=caja" onClick={e => { e.preventDefault(); onNavigate('caja'); }}>
        <span className="brand-mark">✦</span>
        <span>LOBABI <small>pedidos</small></span>
      </a>
      <nav className="main-nav" aria-label="Vistas">
        {items.map(([key, label]) => (
          <a
            key={key}
            className={`nav-link ${view === key ? 'active' : ''}`}
            href={`?vista=${key}`}
            onClick={e => { e.preventDefault(); onNavigate(key); }}
          >
            {label}
          </a>
        ))}
      </nav>
      <button className="icon-btn sound-toggle" onClick={onToggleSound} title={soundEnabled ? 'Sonido activado' : 'Sonido desactivado'}>
        {soundEnabled ? '🔊' : '🔇'}
      </button>
    </header>
  );
}
