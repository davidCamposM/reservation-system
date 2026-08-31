import "dotenv/config";
import { defineConfig } from "prisma/config";

// Localhost puede reutilizar su conexión directa habitual; Vercel exige separar ambas variables.
if (!process.env.VERCEL && !process.env.DIRECT_URL) process.env.DIRECT_URL = process.env.DATABASE_URL;

export default defineConfig({ schema: "prisma/schema.prisma", migrations: { path: "prisma/migrations", seed: "tsx prisma/seed.ts" } });
