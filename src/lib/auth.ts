/**
 * DESCRIPCIÓN: Configuración central de autenticación de ReservaPro.
 * QUÉ HACE: Define cómo iniciar sesión con correo/contraseña y qué información guardar en la sesión.
 * PARA QUÉ SE UTILIZA: NextAuth usa este objeto en rutas API y páginas protegidas.
 */
import { compare } from "bcryptjs";
import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

/**
 * DESCRIPCIÓN: Forma esperada de las credenciales de acceso.
 * QUÉ HACE: Exige un correo válido y una contraseña de ocho caracteres o más.
 * PARA QUÉ SE UTILIZA: Rechaza solicitudes incompletas antes de consultar PostgreSQL.
 */
const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

/**
 * DESCRIPCIÓN: Opciones de NextAuth compartidas por toda la aplicación.
 * QUÉ HACE: Configura JWT, la página de acceso, el proveedor de credenciales y callbacks de sesión.
 * PARA QUÉ SE UTILIZA: Una única fuente de verdad para autenticar y autorizar usuarios.
 */
export const authOptions: NextAuthOptions = {
  // Las pruebas locales usan cookies separadas y no reemplazan la sesión habitual del desarrollador.
  ...(process.env.TEST_DATABASE_NAME?.startsWith("reservapro_test_") ? { cookies: {
    sessionToken: { name: "reservapro-test.session-token", options: { httpOnly: true, sameSite: "lax" as const, path: "/", secure: false } },
    csrfToken: { name: "reservapro-test.csrf-token", options: { httpOnly: true, sameSite: "lax" as const, path: "/", secure: false } },
    callbackUrl: { name: "reservapro-test.callback-url", options: { sameSite: "lax" as const, path: "/", secure: false } },
  } } : {}),
  // JWT guarda los datos de sesión en una cookie firmada, sin requerir una tabla adicional de sesiones.
  session: { strategy: "jwt" },

  // Si una página protegida exige login, NextAuth redirige a esta ruta.
  pages: { signIn: "/ingresar" },

  /**
   * DESCRIPCIÓN: Método de acceso por correo y contraseña.
   * QUÉ HACE: Busca al usuario y compara la contraseña enviada con su hash seguro.
   * PARA QUÉ SE UTILIZA: Permite usar las cuentas creadas en la tabla User.
   */
  providers: [
    CredentialsProvider({
      name: "Email y contraseña",
      credentials: {
        email: { label: "Correo", type: "email" },
        password: { label: "Contraseña", type: "password" },
      },

      /**
       * DESCRIPCIÓN: Verificación de credenciales durante el inicio de sesión.
       * QUÉ HACE: Valida datos, busca User por email y comprueba el hash con bcrypt.
       * PARA QUÉ SE UTILIZA: Devuelve un usuario seguro a NextAuth o null para rechazar el acceso.
       */
      async authorize(credentials) {
        const result = credentialsSchema.safeParse(credentials);
        if (!result.success) return null;

        try {
          // El correo se normaliza a minúsculas para evitar cuentas duplicadas por diferencias de mayúsculas.
          const email = result.data.email.toLowerCase();
          const user = await prisma.user.findUnique({ where: { email } });

          // passwordHash es la contraseña cifrada almacenada en PostgreSQL; nunca se devuelve al navegador.
          const hasValidPassword = user && await compare(result.data.password, user.passwordHash);
          if (!hasValidPassword || !user) return null;

          // Solo se entregan a NextAuth los datos necesarios para identificar y autorizar al usuario.
          return { id: user.id, name: user.name, email: user.email, role: user.role };
        } catch {
          // Una caída temporal de base de datos no expone detalles de infraestructura en la pantalla de acceso.
          return null;
        }
      },
    }),
  ],

  /**
   * DESCRIPCIÓN: Transformaciones de datos entre el usuario, JWT y sesión visible para la app.
   * QUÉ HACE: Copia id y rol al token, y luego desde el token hacia session.user.
   * PARA QUÉ SE UTILIZA: Las páginas pueden saber quién inició sesión y si es CUSTOMER o ADMIN.
   */
  callbacks: {
    jwt({ token, user }) {
      // user solo existe en el momento de iniciar sesión; luego el token conserva estos datos.
      if (user) {
        token.id = user.id;
        token.role = user.role;
      }

      return token;
    },

    session({ session, token }) {
      // Comprobamos los valores antes de asignarlos porque el token puede no tenerlos en una sesión inválida.
      if (session.user && token.id && token.role) {
        session.user.id = token.id;
        session.user.role = token.role;
      }

      return session;
    },
  },
};
