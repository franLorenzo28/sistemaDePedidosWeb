# LOBABI · Sistema de pedidos

Primera versión del sistema de cantina con Supabase + Vercel.

- `?vista=caja`: crear pedidos desde la notebook.
- `?vista=panchos`, `?vista=hamburguesas`, `?vista=pizzas`: cada sector ve únicamente sus productos.
- `?vista=entrega`: pedidos listos para entregar.

## Conectar Supabase

1. Crear un proyecto en Supabase.
2. Abrir el SQL Editor y ejecutar `supabase-schema.sql`.
3. Copiar la URL del proyecto y la clave pública `anon`/`publishable` en `supabase-config.js`.
4. Publicar esta carpeta en Vercel.

Sin configuración de Supabase funciona en modo demostración y guarda los pedidos en el navegador.

Para producción conviene agregar autenticación y reemplazar las políticas abiertas del prototipo por reglas que permitan escribir y actualizar solo a dispositivos autorizados.
