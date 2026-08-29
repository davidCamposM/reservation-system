# ReservaPro: instalación local

## 1. Propósito de este documento

Este documento describe cómo preparar y ejecutar ReservaPro en una máquina local. Incluye los requisitos, la configuración de variables de entorno, el inicio de PostgreSQL mediante Docker, las migraciones de Prisma, los datos semilla y las comprobaciones básicas de funcionamiento.

La guía asume que el proyecto se ejecuta desde una distribución Linux en WSL. Los comandos se deben ejecutar desde la carpeta raíz del repositorio.

## 2. Requisitos previos

Antes de instalar el proyecto, la máquina debe contar con las siguientes herramientas:

| Herramienta | Versión recomendada | Propósito |
|---|---:|---|
| Node.js | 20 o superior | Ejecutar Next.js, npm y Prisma. |
| npm | Incluido con Node.js | Instalar dependencias y ejecutar scripts. |
| Docker Desktop | Versión actual | Ejecutar PostgreSQL en un contenedor. |
| Docker Compose | Versión 2 o superior | Levantar el servicio definido en `docker-compose.yml`. |
| WSL | Ubuntu u otra distribución Linux | Ejecutar los comandos del proyecto en un entorno Linux. |
| Git | Versión actual | Clonar el repositorio y controlar versiones. |

Las versiones instaladas se pueden comprobar con los siguientes comandos:

```bash
node --version
npm --version
docker --version
docker compose version
git --version
```

> Docker Desktop debe estar iniciado y tener habilitada la integración con la distribución WSL utilizada por el proyecto.

## 3. Clonar el proyecto

1. Se debe abrir una terminal de WSL.
2. Se debe navegar a la carpeta donde se alojarán los proyectos.
3. Se debe clonar el repositorio y entrar en la carpeta creada.

```bash
cd ~/projects
git clone <URL-DEL-REPOSITORIO>
cd reservation-system
```

## 4. Instalar dependencias

Las dependencias de Node.js se instalan desde el archivo `package.json`.

```bash
npm install
```


## 5. Configurar variables de entorno

### 5.1 Crear el archivo `.env`

Se debe copiar el archivo de ejemplo incluido en el repositorio:

```bash
cp .env.example .env
```

### 5.2 Valores locales requeridos

El archivo `.env` debe contener al menos estas variables para ejecutar el MVP actual:

```env
DATABASE_URL="postgresql://reservapro:reservapro@localhost:5433/reservapro?schema=public"
NEXTAUTH_SECRET="replace-with-a-long-random-secret"
NEXTAUTH_URL="http://localhost:3000"
SEED_ADMIN_PASSWORD="Admin123!"
```

| Variable | Propósito | Uso actual |
|---|---|---|
| `DATABASE_URL` | Indica a Prisma cómo conectarse a PostgreSQL. | Obligatoria. |
| `NEXTAUTH_SECRET` | Firma la información de sesión de NextAuth. | Obligatoria para autenticación local. |
| `NEXTAUTH_URL` | Define la URL base de la aplicación. | Obligatoria para autenticación local. |
| `SEED_ADMIN_PASSWORD` | Define la contraseña de la cuenta administrativa creada por el seed. | Recomendable. |
| `RESEND_API_KEY` | Preparada para correo electrónico. | No utilizada todavía. |
| `WEBPAY_COMMERCE_CODE` | Preparada para Webpay Plus. | No utilizada todavía. |
| `WEBPAY_API_KEY` | Preparada para Webpay Plus. | No utilizada todavía. |

## 6. Iniciar PostgreSQL con Docker

El proyecto incluye el archivo `docker-compose.yml`. Este archivo define un contenedor PostgreSQL 16 llamado `reservapro-postgres`.

```bash
docker compose up -d
```


### 6.1 Configuración del contenedor

| Configuración | Valor local |
|---|---|
| Imagen | `postgres:16-alpine` |
| Nombre del contenedor | `reservapro-postgres` |
| Base de datos | `reservapro` |
| Usuario | `reservapro` |
| Contraseña local | `reservapro` |
| Puerto de PostgreSQL en WSL | `5433` |
| Puerto interno del contenedor | `5432` |

### 6.2 Verificar el contenedor

```bash
docker ps
```

La salida debe mostrar un contenedor llamado `reservapro-postgres` con estado `Up` y una asignación similar a `0.0.0.0:5433->5432/tcp`.


## 7. Preparar Prisma y la base de datos

Prisma utiliza el archivo `prisma/schema.prisma` como definición del modelo de datos. El proceso local consta de tres pasos.

### 7.1 Generar el cliente de Prisma

```bash
npm run db:generate
```

Este comando genera el cliente que la aplicación utiliza para consultar y modificar PostgreSQL.

### 7.2 Aplicar las migraciones

```bash
npm run db:migrate -- --name init
```

El comando aplica las migraciones existentes dentro de `prisma/migrations/` y sincroniza la estructura de PostgreSQL con el modelo de Prisma.


### 7.3 Cargar los datos semilla

```bash
npm run db:seed
```

El seed crea o actualiza los datos de demostración necesarios para explorar el sistema:

- Cuenta administrativa.
- Servicios iniciales.
- Profesionales iniciales.
- Relación entre servicios y profesionales.
- Jornada semanal de lunes a viernes.

Al terminar, la terminal debe mostrar un mensaje similar a:

```text
ReservaPro seed data created.
```

## 8. Iniciar la aplicación

La aplicación se inicia con Next.js en modo desarrollo:

```bash
npm run dev
```

Por defecto, Next.js utiliza el puerto `3000`. La aplicación estará disponible en:

```text
http://localhost:3000
```


### Credenciales administrativas locales

| Campo | Valor de demostración |
|---|---|
| Correo | `admin@reservapro.local` |
| Contraseña | `Admin123!` o el valor configurado en `SEED_ADMIN_PASSWORD` |

Para probar el flujo de cliente, se debe crear una cuenta nueva desde `/registro`.
