export default function Topbar({ view, onNavigate, items, soundEnabled, onToggleSound, userName, darkMode, onToggleDark }) {
  return (
    <header className="topbar">
      <button className="icon-btn sound-toggle" onClick={onToggleDark} title={darkMode ? 'Modo claro' : 'Modo oscuro'}>{darkMode ? '☀️' : '🌙'}</button>
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
      {userName && <span className="topbar-user">👤 {userName}</span>}
      <button className="icon-btn sound-toggle" onClick={onToggleSound} title={soundEnabled ? 'Sonido activado' : 'Sonido desactivado'}>
        {soundEnabled ? '🔊' : '🔇'}
      </button>
    </header>
  );
}
