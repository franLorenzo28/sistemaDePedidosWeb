import { useState, useRef, useMemo } from 'react';
import PageHeader from '../components/PageHeader.jsx';
import CompactOrder from '../components/CompactOrder.jsx';
import ConfirmDialog from '../components/ConfirmDialog.jsx';
import SoldOutManager from '../components/SoldOutManager.jsx';
import { nextNumber, timeAgo, fmtOrderNumber } from '../lib/utils.js';
import { createOrderId } from '../lib/constants.js';
import { showToast } from '../lib/toast.js';
import { useSoldOut } from '../hooks/useSoldOut.js';
import { PANCHO_OPTIONS, PANCHO_INGREDIENTS, HAMBURGUESA_OPTIONS, HAMBURGUESA_INGREDIENTS, PIZZA_FLAVORS, productId } from '../lib/catalog.js';

const TABS = [
  { key: 'Panchos', icon: '🌭', label: 'Panchos' },
  { key: 'Hamburguesas', icon: '🍔', label: 'Hamburguesas' },
  { key: 'Pizzas', icon: '🍕', label: 'Pizzas' },
];

function ProductSection({ title, icon, children }) {
  return (
    <div className="form-section product-section">
      <h3>{icon} {title}</h3>
      {children}
    </div>
  );
}

function IngredientGrid({ id, ingredients, checked, onChange }) {
  const handleToggle = (ing) => {
    if (ing === 'Sin gustos') {
      if (checked.includes('Sin gustos')) {
        onChange([]);
      } else {
        onChange(['Sin gustos']);
      }
    } else {
      const cleanChecked = checked.filter(v => v !== 'Sin gustos');
      if (checked.includes(ing)) {
        onChange(cleanChecked.filter(v => v !== ing));
      } else {
        onChange([...cleanChecked, ing]);
      }
    }
  };

  return (
    <div className="ingredient-grid">
      {ingredients.map(ing => (
        <div key={ing} className="choice">
          <input id={`${id}-${ing}`} type="checkbox" value={ing} checked={checked.includes(ing)} onChange={() => handleToggle(ing)} />
          <label htmlFor={`${id}-${ing}`} className="pizza-flavor-label">
            <span>{ing}</span>
          </label>
        </div>
      ))}
    </div>
  );
}

