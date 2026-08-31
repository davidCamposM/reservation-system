import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { randomUUID } from "node:crypto";
import { spawn, spawnSync } from "node:child_process";
import { hash } from "bcryptjs";

/** Crea una base desechable local. Nunca ejecuta reset ni pruebas de escritura sobre la base de trabajo. */
async function main() {
  const url = new URL(process.env.DIRECT_URL || process.env.DATABASE_URL || "");
  if (!["localhost", "127.0.0.1"].includes(url.hostname)) throw new Error("Las pruebas automáticas requieren PostgreSQL local.");
  const name = `reservapro_test_${randomUUID().replaceAll("-", "")}`;
  const administrationUrl = new URL(url); administrationUrl.pathname = "/postgres";
  const administration = new PrismaClient({ datasourceUrl: administrationUrl.toString() });
  await administration.$executeRawUnsafe(`CREATE DATABASE "${name}"`);
  url.pathname = `/${name}`;
  const env = { ...process.env, DATABASE_URL: url.toString(), DIRECT_URL: url.toString(), NEXTAUTH_URL: "http://localhost:3100", NEXTAUTH_SECRET: randomUUID() + randomUUID(), RESEND_API_KEY: "", VERCEL_ENV: "", VERCEL: "", CRON_SECRET: randomUUID() + randomUUID(), NEXT_BUILD_DIR: ".test-artifacts/next", TEST_DATABASE_NAME: name, TEST_BASE_URL: "http://localhost:3100", PAYMENTS_ENABLED: "true" };
  let server: ReturnType<typeof spawn> | undefined;
  try {
    const migrate = spawnSync(process.execPath, ["node_modules/prisma/build/index.js", "migrate", "deploy"], { env, stdio: "inherit" });
    if (migrate.status !== 0) throw new Error("Falló la migración de la base temporal.");
    const fixture = new PrismaClient({ datasourceUrl: url.toString() });
    const passwordHash = await hash("Testing-only-Reserve24!", 12);
    await fixture.user.createMany({ data: [
      { id: "test-admin", name: "Admin de prueba", email: "admin@example.test", role: "ADMIN", passwordHash },
      { id: "test-customer", name: "Cliente de prueba", email: "customer@example.test", role: "CUSTOMER", passwordHash },
      { id: "test-other", name: "Otro cliente", email: "other@example.test", role: "CUSTOMER", passwordHash },
    ] });
    await fixture.$disconnect();
    server = spawn(process.execPath, ["node_modules/next/dist/bin/next", "dev", "--port", "3100"], { env, stdio: ["ignore", "pipe", "pipe"] });
    server.stdout?.on("data", (chunk) => process.stdout.write(chunk));
    server.stderr?.on("data", (chunk) => process.stderr.write(chunk));
    let ready = false;
    for (let attempt = 0; attempt < 60; attempt++) {
      if (server.exitCode !== null) throw new Error("El servidor de pruebas no pudo iniciar; comprueba el puerto 3100.");
      try { ready = (await fetch(`${env.TEST_BASE_URL}/api/health`)).ok; } catch { /* Espera acotada durante la compilación. */ }
      if (ready) break;
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
    if (!ready) throw new Error("El servidor de pruebas no respondió.");
    const tests = spawn(process.execPath, ["--import", "tsx", "--test", "--test-concurrency=1", "tests/integration/system.test.ts"], { env, stdio: "inherit" });
    const code = await new Promise<number | null>((resolve) => tests.on("exit", resolve));
    if (code !== 0) process.exitCode = 1;
    if (process.argv.includes("--serve")) {
      console.log("Servidor temporal para revisión visual: http://localhost:3100 (Ctrl+C finaliza y retira la base temporal).");
      await new Promise<void>((resolve) => { process.once("SIGINT", resolve); process.once("SIGTERM", resolve); });
    }
  } finally {
    if (server && server.exitCode === null) {
      server.kill("SIGTERM");
      await Promise.race([new Promise((resolve) => server!.once("exit", resolve)), new Promise((resolve) => setTimeout(resolve, 5000))]);
    }
    // El nombre se generó aquí y solo puede señalar la base desechable creada en esta ejecución.
    if (!/^reservapro_test_[a-f0-9]{32}$/.test(name)) throw new Error("Nombre temporal no válido.");
    await administration.$executeRawUnsafe(`DROP DATABASE "${name}" WITH (FORCE)`);
    await administration.$disconnect();
    console.log("Base temporal retirada; la base del proyecto no fue modificada por estas pruebas.");
  }
}

main().catch((error) => { console.error(error instanceof Error ? error.message : "Falló la prueba de integración."); process.exitCode = 1; });
