export const INITIAL_STOCK = {
  panchos: 80,
  hamburguesas: { clasicas: 90, veggie: 10 },
  pizzas: 80,
};

export const PIZZA_SLICES_PER_PIZZA = 4;

export function isVeggieHamburguesa(name) {
  return /veggie/i.test(name);
}

export function isPizzaEntera(name) {
  return /^pizza/i.test(name);
}

export function isPorcionPizza(name) {
  return /^porci/i.test(name);
}

function countOrders(orders) {
  const acc = {
    panchos: 0,
    hamburguesasClasicas: 0,
    hamburguesasVeggie: 0,
    pizzasEnteras: 0,
    pizzasPorciones: 0,
  };
  (orders || []).forEach(order => {
    if (order.status === 'cancelado') return;
    (order.items || []).forEach(item => {
      const qty = Number(item.quantity) || 0;
      if (item.station === 'panchos') {
        acc.panchos += qty;
      } else if (item.station === 'hamburguesas') {
        if (isVeggieHamburguesa(item.name)) acc.hamburguesasVeggie += qty;
        else acc.hamburguesasClasicas += qty;
      } else if (item.station === 'pizzas') {
        if (isPizzaEntera(item.name)) acc.pizzasEnteras += qty;
        else if (isPorcionPizza(item.name)) acc.pizzasPorciones += qty;
        else acc.pizzasEnteras += qty;
      }
    });
  });
  return acc;
}

export function computeStock(orders) {
  const used = countOrders(orders);

  const panchos = {
    initial: INITIAL_STOCK.panchos,
    consumed: used.panchos,
    remaining: INITIAL_STOCK.panchos - used.panchos,
  };

  const clasicas = {
    initial: INITIAL_STOCK.hamburguesas.clasicas,
    consumed: used.hamburguesasClasicas,
    remaining: INITIAL_STOCK.hamburguesas.clasicas - used.hamburguesasClasicas,
  };

  const veggie = {
    initial: INITIAL_STOCK.hamburguesas.veggie,
    consumed: used.hamburguesasVeggie,
    remaining: INITIAL_STOCK.hamburguesas.veggie - used.hamburguesasVeggie,
  };

  const totalPorciones = INITIAL_STOCK.pizzas * PIZZA_SLICES_PER_PIZZA
    - used.pizzasEnteras * PIZZA_SLICES_PER_PIZZA
    - used.pizzasPorciones;

  const pizzas = {
    initial: INITIAL_STOCK.pizzas,
    consumedEnteras: used.pizzasEnteras,
    consumedPorciones: used.pizzasPorciones,
    remainingEnteras: totalPorciones > 0 ? Math.floor(totalPorciones / PIZZA_SLICES_PER_PIZZA) : 0,
    remainingPorciones: totalPorciones > 0 ? totalPorciones % PIZZA_SLICES_PER_PIZZA : 0,
  };

  return { panchos, clasicas, veggie, pizzas };
}
