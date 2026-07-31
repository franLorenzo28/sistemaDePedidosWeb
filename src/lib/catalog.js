export const PANCHO_OPTIONS = ['Pancho clásico', 'Pancho completo'];
export const HAMBURGUESA_OPTIONS = ['Hamburguesa clásica', 'Hamburguesa completa', 'Hamburguesa veggie'];
export const PANCHO_INGREDIENTS = ['Mayonesa', 'Ketchup', 'Mostaza', 'Papas pay', 'Sin gustos'];
export const HAMBURGUESA_INGREDIENTS = ['Tomate', 'Lechuga', 'Mayonesa', 'Ketchup', 'Mostaza', 'Sin gustos'];
export const PIZZA_FLAVORS = [
  { value: 'Caprese', label: 'Caprese', sub: 'albahaca y tomate' },
  { value: 'Panceta', label: 'Panceta' },
  { value: 'Huevo', label: 'Huevo' },
  { value: 'Aceitunas', label: 'Aceitunas' },
  { value: 'Peperoni', label: 'Peperoni' },
  { value: 'Sin gustos', label: 'Sin gustos' },
  { value: 'Sin muzzarella', label: 'Sin muzzarella' },
];

export function productId(station, name) {
  return `${station}:${name}`;
}

export const PRODUCT_GROUPS = [
  {
    station: 'panchos',
    label: 'Panchos',
    icon: '🌭',
    items: PANCHO_OPTIONS.map(name => ({ id: productId('panchos', name), name })),
  },
  {
    station: 'hamburguesas',
    label: 'Hamburguesas',
    icon: '🍔',
    items: HAMBURGUESA_OPTIONS.map(name => ({ id: productId('hamburguesas', name), name })),
  },
  {
    station: 'pizzas',
    label: 'Pizzas',
    icon: '🍕',
    items: PIZZA_FLAVORS.map(flavor => ({ id: productId('pizzas', flavor.value), name: flavor.label })),
  },
];
