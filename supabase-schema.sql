create table public.orders (
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
create policy "Pedidos visibles para el equipo" on public.orders for select to anon using (true);
create policy "Caja puede crear pedidos" on public.orders for insert to anon with check (true);
create policy "Equipo puede actualizar pedidos" on public.orders for update to anon using (true) with check (true);
alter publication supabase_realtime add table public.orders;
