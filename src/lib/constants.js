export const STATIONS = ['panchos', 'hamburguesas', 'pizzas'];

export const STATION_LABELS = { panchos: 'Panchos', hamburguesas: 'Hamburguesas', pizzas: 'Pizzas' };

export const STATION_ICONS = { panchos: '🌭', hamburguesas: '🍔', pizzas: '🍕' };

export const PRODUCT_ICONS = { ...STATION_ICONS };

export const NAV_ITEMS = [['caja', 'Caja'], ['panchos', 'Panchos'], ['hamburguesas', 'Hamburguesas'], ['pizzas', 'Pizzas'], ['entrega', 'Entrega']];

export const LEFT_NAV_ITEMS = [['monitor', 'Monitor'], ['estadisticas', '📊 Stats']];

export function createOrderId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `local-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}
