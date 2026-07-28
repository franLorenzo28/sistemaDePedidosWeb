export function escapeHtml(value = '') {
  return String(value).replace(/[&<>'"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#039;', '"': '&quot;' }[c]));
}

export function formatTime(timestamp) {
  return new Date(timestamp).toLocaleTimeString('es-UY', { hour: '2-digit', minute: '2-digit' });
}

export function statusLabel(status) {
  return ({ pendiente: 'Pendiente', preparando: 'Preparando', listo: 'Listo', entregado: 'Entregado' })[status] || status;
}

export function nextNumber(orders) {
  return String((orders.reduce((max, order) => Math.max(max, Number(order.number) || 0), 0) || 0) + 1).padStart(3, '0');
}

export function relevantItems(order, station) {
  return station ? order.items.filter(item => item.station === station) : order.items;
}

export function stationStatus(order, station) {
  const items = relevantItems(order, station);
  return items.every(item => (item.status || order.status) === 'listo') ? 'listo'
    : items.some(item => (item.status || order.status) !== 'pendiente') ? 'preparando' : 'pendiente';
}

export const STATION_LABELS = { panchos: 'Panchos', hamburguesas: 'Hamburguesas', pizzas: 'Pizzas' };
