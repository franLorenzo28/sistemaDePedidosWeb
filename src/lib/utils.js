export function escapeHtml(value = '') {
  return String(value).replace(/[&<>'"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#039;', '"': '&quot;' }[c]));
}

export function formatTime(timestamp) {
  return new Date(timestamp).toLocaleTimeString('es-UY', { hour: '2-digit', minute: '2-digit' });
}

export function timeAgo(timestamp) {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 30) return 'Hace un momento';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `Hace ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Hace ${hours}h`;
  return `Hace ${Math.floor(hours / 24)}d`;
}

export function statusLabel(status) {
  return ({ pendiente: 'Pendiente', preparando: 'Preparando', listo: 'Listo', entregado: 'Entregado' })[status] || status;
}

export function nextNumber(orders = []) {
  if (!orders || !orders.length) return '001';
  const getTime = o => typeof o.createdAt === 'number' ? o.createdAt : new Date(o.createdAt || 0).getTime() || 0;
  const latestOrder = [...orders].sort((a, b) => getTime(b) - getTime(a))[0];
  const lastNum = Number(latestOrder?.number) || 0;
  const nextNum = (lastNum % 100) + 1;
  return String(nextNum).padStart(3, '0');
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

export const STATION_ICONS = { panchos: '🌭', hamburguesas: '🍔', pizzas: '🍕' };

export const PRODUCT_ICONS = {
  panchos: '🌭',
  hamburguesas: '🍔',
  pizzas: '🍕',
};