export default function CajaView({ orders, addOrder, onEdit, onUpdate, onDelete, onClearAll, onAssign }) {
  const [activeTab, setActiveTab] = useState('Panchos');
  const [draft, setDraft] = useState([]);
  const [customer, setCustomer] = useState('');
  const [notes, setNotes] = useState('');
  const [manualNumber, setManualNumber] = useState(nextNumber(orders));
  const [submitting, setSubmitting] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const [showSoldOut, setShowSoldOut] = useState(false);
  const { soldOut, toggleSoldOut, isSoldOut } = useSoldOut();
  const formRef = useRef(null);

  const cooking = useMemo(() => orders
    .filter(o => o.status !== 'entregado' && o.status !== 'listo' && o.status !== 'cancelado')
    .sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0)), [orders]);
  const listos = useMemo(() => orders
    .filter(o => o.status === 'listo')
    .sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0)), [orders]);
  const entregados = useMemo(() => orders
    .filter(o => o.status === 'entregado')
    .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
    .slice(0, 10), [orders]);
  const cancelados = useMemo(() => orders
    .filter(o => o.status === 'cancelado')
    .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
    .slice(0, 10), [orders]);

  const addDraftItem = (type, name, quantity, detail, pizzaStatus) => {
    setDraft(prev => [...prev, { type, name, quantity, detail, status: pizzaStatus || 'pendiente' }]);
    showToast(`${type} agregado.`);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;
    const items = draft.map(d => {
      const station = d.type === 'Panchos' ? 'panchos' : d.type === 'Hamburguesas' ? 'hamburguesas' : 'pizzas';
      return { station, name: d.name, quantity: d.quantity, detail: d.detail, status: d.status || 'pendiente' };
    });
    if (!items.length) return showToast('Agregá al menos un producto.');
    const order = { id: createOrderId(), number: Number(manualNumber), customer: customer.trim(), notes: notes.trim(), items, status: 'pendiente', createdAt: Date.now() };
    setSubmitting(true);
    try {
      await addOrder(order);
      showToast(`Pedido ${fmtOrderNumber(order.number)} enviado a cocina.`);
      setDraft([]);
      setCustomer('');
      setNotes('');
      setManualNumber(nextNumber([...orders, order]));
    } finally {
      setSubmitting(false);
    }
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'Panchos': return <PanchoSection onAdd={addDraftItem} isSoldOut={isSoldOut} />;
      case 'Hamburguesas': return <HamburguesaSection onAdd={addDraftItem} isSoldOut={isSoldOut} />;
      case 'Pizzas': return <PizzaSection onAdd={addDraftItem} isSoldOut={isSoldOut} />;
      default: return null;
    }
  };

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ flex: 1 }}>
          <PageHeader title="Nuevo pedido" subtitle="Cargá los detalles y cada sector recibirá lo que le corresponde." section="caja" />
        </div>
        <button className="btn btn-ghost" style={{ fontSize: '.72rem', padding: '4px 10px', whiteSpace: 'nowrap' }} onClick={() => setShowSoldOut(true)}>
          📦 Agotados
        </button>
        <button className="btn btn-ghost" style={{ fontSize: '.72rem', padding: '4px 10px', whiteSpace: 'nowrap' }} onClick={() => setConfirmClear(true)}>
          🗑️ Resetear
        </button>
      </div>
      <div className="layout caja-layout">
        <form ref={formRef} className="card caja-form" onSubmit={handleSubmit}>
          <div className="form-section">
            <h2>Pedido <input className="number-input" type="number" min="1" value={manualNumber} onChange={e => setManualNumber(e.target.value)} /></h2>
            <label className="field-label">Nombre o referencia (opcional)</label>
            <input placeholder="Nombre..." value={customer} onChange={e => setCustomer(e.target.value)} />
          </div>

          <div className="product-tabs">
            {TABS.map(tab => (
              <button
                key={tab.key}
                  type="button"
                  className={`tab-btn ${activeTab === tab.key ? 'active' : ''}`}
                  onClick={() => setActiveTab(prev => prev === tab.key ? null : tab.key)}
              >
                {tab.icon} {tab.label}
              </button>
            ))}
          </div>

          {renderTabContent()}

          <div className="product-adders">
            {draft.length > 0 && (
              <div className="draft-section">
                <label className="field-label">Resumen del pedido</label>
                <div className="draft-list">
                  {draft.map((item, i) => (
                    <div key={i} className="draft-line">
                      <span className="draft-info">
                        <span className="draft-type">{item.type}</span>
                        <strong>{item.quantity}×</strong> {item.name}
                        {item.detail && <span className="draft-detail"> · {item.detail}</span>}
                      </span>
                      <button type="button" className="draft-remove" onClick={() => setDraft(prev => prev.filter((_, j) => j !== i))}>✕</button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="form-section">
            <label className="field-label">Notas generales</label>
            <textarea placeholder="Ej: entregar todo junto" value={notes} onChange={e => setNotes(e.target.value)} />
          </div>
          <button className="btn btn-secondary full" type="submit" disabled={submitting}>
            {submitting ? 'Enviando…' : 'Enviar pedido a cocina'}
          </button>
        </form>

        <section className="caja-sidebar">
          <div className="caja-sidebar-cols">
            <div className="sidebar-col">
              <h2>En preparación</h2>
              <div className="compact-list">
                {cooking.length
                  ? cooking.map(o => <CompactOrder key={o.id} order={o} showEdit={true} onEdit={onEdit} onAction={onUpdate} onDelete={onDelete} onAssign={onAssign} />)
                  : <div className="empty">No hay pedidos en cocina.</div>
                }
              </div>
            </div>
            <div className="sidebar-sep" />
            <div className="sidebar-col">
              <h2>A entregar</h2>
              <div className="compact-list">
                {listos.length
                  ? listos.map(o => <CompactOrder key={o.id} order={o} showEdit={false} onEdit={onEdit} onAction={onUpdate} onDelete={onDelete} />)
                  : <div className="empty">No hay pedidos listos.</div>
                }
              </div>
            </div>
            <div className="sidebar-sep" />
            <div className="sidebar-col">
              <h2>Entregados</h2>
              {entregados.length > 0 ? (
                <div className="delivered-list">
                  {entregados.map(o => (
                    <div key={o.id} className="delivered-item">
                      <span className="delivered-number">Pedido #{o.number}</span>
                      <span className="delivered-customer">{o.customer ? `Referencia: ${o.customer}` : 'Sin nombre'}</span>
                      <span className="delivered-time">{timeAgo(o.createdAt)}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="empty">No hay entregados.</div>
              )}
              <h2 className="cancelados-title">Cancelados</h2>
              {cancelados.length > 0 ? (
                <div className="delivered-list">
                  {cancelados.map(o => (
                    <div key={o.id} className="delivered-item delivered-cancelado">
                      <span className="delivered-number">Pedido #{o.number}</span>
                      <span className="delivered-customer">{o.customer ? `Referencia: ${o.customer}` : 'Sin nombre'}</span>
                      <span className="delivered-time">{timeAgo(o.createdAt)}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="empty">No hay cancelados.</div>
              )}
            </div>
          </div>
        </section>
      </div>
      <ConfirmDialog
        open={confirmClear}
        title="Resetear todos los pedidos"
        message="¿Seguro que querés eliminar todos los pedidos? Se perderán todos los datos y no se puede deshacer."
        confirmLabel="Sí, resetear"
        danger
        onConfirm={() => { setConfirmClear(false); onClearAll(); }}
        onCancel={() => setConfirmClear(false)}
      />
      {showSoldOut && <SoldOutManager soldOut={soldOut} onToggle={toggleSoldOut} onClose={() => setShowSoldOut(false)} />}
    </>
  );
}

function PanchoSection({ onAdd, isSoldOut }) {
  const [product, setProduct] = useState(PANCHO_OPTIONS[0]);
  const [qty, setQty] = useState('1');
  const [ingredients, setIngredients] = useState([]);
  const [extra, setExtra] = useState('');

  const handleProductChange = (val) => {
    setProduct(val);
    if (val.toLowerCase().includes('completo')) {
      setIngredients(PANCHO_INGREDIENTS.filter(i => i !== 'Sin gustos'));
    } else {
      setIngredients([]);
    }
  };

  const handleAdd = () => {
    if (isSoldOut(productId('panchos', product))) return showToast('Producto agotado.');
    const detail = [...ingredients, extra.trim()].filter(Boolean).join(', ');
    onAdd('Panchos', product, Number(qty) || 1, detail);
    setIngredients([]);
    setExtra('');
    setQty('1');
  };

  return (
    <ProductSection title="Panchos" icon="🌭">
      <div className="product-controls">
        <div>
          <label className="field-label">Producto</label>
          <select value={product} onChange={e => handleProductChange(e.target.value)}>
            {PANCHO_OPTIONS.map(o => {
              const sold = isSoldOut(productId('panchos', o));
              return <option key={o} value={o} disabled={sold}>{o}{sold ? ' (Agotado)' : ''}</option>;
            })}
          </select>
        </div>
        <div className="quantity-control">
          <label className="field-label">Cant.</label>
          <input type="number" min="1" value={qty} onChange={e => setQty(e.target.value)} />
        </div>
        <div className="detail-control">
          <label className="field-label">Gustos / Aderezos</label>
          <IngredientGrid id="pancho" ingredients={PANCHO_INGREDIENTS} checked={ingredients} onChange={setIngredients} />
          <input placeholder="Detalle extra (ej: poca mayonesa)" value={extra} onChange={e => setExtra(e.target.value)} />
        </div>
      </div>
      <button type="button" className="btn btn-ghost full" onClick={handleAdd}>+ Agregar panchos</button>
    </ProductSection>
  );
}

function HamburguesaSection({ onAdd, isSoldOut }) {
  const [product, setProduct] = useState(HAMBURGUESA_OPTIONS[0]);
  const [qty, setQty] = useState('1');
  const [ingredients, setIngredients] = useState([]);
  const [extra, setExtra] = useState('');

  const handleProductChange = (val) => {
    setProduct(val);
    if (val.toLowerCase().includes('completa')) {
      setIngredients(HAMBURGUESA_INGREDIENTS.filter(i => ['Tomate', 'Lechuga', 'Mayonesa', 'Ketchup'].includes(i)));
    } else {
      setIngredients([]);
    }
  };

  const handleAdd = () => {
    if (isSoldOut(productId('hamburguesas', product))) return showToast('Producto agotado.');
    const detail = [...ingredients, extra.trim()].filter(Boolean).join(', ');
    onAdd('Hamburguesas', product, Number(qty) || 1, detail);
    setIngredients([]);
    setExtra('');
    setQty('1');
  };

  return (
    <ProductSection title="Hamburguesas" icon="🍔">
      <div className="product-controls">
        <div>
          <label className="field-label">Producto</label>
          <select value={product} onChange={e => handleProductChange(e.target.value)}>
            {HAMBURGUESA_OPTIONS.map(o => {
              const sold = isSoldOut(productId('hamburguesas', o));
              return <option key={o} value={o} disabled={sold}>{o}{sold ? ' (Agotado)' : ''}</option>;
            })}
          </select>
        </div>
        <div className="quantity-control">
          <label className="field-label">Cant.</label>
          <input type="number" min="1" value={qty} onChange={e => setQty(e.target.value)} />
        </div>
        <div className="detail-control">
          <label className="field-label">Gustos / Aderezos</label>
          <IngredientGrid id="ham" ingredients={HAMBURGUESA_INGREDIENTS} checked={ingredients} onChange={setIngredients} />
          <input placeholder="Detalle extra (ej: bien cocida)" value={extra} onChange={e => setExtra(e.target.value)} />
        </div>
      </div>
      <button type="button" className="btn btn-ghost full" onClick={handleAdd}>+ Agregar hamburguesas</button>
    </ProductSection>
  );
}

const PIZZA_TYPE_OPTIONS = ['Porción', 'Pizza entera'];

function PizzaSection({ onAdd, isSoldOut }) {
  const [type, setType] = useState(PIZZA_TYPE_OPTIONS[0]);
  const [flavors, setFlavors] = useState([]);
  const [qty, setQty] = useState('1');
  const [extra, setExtra] = useState('');

  const toggleFlavor = (val) => {
    if (isSoldOut(productId('pizzas', val))) return showToast('Sabor agotado.');
    setFlavors(prev => {
      const next = prev.includes(val) ? prev.filter(f => f !== val) : [...prev, val];
      const baseFlavors = next.filter(f => f !== 'Sin muzzarella');
      const allowedMix = baseFlavors.length === 2 && baseFlavors.every(f => ['Panceta', 'Huevo'].includes(f));
      if (baseFlavors.includes('Sin gustos') && next.length > 1) {
        showToast('Elegí un solo sabor, o combiná Panceta + Huevo.');
        return prev;
      }
      if (baseFlavors.length > 1 && !allowedMix) {
        showToast('Elegí un solo sabor, o combiná Panceta + Huevo.');
        return prev;
      }
      return next;
    });
  };

  const handleAdd = () => {
    if (!flavors.length) return showToast('Elegí al menos un sabor de pizza.');
    const baseFlavors = flavors.filter(f => f !== 'Sin muzzarella');
    const detail = [
      baseFlavors.includes('Caprese') ? 'Albahaca y tomate' : '',
      flavors.includes('Sin muzzarella') ? 'Sin muzzarella' : '',
      extra.trim()
    ].filter(Boolean).join(', ');
    const prefix = type === 'Porción' ? 'Porción' : 'Pizza';
    onAdd('Pizzas', `${prefix} ${baseFlavors.join(' y ')}`, Number(qty) || 1, detail, 'pendiente');
    setFlavors([]);
    setExtra('');
    setQty('1');
  };

  return (
    <ProductSection title="Pizzas" icon="🍕">
      <div className="product-controls">
        <div>
          <label className="field-label">Tipo</label>
          <select value={type} onChange={e => setType(e.target.value)}>
            {PIZZA_TYPE_OPTIONS.map(o => <option key={o}>{o}</option>)}
          </select>
        </div>
        <div className="quantity-control">
          <label className="field-label">Cant.</label>
          <input type="number" min="1" value={qty} onChange={e => setQty(e.target.value)} />
        </div>
        <div className="detail-control">
          <label className="field-label">Sabores</label>
          <div className="ingredient-grid">
            {PIZZA_FLAVORS.map(f => {
              const sold = isSoldOut(productId('pizzas', f.value));
              return (
                <div key={f.value} className={`choice ${sold ? 'agotado' : ''}`}>
                  <input id={`pizza-${f.value}`} type="checkbox" value={f.value}
                    checked={flavors.includes(f.value)} disabled={sold} onChange={() => toggleFlavor(f.value)} />
                  <label htmlFor={`pizza-${f.value}`} className="pizza-flavor-label">
                    <span>{f.label}</span>
                    {f.sub && <span className="pizza-flavor-sub">{f.sub}</span>}
                  </label>
                </div>
              );
            })}
          </div>
          <input placeholder="Detalle extra" value={extra} onChange={e => setExtra(e.target.value)} />
        </div>
      </div>
      <button type="button" className="btn btn-ghost full" onClick={handleAdd}>+ Agregar pizza</button>
    </ProductSection>
  );
}
