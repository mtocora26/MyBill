# MyBill

Gestor sencillo de ingresos y gastos personales. Es una PWA que funciona sin conexión y guarda los datos solo en el dispositivo, en IndexedDB. No hay servidor, cuentas ni base de datos remota. El contexto completo del producto está en `APP_CONTEXT.md`.

## Comandos

```bash
npm install          # instalar dependencias
npm run dev          # servidor de desarrollo en http://localhost:5173
npm run build        # compilación de producción en dist/
npm run preview      # servir dist/ con el service worker activo
npm test             # pruebas unitarias (Vitest)
npm run test:e2e     # pruebas de extremo a extremo (Playwright, celular y escritorio)
npm run icons        # regenerar íconos PWA desde public/favicon.svg
```

La primera vez que ejecutes las pruebas de extremo a extremo instala el navegador con `npx playwright install chromium`.

El modo sin conexión solo funciona con `npm run build` y `npm run preview`, o en producción. En `npm run dev` el service worker no está activo.

## Arquitectura

```
src/
  domain/   lógica pura: importes en enteros, fechas y periodos, reportes, CSV, respaldo JSON
  data/     Dexie sobre IndexedDB, repositorio, hooks reactivos, almacenamiento persistente
  ui/       páginas, componentes, gráficas, tema
e2e/        pruebas de Playwright
```

- **Importes.** Se guardan como enteros en unidades menores (`amountMinor`). Solo se convierten a decimales para mostrarlos.
- **Fechas.** Se guardan como texto `AAAA-MM-DD`, sin zona horaria.
- **Respaldo.** El JSON lleva `schemaVersion`. Se valida con Zod antes de restaurar y la restauración reemplaza los datos en una sola transacción.
- **CSV.** Lleva BOM UTF-8 y usa punto y coma cuando el formato regional usa coma decimal, para que Excel en español lo abra bien.
- **Moneda y decimales.** Se eligen al empezar y se bloquean cuando ya hay movimientos.
- **Pagos fijos.** Facturas, arriendo y cuotas mensuales. Pagar uno crea un gasto normal enlazado al pago fijo y al mes que cubre, así los totales siguen saliendo solo de los movimientos. El estado de cada mes se calcula en `src/domain/commitments.ts`.

La interfaz nunca accede a IndexedDB directamente, siempre pasa por `src/data/repo.ts`. Si en el futuro se agrega sincronización, se cambia esa capa.

## Despliegue en Vercel

1. Sube el repositorio a GitHub.
2. En Vercel, importa el repositorio. Detecta Vite automáticamente: comando `npm run build`, carpeta `dist`.
3. `vercel.json` ya define la reescritura a `index.html` y evita cachear `sw.js`.

Vercel solo sirve los archivos de la app. Los movimientos nunca salen del dispositivo.
# MyBill
