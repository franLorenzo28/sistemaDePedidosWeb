import { useMemo } from 'react';
import { computeStock, PIZZA_SLICES_PER_PIZZA } from '../lib/stock.js';

function isLow(remaining, initial) {
  return remaining > 0 && remaining <= Math.max(3, Math.round(initial * 0.2));
}

function Chip({ label, value, initial }) {
  const out = value <= 0;
  const low = !out && isLow(value, initial);
  return (
    <div className={`stock-chip ${out ? 'out' : low ? 'low' : ''}`}>
      <span className="stock-chip-label">{label}</span>
      <strong className="stock-chip-value">{value}</strong>
    </div>
  );
}

export default function StockBar({ station, orders }) {
  const stock = useMemo(() => computeStock(orders), [orders]);

  let chips = null;
  if (station === 'panchos') {
    chips = <Chip label="Panchos" value={stock.panchos.remaining} initial={stock.panchos.initial} />;
  } else if (station === 'hamburguesas') {
    chips = (
      <>
        <Chip label="Hamburguesas" value={stock.clasicas.remaining} initial={stock.clasicas.initial} />
        <Chip label="Veggie" value={stock.veggie.remaining} initial={stock.veggie.initial} />
      </>
    );
  } else if (station === 'pizzas') {
    chips = (
      <>
        <Chip label="Enteras" value={stock.pizzas.remainingEnteras} initial={stock.pizzas.initial} />
        <Chip label="Porciones" value={stock.pizzas.remainingPorciones} initial={PIZZA_SLICES_PER_PIZZA} />
      </>
    );
  }

  if (!chips) return null;

  return (
    <div className="stock-bar">
      <span className="stock-bar-title">📦 Stock</span>
      <div className="stock-chips">{chips}</div>
    </div>
  );
}
