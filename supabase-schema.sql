-- Sistema de pedidos LOBABI · Supabase

create table if not exists public.orders (
  id text primary key,
  number text not null,
  customer text default '',
  notes text default '',
  items jsonb not null,
  status text not null default 'pendiente',
  created_at bigint not null,
  updated_at bigint
);

alter table public.orders enable row level security;
drop policy if exists "Pedidos visibles para el equipo" on public.orders;
create policy "Pedidos visibles para el equipo" on public.orders for select to anon using (true);
drop policy if exists "Caja puede crear pedidos" on public.orders;
create policy "Caja puede crear pedidos" on public.orders for insert to anon with check (true);
drop policy if exists "Equipo puede actualizar pedidos" on public.orders;
create policy "Equipo puede actualizar pedidos" on public.orders for update to anon using (true) with check (true);

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'orders'
  ) then
    alter publication supabase_realtime add table public.orders;
  end if;
end $$;

-- Productos agotados, sincronizados entre dispositivos (id = "estacion:nombre")
create table if not exists public.products (
  id text primary key,
  sold_out boolean not null default false,
  updated_at bigint
);

alter table public.products enable row level security;
drop policy if exists "Productos visibles para el equipo" on public.products;
create policy "Productos visibles para el equipo" on public.products for select to anon using (true);
drop policy if exists "Caja puede crear productos" on public.products;
create policy "Caja puede crear productos" on public.products for insert to anon with check (true);
drop policy if exists "Caja puede actualizar productos" on public.products;
create policy "Caja puede actualizar productos" on public.products for update to anon using (true) with check (true);

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'products'
  ) then
    alter publication supabase_realtime add table public.products;
  end if;
end $$;

-- Merge por estación: actualiza el estado de los items de una estación y
-- recalcula el estado del pedido sin pisar cambios concurrentes de otras estaciones.
create or replace function public.set_item_status(p_order_id text, p_station text, p_status text)
returns public.orders
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.orders;
  v_items jsonb;
  v_statuses jsonb;
  v_new_status text;
begin
  select * into v_order from public.orders where id = p_order_id for update;
  if v_order.id is null then
    return null;
  end if;

  select coalesce(jsonb_agg(
    case when (item ->> 'station') = p_station
         then jsonb_set(item, '{status}', to_jsonb(p_status))
         else item end
  ), '[]'::jsonb)
  into v_items
  from jsonb_array_elements(v_order.items) as item;

  select coalesce(jsonb_agg(coalesce(item ->> 'status', v_order.status, 'pendiente')), '[]'::jsonb)
  into v_statuses
  from jsonb_array_elements(v_items) as item;

  if v_order.status = 'cancelado' then
    v_new_status := 'cancelado';
  elsif not exists (select 1 from jsonb_array_elements_text(v_statuses) s where s.value <> 'entregado') then
    v_new_status := 'entregado';
  elsif not exists (select 1 from jsonb_array_elements_text(v_statuses) s where s.value not in ('listo', 'entregado')) then
    v_new_status := 'listo';
  elsif exists (select 1 from jsonb_array_elements_text(v_statuses) s where s.value <> 'pendiente') then
    v_new_status := 'preparando';
  else
    v_new_status := 'pendiente';
  end if;

  update public.orders
  set items = v_items,
      status = v_new_status,
      updated_at = (extract(epoch from now()) * 1000)::bigint
  where id = p_order_id
  returning * into v_order;

  return v_order;
end;
$$;

grant execute on function public.set_item_status(text, text, text) to anon;

-- Asigna un item a un operario sin pisar cambios concurrentes.
create or replace function public.assign_item(p_order_id text, p_station text, p_assigned_to text)
returns public.orders
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.orders;
  v_items jsonb;
begin
  select * into v_order from public.orders where id = p_order_id for update;
  if v_order.id is null then
    return null;
  end if;

  select coalesce(jsonb_agg(
    case when (item ->> 'station') = p_station and item ->> 'assignedTo' is null
         then jsonb_set(item, '{assignedTo}', to_jsonb(p_assigned_to))
         else item end
  ), '[]'::jsonb)
  into v_items
  from jsonb_array_elements(v_order.items) as item;

  update public.orders
  set items = v_items,
      updated_at = (extract(epoch from now()) * 1000)::bigint
  where id = p_order_id
  returning * into v_order;

  return v_order;
end;
$$;

grant execute on function public.assign_item(text, text, text) to anon;
