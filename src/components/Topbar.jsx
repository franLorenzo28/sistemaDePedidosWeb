import { useState } from 'react';

export default function Topbar({ view, onNavigate, items, leftItems, soundEnabled, onToggleSound, userName, darkMode, onToggleDark }) {
  const [menuOpen, setMenuOpen] = useState(false);

  const handleNav = (key) => {
    onNavigate(key);
    setMenuOpen(false);
  };

  return (
    <header className="topbar">
      <button className="icon-btn sound-toggle" onClick={onToggleDark} title={darkMode ? 'Modo claro' : 'Modo oscuro'}>{darkMode ? '☀️' : '🌙'}</button>
      <a className="brand" href="?vista=caja" onClick={e => { e.preventDefault(); handleNav('caja'); }}>
        <span className="brand-mark">✦</span>
        <span>LOBABI <small>pedidos</small></span>
      </a>
      {leftItems && leftItems.length > 0 && (
        <nav className="left-nav" aria-label="Vistas principales">
          {leftItems.map(([key, label]) => (
            <a key={key} className={`nav-link ${view === key ? 'active' : ''}`} href={`?vista=${key}`} onClick={e => { e.preventDefault(); handleNav(key); }}>{label}</a>
          ))}
        </nav>
      )}
      <nav className="main-nav" aria-label="Vistas">
        {items.map(([key, label]) => (
          <a key={key} className={`nav-link ${view === key ? 'active' : ''}`} href={`?vista=${key}`} onClick={e => { e.preventDefault(); handleNav(key); }}>{label}</a>
        ))}
      </nav>
      <div className="topbar-right">
        {userName && <span className="topbar-user">👤 {userName}</span>}
        <button className="icon-btn sound-toggle" onClick={onToggleSound} title={soundEnabled ? 'Sonido activado' : 'Sonido desactivado'}>{soundEnabled ? '🔊' : '🔇'}</button>
        <button className="hamburger-toggle" onClick={() => setMenuOpen(prev => !prev)} aria-label="Menú">
          <span className="hamburger-line" />
          <span className="hamburger-line" />
          <span className="hamburger-line" />
        </button>
      </div>
      {menuOpen && (
        <div className="mobile-menu">
          {[...(leftItems || []), ...items].map(([key, label]) => (
            <a key={key} className={`mobile-nav-link ${view === key ? 'active' : ''}`} href={`?vista=${key}`} onClick={e => { e.preventDefault(); handleNav(key); }}>{label}</a>
          ))}
        </div>
      )}
    </header>
  );
}

