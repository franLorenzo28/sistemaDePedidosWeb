import { supabaseConfig } from './supabase-config.js';

const supabaseReady = Boolean(supabaseConfig.url && supabaseConfig.anonKey);
let supabase = null;
let unsubscribe = null;
let orders = [];
let knownOrderIds = new Set();
let ordersLoaded = false;

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
function notifyNewOrders(nextOrders) { const newOrders = ordersLoaded ? nextOrders.filter(order => !knownOrderIds.has(order.id)) : []; knownOrderIds = new Set(nextOrders.map(order => order.id)); ordersLoaded = true; if (!newOrders.length) return; const label = newOrders.length === 1 ? `Nuevo pedido ${newOrders[0].number}` : `${newOrders.length} pedidos nuevos`; showToast(`🔔 ${label}: revisar cocina.`); try { const context = new AudioContext(); const oscillator = context.createOscillator(); const gain = context.createGain(); oscillator.frequency.value = 880; gain.gain.value = .08; oscillator.connect(gain); gain.connect(context.destination); oscillator.start(); oscillator.stop(context.currentTime + .18); } catch { } document.title = `🔔 ${label} · Lobabi`; setTimeout(() => { document.title = 'Lobabi · Cantina'; }, 5000); }

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
  notifyNewOrders(orders);
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
async function saveEditedOrder(order) { if (!supabaseReady) { saveLocal(); render(); return; } const { error } = await supabase.from('orders').update({ number: order.number, customer: order.customer, notes: order.notes, items: order.items, status: order.status, updated_at: Date.now() }).eq('id', order.id); if (error) throw error; }

function nav() { document.querySelector('#main-nav').innerHTML = navItems.map(([key, label]) => `<a class="nav-link ${view === key ? 'active' : ''}" href="?vista=${key}">${label}</a>`).join(''); }
function pageHeader(title, subtitle) { return `<p class="eyebrow">Rovers Südliches Dreieck · Cantina</p><h1 class="page-title">${title}</h1><p class="page-subtitle">${subtitle}</p>`; }
function pizzaForm() { return `<div class="form-section pizza-section"><h3>Pizza</h3><label class="field-label">Cantidad y sabor</label><div class="quantity-row"><div class="choice-grid"><div class="choice"><input id="pizza-caprese" type="checkbox" value="Caprese" /><label for="pizza-caprese">Caprese<br><small>albahaca y tomate</small></label></div><div class="choice"><input id="pizza-panceta" type="checkbox" value="Panceta" /><label for="pizza-panceta">Panceta</label></div><div class="choice"><input id="pizza-huevo" type="checkbox" value="Huevo" /><label for="pizza-huevo">Huevo</label></div><div class="choice"><input id="pizza-aceitunas" type="checkbox" value="Aceitunas" /><label for="pizza-aceitunas">Aceitunas</label></div><div class="choice"><input id="pizza-peperoni" type="checkbox" value="Peperoni" /><label for="pizza-peperoni">Peperoni</label></div></div><input id="pizza-qty" type="number" min="1" value="1" /></div><button class="btn btn-ghost full" id="add-pizza">+ Agregar pizza</button><div id="pizza-lines"></div></div>`; }
function simpleForm(type, title, options) { return `<div class="form-section product-section ${type}-section"><h3>${title}</h3><div class="product-controls"><div><label class="field-label">Producto</label><select id="${type}-product">${options.map(option => `<option>${option}</option>`).join('')}</select></div><div class="quantity-control"><label class="field-label">Cant.</label><input id="${type}-qty" type="number" min="1" value="1" /></div><div class="detail-control"><label class="field-label">Detalles</label><input id="${type}-detail" placeholder="Ej: mayonesa y ketchup" /></div></div><button class="btn btn-ghost full" id="add-${type}">+ Agregar ${title.toLowerCase()}</button><div id="${type}-lines"></div></div>`; }

