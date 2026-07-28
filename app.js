import { supabaseConfig } from './supabase-config.js';

const supabaseReady = Boolean(supabaseConfig.url && supabaseConfig.anonKey);
let supabase = null;
let unsubscribe = null;
let orders = [];

const stationLabels = { panchos: 'Panchos', hamburguesas: 'Hamburguesas', pizzas: 'Pizzas' };
const pizzaFlavors = ['Caprese', 'Panceta', 'Huevo', 'Aceitunas', 'Peperoni'];
const navItems = [
  ['caja', 'Caja'], ['panchos', 'Panchos'], ['hamburguesas', 'Hamburguesas'], ['pizzas', 'Pizzas'], ['entrega', 'Entrega']
];

const params = new URLSearchParams(location.search);
const view = params.get('vista') || 'caja';
const app = document.querySelector('#app');

function escapeHtml(value = '') { return String(value).replace(/[&<>'"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#039;', '"': '&quot;' }[c])); }
function showToast(message) { const toast = document.querySelector('#toast'); toast.textContent = message; toast.classList.add('show'); setTimeout(() => toast.classList.remove('show'), 2800); }
function formatTime(timestamp) { return new Date(timestamp).toLocaleTimeString('es-UY', { hour: '2-digit', minute: '2-digit' }); }
function statusLabel(status) { return ({ pendiente: 'Pendiente', preparando: 'Preparando', listo: 'Listo', entregado: 'Entregado' })[status] || status; }
function loadLocal() { try { return JSON.parse(localStorage.getItem('lobabi-orders') || '[]'); } catch { return []; } }
function saveLocal() { localStorage.setItem('lobabi-orders', JSON.stringify(orders)); }

async function setupData() {
  if (!supabaseReady) { orders = loadLocal(); return; }
  const { createClient } = await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm');
  supabase = createClient(supabaseConfig.url, supabaseConfig.anonKey);
  await refreshSupabaseOrders();
  unsubscribe = supabase.channel('orders-live').on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, refreshSupabaseOrders).subscribe();
}

async function refreshSupabaseOrders() {
  const { data, error } = await supabase.from('orders').select('*').order('created_at', { ascending: true });
  if (error) return showToast(`Supabase: ${error.message}`);
  orders = (data || []).map(row => ({ id: row.id, number: row.number, customer: row.customer, notes: row.notes, items: row.items, status: row.status, createdAt: row.created_at }));
  render();
}

async function addOrder(order) {
  if (!supabaseReady) { orders.push(order); saveLocal(); render(); return; }
  const { error } = await supabase.from('orders').insert({ id: order.id, number: order.number, customer: order.customer, notes: order.notes, items: order.items, status: order.status, created_at: order.createdAt });
  if (error) throw error;
}
async function updateOrder(id, status, station) {
  const found = orders.find(order => order.id === id);
  if (!found) return;
  if (station) found.items = found.items.map(item => item.station === station ? { ...item, status } : item);
  const itemStatuses = found.items.map(item => item.status || found.status || 'pendiente');
  found.status = itemStatuses.every(itemStatus => itemStatus === 'listo' || itemStatus === 'entregado') ? 'listo' : itemStatuses.some(itemStatus => itemStatus !== 'pendiente') ? 'preparando' : 'pendiente';
  if (!supabaseReady) { saveLocal(); render(); return; }
  const { error } = await supabase.from('orders').update({ status: found.status, items: found.items, updated_at: Date.now() }).eq('id', id);
  if (error) throw error;
}

function nav() { document.querySelector('#main-nav').innerHTML = navItems.map(([key, label]) => `<a class="nav-link ${view === key ? 'active' : ''}" href="?vista=${key}">${label}</a>`).join(''); }
function pageHeader(title, subtitle) { return `<p class="eyebrow">Grupo Scout Séptimo · Cantina</p><h1 class="page-title">${title}</h1><p class="page-subtitle">${subtitle}</p>`; }
function pizzaForm() { return `<div class="form-section"><h3>Pizza</h3><label class="field-label">Cantidad y sabor</label><div class="quantity-row"><div class="choice-grid"><div class="choice"><input id="pizza-caprese" type="checkbox" value="Caprese" /><label for="pizza-caprese">Caprese<br><small>albahaca y tomate</small></label></div><div class="choice"><input id="pizza-panceta" type="checkbox" value="Panceta" /><label for="pizza-panceta">Panceta</label></div><div class="choice"><input id="pizza-huevo" type="checkbox" value="Huevo" /><label for="pizza-huevo">Huevo</label></div><div class="choice"><input id="pizza-aceitunas" type="checkbox" value="Aceitunas" /><label for="pizza-aceitunas">Aceitunas</label></div><div class="choice"><input id="pizza-peperoni" type="checkbox" value="Peperoni" /><label for="pizza-peperoni">Peperoni</label></div></div><input id="pizza-qty" type="number" min="1" value="1" /></div><button class="btn btn-ghost full" id="add-pizza">+ Agregar pizza</button><div id="pizza-lines"></div></div>`; }
function simpleForm(type, title, options) { return `<div class="form-section"><h3>${title}</h3><label class="field-label">Producto</label><select id="${type}-product">${options.map(option => `<option>${option}</option>`).join('')}</select><label class="field-label">Cantidad</label><input id="${type}-qty" type="number" min="1" value="1" /><label class="field-label">Detalles</label><input id="${type}-detail" placeholder="Ej: con mayonesa y ketchup" /><button class="btn btn-ghost full" id="add-${type}">+ Agregar ${title.toLowerCase()}</button><div id="${type}-lines"></div></div>`; }

