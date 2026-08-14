# LOBABI · Sistema de pedidos

Una solución a los tickets internos digital, para que todo sea más organizado y eficaz.

## Firebase Realtime Database

El proyecto usa Firebase Realtime Database para compartir pedidos y productos agotados entre caja, cocina y entrega en tiempo real. Si no se configura Firebase, funciona en modo local usando `localStorage`.

1. Creá un proyecto en [Firebase Console](https://console.firebase.google.com/).
2. Agregá una aplicación web y copiá sus datos de configuración.
3. En Authentication > Sign-in method, habilitá `Anonymous`.
4. Creá una base Realtime Database.
5. Copiá `.env.example` como `.env.local` y completá sus valores.
6. Configurá las reglas de `database.rules.json` en Realtime Database.

Iniciá el proyecto con:

```bash
npm install
npm run dev
```