function bindEditActions() { const cards = [...document.querySelectorAll('.caja-layout .order-card')]; const list = orders.filter(order => order.status !== 'entregado').sort((a, b) => Number(a.number) - Number(b.number)); cards.forEach((card, index) => { const order = list[index]; if (!order) return; const button = document.createElement('button'); button.className = 'btn btn-ghost'; button.textContent = 'Editar pedido'; button.dataset.editId = order.id; card.querySelector('.order-actions')?.prepend(button); }); document.querySelectorAll('[data-edit-id]').forEach(button => button.addEventListener('click', () => openEditOrder(button.dataset.editId))); }
function openEditOrder(id) { const order = orders.find(item => item.id === id); if (!order) return; document.querySelector('#edit-order-modal')?.remove(); document.body.insertAdjacentHTML('beforeend', `<div class="modal-backdrop" id="edit-order-modal"><form class="modal card" id="edit-order-form"><div class="order-head"><h2>Editar pedido ${escapeHtml(order.number)}</h2><button type="button" class="modal-close" aria-label="Cerrar">×</button></div><label class="field-label">Nombre o referencia</label><input id="edit-customer" value="${escapeHtml(order.customer || '')}" /><div class="edit-items">${order.items.map((item, index) => `<div class="edit-item"><div class="edit-item-title">${escapeHtml(item.station)} · ${escapeHtml(item.name)}</div><label class="field-label">Cantidad</label><input class="edit-quantity" type="number" min="1" value="${Number(item.quantity) || 1}" data-index="${index}" /><label class="field-label">Detalles</label><input class="edit-detail" value="${escapeHtml(item.detail || '')}" data-index="${index}" /><label class="edit-remove"><input class="edit-delete" type="checkbox" data-index="${index}" /> Quitar este producto</label></div>`).join('')}</div><label class="field-label">Notas generales</label><textarea id="edit-notes">${escapeHtml(order.notes || '')}</textarea><div class="modal-actions"><button type="button" class="btn btn-ghost modal-close">Cancelar</button><button type="submit" class="btn btn-secondary">Guardar cambios</button></div></form></div>`); const modal = document.querySelector('#edit-order-modal'); modal.querySelectorAll('.modal-close').forEach(button => button.addEventListener('click', () => modal.remove())); modal.querySelector('form').addEventListener('submit', async event => { event.preventDefault(); const updatedItems = order.items.map((item, index) => ({ ...item, quantity: Number(modal.querySelector(`.edit-quantity[data-index="${index}"]`).value) || 1, detail: modal.querySelector(`.edit-detail[data-index="${index}"]`).value.trim() })).filter((_, index) => !modal.querySelector(`.edit-delete[data-index="${index}"]`).checked); if (!updatedItems.length) return showToast('El pedido debe conservar al menos un producto.'); const updated = { ...order, customer: modal.querySelector('#edit-customer').value.trim(), notes: modal.querySelector('#edit-notes').value.trim(), items: updatedItems }; try { await saveEditedOrder(updated); orders = orders.map(current => current.id === updated.id ? updated : current); modal.remove(); showToast(`Pedido ${updated.number} actualizado.`); renderCaja(); } catch (error) { showToast(`No se pudo guardar: ${error.message}`); } }); }
function renderCaja() {
  app.innerHTML = `${pageHeader('Nuevo pedido', 'Cargá los detalles desde la notebook y cada sector recibirá solamente lo que le corresponde.')}<div class="layout caja-layout"><form id="order-form" class="card caja-form"><div class="form-section"><h2>Pedido ${nextNumber()}</h2><label class="field-label">Nombre o referencia (opcional)</label><input id="customer" placeholder="Ej: mesa 4" /></div><div class="form-section product-adders"><label class="field-label">Agregar productos</label><div class="adder-buttons"><button type="button" class="btn btn-ghost adder-btn" data-section="pancho">Panchos</button><button type="button" class="btn btn-ghost adder-btn" data-section="hamburguesa">Hamburguesas</button><button type="button" class="btn btn-ghost adder-btn" data-section="pizza">Pizzas</button></div></div><div id="pancho-section" class="form-section product-section" style="display:none"><h3>Panchos</h3><div class="product-controls"><div><label class="field-label">Producto</label><select id="pancho-product"><option>Pancho clásico</option><option>Pancho especial</option></select></div><div class="quantity-control"><label class="field-label">Cant.</label><input id="pancho-qty" type="number" min="1" value="1" /></div><div class="detail-control"><label class="field-label">Detalles</label><div class="ingredient-grid"><div class="choice"><input id="pancho-mayonesa-flavor" type="checkbox" value="Mayonesa" /><label for="pancho-mayonesa-flavor">Mayonesa</label></div><div class="choice"><input id="pancho-ketchup-flavor" type="checkbox" value="Ketchup" /><label for="pancho-ketchup-flavor">Ketchup</label></div><div class="choice"><input id="pancho-mostaza-flavor" type="checkbox" value="Mostaza" /><label for="pancho-mostaza-flavor">Mostaza</label></div><div class="choice"><input id="pancho-papas-pay-flavor" type="checkbox" value="Papas pay" /><label for="pancho-papas-pay-flavor">Papas pay</label></div><div class="choice"><input id="pancho-sin-nada-flavor" type="checkbox" value="Sin nada" /><label for="pancho-sin-nada-flavor">Sin nada</label></div></div><input id="pancho-detail" placeholder="Detalle extra" /></div></div><button class="btn btn-ghost full" id="add-pancho">+ Agregar panchos</button><div id="pancho-lines"></div></div><div id="hamburguesa-section" class="form-section product-section" style="display:none"><h3>Hamburguesas</h3><div class="product-controls"><div><label class="field-label">Producto</label><select id="hamburguesa-product"><option>Hamburguesa clásica</option><option>Hamburguesa completa</option><option>Hamburguesa veggie</option></select></div><div class="quantity-control"><label class="field-label">Cant.</label><input id="hamburguesa-qty" type="number" min="1" value="1" /></div><div class="detail-control"><label class="field-label">Detalles</label><div class="ingredient-grid"><div class="choice"><input id="hamburguesa-tomate-flavor" type="checkbox" value="Tomate" /><label for="hamburguesa-tomate-flavor">Tomate</label></div><div class="choice"><input id="hamburguesa-lechuga-flavor" type="checkbox" value="Lechuga" /><label for="hamburguesa-lechuga-flavor">Lechuga</label></div><div class="choice"><input id="hamburguesa-mayonesa-flavor" type="checkbox" value="Mayonesa" /><label for="hamburguesa-mayonesa-flavor">Mayonesa</label></div><div class="choice"><input id="hamburguesa-ketchup-flavor" type="checkbox" value="Ketchup" /><label for="hamburguesa-ketchup-flavor">Ketchup</label></div><div class="choice"><input id="hamburguesa-sin-nada-flavor" type="checkbox" value="Sin nada" /><label for="hamburguesa-sin-nada-flavor">Sin nada</label></div></div><input id="hamburguesa-detail" placeholder="Detalle extra" /></div></div><button class="btn btn-ghost full" id="add-hamburguesa">+ Agregar hamburguesas</button><div id="hamburguesa-lines"></div></div><div id="pizza-section" class="form-section product-section" style="display:none"><h3>Pizza</h3><div class="product-controls"><div class="pizza-flavor-grid"><label class="field-label">Sabores</label><div class="choice-grid"><div class="choice"><input id="pizza-caprese" type="checkbox" value="Caprese" /><label for="pizza-caprese">Caprese<br><small>albahaca y tomate</small></label></div><div class="choice"><input id="pizza-panceta" type="checkbox" value="Panceta" /><label for="pizza-panceta">Panceta</label></div><div class="choice"><input id="pizza-huevo" type="checkbox" value="Huevo" /><label for="pizza-huevo">Huevo</label></div><div class="choice"><input id="pizza-aceitunas" type="checkbox" value="Aceitunas" /><label for="pizza-aceitunas">Aceitunas</label></div><div class="choice"><input id="pizza-peperoni" type="checkbox" value="Peperoni" /><label for="pizza-peperoni">Peperoni</label></div><div class="choice"><input id="pizza-sin-nada" type="checkbox" value="Sin nada" /><label for="pizza-sin-nada">Sin nada</label></div><div class="choice"><input id="pizza-sin-muzzarella" type="checkbox" value="Sin muzzarella" /><label for="pizza-sin-muzzarella">Sin muzzarella</label></div></div></div><div class="pizza-controls-row"><div class="quantity-control"><label class="field-label">Cant.</label><input id="pizza-qty" type="number" min="1" value="1" /></div><div class="detail-control"><label class="field-label">Detalles</label><input id="pizza-detail" placeholder="Ej: bien cocida" /></div></div></div><button class="btn btn-ghost full" id="add-pizza">+ Agregar pizza</button><div id="pizza-lines"></div></div><div class="form-section"><label class="field-label">Notas generales</label><textarea id="notes" placeholder="Ej: entregar todo junto"></textarea></div><button class="btn btn-secondary full" type="submit">Enviar pedido a cocina</button></form><section class="caja-sidebar"><div class="caja-sidebar-cols"><div class="caja-sidebar-left"><h2>Pedidos listos</h2><div class="compact-list">${orders.filter(o => o.status === 'listo').length ? orders.filter(o => o.status === 'listo').sort((a, b) => Number(a.number) - Number(b.number)).map(o => renderCompactOrder(o)).join('') : '<div class="empty">No hay pedidos listos.</div>'}</div>${orders.filter(o => o.status === 'entregado').length ? `<div class="delivered-section"><h3>Entregados</h3><div class="delivered-list">${orders.filter(o => o.status === 'entregado').sort((a, b) => Number(b.number) - Number(a.number)).slice(0, 10).map(o => `<div class="delivered-item"><span class="delivered-number">#${escapeHtml(o.number)}</span><span class="delivered-customer">${escapeHtml(o.customer || 'Sin nombre')}</span><span class="delivered-time">${formatTime(o.createdAt)}</span></div>`).join('')}</div></div>` : ''}</div><div class="caja-sidebar-right"><h2>Pedidos en cocina</h2><div class="compact-list">${orders.filter(o => o.status !== 'entregado' && o.status !== 'listo').length ? orders.filter(o => o.status !== 'entregado' && o.status !== 'listo').sort((a, b) => Number(a.number) - Number(b.number)).map(o => renderCompactOrder(o)).join('') : '<div class="empty">No hay pedidos en cocina.</div>'}</div></div></div></section></div>`;
  bindEditActions();
  const draft = { panchos: [], hamburguesas: [], pizzas: [] };

  document.querySelectorAll('.adder-btn').forEach(btn => {
    btn.addEventListener('click', e => {
      e.preventDefault();
      const section = document.getElementById(`${btn.dataset.section}-section`);
      section.style.display = section.style.display === 'none' ? '' : 'none';
      if (section.style.display !== 'none') section.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });
  });

  function collapseSection(type, label) {
    document.getElementById(`${type}-section`).style.display = 'none';
    showToast(`${label} agregado.`);
  }

  ['pancho', 'hamburguesa'].forEach(type => {
    document.querySelector(`#add-${type}`).addEventListener('click', e => {
      e.preventDefault();
      const key = type === 'pancho' ? 'panchos' : 'hamburguesas';
      const ingredients = [...document.querySelectorAll(`#${type}-section .ingredient-grid input:checked`)].map(i => i.value);
      const extra = document.querySelector(`#${type}-detail`).value.trim();
      const detail = [...ingredients, extra].filter(Boolean).join(', ');
      const item = { name: document.querySelector(`#${type}-product`).value, quantity: Number(document.querySelector(`#${type}-qty`).value), detail };
      draft[key].push(item);
      document.querySelector(`#${type}-lines`).innerHTML += `<div class="item-line"><span>${item.quantity} × ${escapeHtml(item.name)}${item.detail ? `<small class="item-detail"> · ${escapeHtml(item.detail)}</small>` : ''}</span><span>✓</span></div>`;
      document.querySelectorAll(`#${type}-section .ingredient-grid input`).forEach(i => i.checked = false);
      document.querySelector(`#${type}-detail`).value = '';
      collapseSection(type, key === 'panchos' ? 'Panchos' : 'Hamburguesas');
    });
  });

  document.querySelector('#hamburguesa-product').addEventListener('change', event => {
    const complete = event.target.value.toLowerCase().includes('completa');
    document.querySelectorAll('#hamburguesa-section .ingredient-grid input').forEach(i => { i.checked = complete && i.value !== 'Sin nada'; });
  });

  document.querySelector('#add-pizza').addEventListener('click', e => {
    e.preventDefault();
    const flavors = [...document.querySelectorAll('#pizza-section input[type="checkbox"]:checked')].map(cb => cb.value);
    if (!flavors.length) return showToast('Elegí al menos un sabor de pizza.');
    const baseFlavors = flavors.filter(f => f !== 'Sin muzzarella');
    const allowedMix = baseFlavors.length === 2 && baseFlavors.every(f => ['Panceta', 'Huevo'].includes(f));
    if (baseFlavors.includes('Sin nada') && flavors.length > 1 || baseFlavors.length > 1 && !allowedMix) return showToast('Elegí un solo sabor, o combiná Panceta + Huevo.');
    const extra = document.querySelector('#pizza-detail').value.trim();
    const detail = [baseFlavors.includes('Caprese') ? 'Albahaca y tomate' : '', flavors.includes('Sin muzzarella') ? 'Sin muzzarella' : '', extra].filter(Boolean).join(', ');
    const item = { name: `Pizza ${baseFlavors.join(' y ')}`, quantity: Number(document.querySelector('#pizza-qty').value), detail, status: 'pendiente' };
    draft.pizzas.push(item);
    document.querySelector('#pizza-lines').innerHTML += `<div class="item-line"><span>${item.quantity} × ${escapeHtml(item.name)}${item.detail ? `<small class="item-detail"> · ${escapeHtml(item.detail)}</small>` : ''}</span><span>✓</span></div>`;
    document.querySelectorAll('#pizza-section input[type="checkbox"]').forEach(i => i.checked = false);
    document.querySelector('#pizza-detail').value = '';
    collapseSection('pizza', 'Pizza');
  });

  document.querySelector('#order-form').addEventListener('submit', async e => {
    e.preventDefault();
    const items = Object.entries(draft).flatMap(([station, list]) => list.map(item => ({ ...item, station, status: item.status || 'pendiente' })));
    if (!items.length) return showToast('Agregá al menos un producto.');
    const order = { id: `local-${Date.now()}`, number: nextNumber(), customer: document.querySelector('#customer').value.trim(), notes: document.querySelector('#notes').value.trim(), items, status: 'pendiente', createdAt: Date.now() };
    await addOrder(order);
    showToast(`Pedido ${order.number} enviado a cocina.`);
    renderCaja();
  });
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
function renderCompactOrder(order) {
  const items = order.items.map(item => `${item.quantity}× ${item.name}${item.detail ? ` (${item.detail})` : ''}`).join(', ');
  return `<div class="compact-order"><span class="compact-number">#${escapeHtml(order.number)}</span><span class="compact-items">${escapeHtml(items)}</span>${order.customer ? `<span class="compact-customer">${escapeHtml(order.customer)}</span>` : ''}</div>`;
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
      ${renderOrderList(pending, 'Siguiente en cola', station)}
      ${renderOrderList(preparing, 'En preparación', station)}
      ${renderOrderList(ready, 'Listos · esperando entrega', station)}
    </div>`;
  bindOrderActions();
}
function renderEntrega() { const ready = orders.filter(order => order.status === 'listo'); app.innerHTML = `${pageHeader('Entrega', 'Acá aparecen los pedidos completos que cocina marcó como listos.')}<div class="stats"><div class="stat"><strong>${ready.length}</strong><span>para entregar</span></div></div>${renderOrderList(ready, 'Pedidos listos')}`; bindOrderActions(); }
function bindOrderActions() { document.querySelectorAll('[data-action]').forEach(button => button.addEventListener('click', async () => { await updateOrder(button.dataset.id, button.dataset.action, button.dataset.station || null); showToast(`Pedido actualizado: ${statusLabel(button.dataset.action)}.`); })); }
function render() { nav(); if (view === 'caja') renderCaja(); else if (view === 'entrega') renderEntrega(); else renderStation(view); }

window.addEventListener('beforeunload', () => unsubscribe?.unsubscribe?.());
window.addEventListener('storage', event => { if (event.key !== 'lobabi-orders') return; orders = loadLocal(); notifyNewOrders(orders); render(); });
setupData().then(render);