function renderCaja() {
  app.innerHTML = `${pageHeader('Nuevo pedido', 'Cargá los detalles desde la notebook y cada sector recibirá solamente lo que le corresponde.')}<div class="layout caja-layout"><form id="order-form" class="card caja-form"><div class="form-section"><h2>Pedido ${nextNumber()}</h2><label class="field-label">Nombre o referencia (opcional)</label><input id="customer" placeholder="Ej: mesa 4" /></div>${simpleForm('pancho', 'Panchos', ['Pancho clásico', 'Pancho especial'])}${simpleForm('hamburguesa', 'Hamburguesas', ['Hamburguesa clásica', 'Hamburguesa completa'])}${pizzaForm()}<div class="form-section"><label class="field-label">Notas generales</label><textarea id="notes" placeholder="Ej: entregar todo junto"></textarea></div><button class="btn btn-secondary full" type="submit">Enviar pedido a cocina</button></form><section><div class="stats"><div class="stat"><strong>${orders.filter(o => o.status !== 'entregado').length}</strong><span>pedidos activos</span></div><div class="stat"><strong>${orders.filter(o => o.status === 'listo').length}</strong><span>listos</span></div></div><div class="notice">${supabaseReady ? 'Conectado a Supabase: los cambios aparecen en tiempo real.' : 'Modo demostración: los pedidos se guardan en este navegador. Luego conectamos Supabase.'}</div>${renderOrderList(orders.filter(o => o.status !== 'entregado'), 'Pedidos recientes')}</section></div>`;
  const draft = { panchos: [], hamburguesas: [], pizzas: [] };
  ['pancho', 'hamburguesa'].forEach(type => document.querySelector(`#add-${type}`).addEventListener('click', e => { e.preventDefault(); const key = type === 'pancho' ? 'panchos' : 'hamburguesas'; const item = { name: document.querySelector(`#${type}-product`).value, quantity: Number(document.querySelector(`#${type}-qty`).value), detail: document.querySelector(`#${type}-detail`).value.trim() }; draft[key].push(item); document.querySelector(`#${type}-lines`).innerHTML += `<div class="item-line"><span>${item.quantity} × ${escapeHtml(item.name)}<small class="item-detail">${item.detail ? ` · ${escapeHtml(item.detail)}` : ''}</small></span><span>✓</span></div>`; }));
  document.querySelector('#add-pizza').addEventListener('click', e => { e.preventDefault(); const flavors = [...document.querySelectorAll('#order-form input[type="checkbox"]:checked')].map(input => input.value); if (!flavors.length) return showToast('Elegí al menos un sabor de pizza.'); const item = { name: `Pizza ${flavors.join(' y ')}`, quantity: Number(document.querySelector('#pizza-qty').value), detail: flavors.includes('Caprese') ? 'Albahaca y tomate' : '', status: 'pendiente' }; draft.pizzas.push(item); document.querySelector('#pizza-lines').innerHTML += `<div class="item-line"><span>${item.quantity} × ${escapeHtml(item.name)}<small class="item-detail">${item.detail}</small></span><span>✓</span></div>`; document.querySelectorAll('#order-form input[type="checkbox"]').forEach(input => input.checked = false); });
  document.querySelector('#order-form').addEventListener('submit', async e => { e.preventDefault(); const items = Object.entries(draft).flatMap(([station, list]) => list.map(item => ({ ...item, station, status: item.status || 'pendiente' }))); if (!items.length) return showToast('Agregá al menos un producto.'); const order = { id: `local-${Date.now()}`, number: nextNumber(), customer: document.querySelector('#customer').value.trim(), notes: document.querySelector('#notes').value.trim(), items, status: 'pendiente', createdAt: Date.now() }; await addOrder(order); showToast(`Pedido ${order.number} enviado a cocina.`); renderCaja(); });
}
function nextNumber() { return String((orders.reduce((max, order) => Math.max(max, Number(order.number) || 0), 0) || 0) + 1).padStart(3, '0'); }
function relevantItems(order, station) { return station ? order.items.filter(item => item.station === station) : order.items; }
function stationStatus(order, station) {
  const items = relevantItems(order, station);
  return items.every(item => (item.status || order.status) === 'listo') ? 'listo' : items.some(item => (item.status || order.status) !== 'pendiente') ? 'preparando' : 'pendiente';
}
function renderOrderList(list, title, station) {
  const filtered = list
    .filter(order => !station || order.items.some(item => item.station === station))
    .sort((a, b) => Number(a.number) - Number(b.number));
  return `<div><h2>${title}</h2><div class="order-list">${filtered.length ? filtered.map(order => renderOrderCard(order, station)).join('') : '<div class="empty">No hay pedidos para mostrar.</div>'}</div></div>`;
}
function renderOrderCard(order, station) { const items = relevantItems(order, station); const currentStatus = station ? items.every(item => (item.status || order.status) === 'listo') ? 'listo' : items.some(item => (item.status || order.status) !== 'pendiente') ? 'preparando' : 'pendiente' : order.status; const next = currentStatus === 'pendiente' ? 'preparando' : currentStatus === 'preparando' ? 'listo' : currentStatus === 'listo' && !station ? 'entregado' : null; return `<article class="order-card status-${currentStatus}"><div class="order-head"><div><div class="order-number">Pedido ${escapeHtml(order.number)}</div><div class="time">${formatTime(order.createdAt)}${order.customer ? ` · ${escapeHtml(order.customer)}` : ''}</div></div><span class="badge ${currentStatus}">${statusLabel(currentStatus)}</span></div><div>${items.map(item => `<div class="item-line"><span><span class="item-name">${item.quantity} × ${escapeHtml(item.name)}</span>${item.detail ? `<br><small class="item-detail">${escapeHtml(item.detail)}</small>` : ''}</span></div>`).join('')}</div>${!station && order.notes ? `<p class="item-detail">Nota: ${escapeHtml(order.notes)}</p>` : ''}<div class="order-actions">${next ? `<button class="btn ${next === 'entregado' ? 'btn-primary' : 'btn-secondary'}" data-action="${next}" data-station="${station || ''}" data-id="${order.id}">${next === 'entregado' ? 'Marcar entregado' : next === 'preparando' ? 'Empezar' : 'Marcar listo'}</button>` : ''}</div></article>`; }
function renderStation(station) {
  const active = orders.filter(order => order.status !== 'entregado' && order.items.some(item => item.station === station));
  const pending = active.filter(order => stationStatus(order, station) === 'pendiente');
  const preparing = active.filter(order => stationStatus(order, station) === 'preparando');
  const ready = active.filter(order => stationStatus(order, station) === 'listo');
  app.innerHTML = `${pageHeader(`Sector ${stationLabels[station]}`, `Prepará en orden los pedidos de ${stationLabels[station].toLowerCase()}. Tocá un pedido para avanzar su estado.`)}
    <div class="station-stats">
      <div class="station-stat pending"><strong>${pending.length}</strong><span>por hacer</span></div>
      <div class="station-stat preparing"><strong>${preparing.length}</strong><span>en preparación</span></div>
      <div class="station-stat ready"><strong>${ready.length}</strong><span>listos</span></div>
    </div>
    <div class="station-queue">
      ${renderOrderList(pending, 'Siguiente cola', station)}
      ${renderOrderList(preparing, 'En preparación', station)}
      ${renderOrderList(ready, 'Listos · esperando entrega', station)}
    </div>`;
  bindOrderActions();
}
function renderEntrega() { const ready = orders.filter(order => order.status === 'listo'); app.innerHTML = `${pageHeader('Entrega', 'Acá aparecen los pedidos completos que cocina marcó como listos.')}<div class="stats"><div class="stat"><strong>${ready.length}</strong><span>para entregar</span></div></div>${renderOrderList(ready, 'Pedidos listos')}`; bindOrderActions(); }
function bindOrderActions() { document.querySelectorAll('[data-action]').forEach(button => button.addEventListener('click', async () => { await updateOrder(button.dataset.id, button.dataset.action, button.dataset.station || null); showToast(`Pedido actualizado: ${statusLabel(button.dataset.action)}.`); })); }
function render() { nav(); if (view === 'caja') renderCaja(); else if (view === 'entrega') renderEntrega(); else renderStation(view); }

window.addEventListener('beforeunload', () => unsubscribe?.unsubscribe?.());
setupData().then(render);
