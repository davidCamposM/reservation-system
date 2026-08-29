import tsParser from "@typescript-eslint/parser";
import tsPlugin from "@typescript-eslint/eslint-plugin";

export default [
  { ignores: [".next/**", "node_modules/**"] },
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
