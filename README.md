# ReservaPro

MVP de agenda, reservas y pagos para negocios de servicios.

## Desarrollo local

1. Iniciar PostgreSQL con `docker compose up -d`.
2. Instala dependencias con `npm install`.
3. Ejecutar `npm run db:generate`, `npm run db:migrate` y `npm run db:seed`.
4. Ejecutar `npm run dev`.

Aplicación disponible en: `http://localhost:3000`.

## Estado de Semana 1

La interfaz incluye landing, catálogo, flujo visual de reserva, acceso/registro de cliente, área de cuenta y panel administrativo. Estas vistas usan datos de demostración; la autenticación, persistencia de reservas y pagos se implementarán en las próximas semanas.
