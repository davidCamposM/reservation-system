# ReservaPro

ReservaPro is a web-based scheduling and booking system for service businesses. It allows customers to browse services, create an account, and book an appointment based on availability. The administrator can manage the catalog, professionals, their work schedules, and bookings.

> Current status: MVP implemented through week 3.

## Problem It Solves

Businesses such as beauty centers, barbershops, psychologists, nutritionists, trainers, and independent professionals often manage appointments through WhatsApp, phone calls, or spreadsheets. This increases the risk of scheduling conflicts, lost information, and an unclear customer experience.

ReservaPro centralizes that process through:

- Service catalog with duration and price.
- Registration and sign-in.
- Customer and administrator roles.
- Professional-based scheduling.
- Weekly availability and exceptional blocks.
- Bookings protected against scheduling conflicts.
- Private “My Bookings” area.
- Administrative dashboard to operate the business.

## Implemented Features

### Week 1 — Project Foundation

- Project created with Next.js, TypeScript, and Tailwind CSS.
- PostgreSQL database managed through Prisma ORM.
- Seed data for services, professionals, schedules, and an administrator.
- Landing page, catalog, and initial visual flow.
- Environment variables for local development.

### Week 2 — Users and Administration

- Customer registration.
- Sign-in and sign-out.
- `CUSTOMER` and `ADMIN` roles.
- Role-based route protection.
- Private “My Account” area.
- Administrative dashboard.
- Service management: name, description, price, duration, and status.
- Professional management: name, biography, and status.

### Week 3 — Scheduling and Bookings

- Weekly availability per professional.
- Exceptional blocks for vacations, leave, or absences.
- Service, professional, date, and time selector.
- Time slots generated in the Chile time zone.
- Visual booking flow progress indicator.
- Protection against duplicate bookings.
- Initial booking status set to `PENDING`.
- 15-minute temporary hold for pending bookings.
- `PENDING`, `CONFIRMED`, `CANCELED`, and `COMPLETED` statuses.
- Administrative view to manage work schedules, blocks, and booking statuses.
- Additional PostgreSQL validation to prevent scheduling conflicts.

## Technologies

- **Frontend:** Next.js 15, React 19, and TypeScript.
- **Styling:** Tailwind CSS.
- **Backend:** Next.js Route Handlers.
- **Database:** PostgreSQL 16.
- **ORM:** Prisma.
- **Authentication:** NextAuth with credentials.
- **Validation:** Zod.
- **Dates and time zone:** date-fns and date-fns-tz.
- **Local containers:** Docker Compose.

## Architecture Overview

```text
Customer / Administrator
        │
        ▼
Next.js Application
├── React pages and components
├── NextAuth: sessions and roles
├── API Routes: bookings and administration
└── Prisma ORM
        │
        ▼
PostgreSQL
```

The application runs in the browser. Next.js renders the pages and exposes API routes. Prisma connects those routes to PostgreSQL to store users, services, professionals, schedules, and bookings.

## Main Routes

| Route | Description | Access |
|---|---|---|
| `/` | ReservaPro landing page | Public |
| `/catalogo` | Available services catalog | Public |
| `/registro` | Customer account creation | Public |
| `/ingresar` | Sign-in | Public |
| `/reservar` | Booking creation flow | Authenticated customer |
| `/cuenta` | Customer booking history and status | Authenticated customer |
| `/admin` | Business overview and management | Administrator |
| `/admin/agenda` | Work schedules, blocks, and booking statuses | Administrator |

## Prerequisites

Before starting the project, the following must be installed:

- Node.js 20 or later.
- npm.
- Docker Desktop with WSL integration, or Docker configured directly in WSL.
- Git.

## Local Installation

1. Clone the repository and enter the project folder.

   ```bash
   git clone <REPOSITORY-URL>
   cd reservation-system
   ```

2. Install the project dependencies.

   ```bash
   npm install
   ```

3. Create the local environment variables file from the example.

   ```bash
   cp .env.example .env
   ```

4. Start PostgreSQL with Docker Compose.

   ```bash
   docker compose up -d
   ```

5. Generate Prisma, apply migrations, and load the initial data.

   ```bash
   npm run db:generate
   npm run db:migrate -- --name init
   npm run db:seed
   ```

6. Start the application in development mode.

   ```bash
   npm run dev
   ```

7. Open the application in the browser.

   ```text
   http://localhost:3000
   ```

## Demo Credentials

The system includes an administrative account created by the seed data. This account can be used to review the administrative dashboard and scheduling configuration.

| Account Type | Email | Password |
|---|---|---|
| Administrator | `admin@reservapro.local` | `Admin123!` |

To test the customer experience, a new account must be created through the `/registro` route.

> The development administrator password can be changed through the `SEED_ADMIN_PASSWORD` variable before running `npm run db:seed`.

## Available Commands

| Command | Purpose |
|---|---|
| `npm run dev` | Starts the development environment. |
| `npm run build` | Generates the optimized production build. |
| `npm run start` | Starts the previously built version. |
| `npm run lint` | Checks code style and quality issues. |
| `npm run db:generate` | Generates the Prisma client. |
| `npm run db:migrate -- --name <name>` | Creates and applies a database migration. |
| `npm run db:seed` | Loads the initial development data. |
| `docker compose up -d` | Starts PostgreSQL in the background. |
| `docker compose down` | Stops the project containers. |

## Booking Statuses

| Status | Meaning |
|---|---|
| `PENDING` | The booking was created and temporarily holds the time slot for 15 minutes. |
| `CONFIRMED` | The administrator validated the booking. |
| `CANCELED` | The booking was canceled or expired without confirmation. |
| `COMPLETED` | The appointment was completed. |

## Implemented Security

1. Only authenticated customers can create bookings.
2. Only administrators can access `/admin` and `/admin/agenda`.
3. Each customer can only view their own bookings.
4. A pending or confirmed booking occupies the professional's time slot.
5. PostgreSQL prevents two active overlapping bookings for the same professional.
6. Exceptional blocks remove available time slots during the defined period.
7. Private keys and actual `.env` values must not be uploaded to the repository.


## Author

Developed by David Campos Muñoz. Portfolio project.

---
