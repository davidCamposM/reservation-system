import { FlatCompat } from "@eslint/eslintrc";
import tsParser from "@typescript-eslint/parser";
import tsPlugin from "@typescript-eslint/eslint-plugin";

/**
 * DESCRIPCIÓN: Adaptador para la configuración oficial de ESLint de Next.js.
 * QUÉ HACE: Convierte sus reglas tradicionales al formato plano que usa ESLint 9.
 * PARA QUÉ SE UTILIZA: El análisis estático incorpora las reglas de accesibilidad y React propias de Next.js, además de las reglas de TypeScript del proyecto.
 */
const nextCompat = new FlatCompat({ baseDirectory: process.cwd() });

const eslintConfig = [
  { ignores: [".next/**", ".next-check/**", ".next-current-check/**", ".test-artifacts/**", "node_modules/**"] },
  ...nextCompat.extends("next/core-web-vitals"),
  {
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      parser: tsParser,
      parserOptions: { ecmaVersion: "latest", sourceType: "module", ecmaFeatures: { jsx: true } },
    },
    rules: {
      // La regla de TypeScript entiende tipos e interfaces; la regla base de ESLint no.
      "no-unused-vars": "off",
      "@typescript-eslint/no-unused-vars": "error",
      "no-undef": "off",
    },
    plugins: { "@typescript-eslint": tsPlugin },
  },
  {
    files: ["**/*.d.ts"],
    rules: { "no-unused-vars": "off" },
  },
];

export default eslintConfig;
