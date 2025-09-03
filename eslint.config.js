import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";

export default [
  {
    ignores: ["dist/**", "node_modules/**"],
  },
  // Config for TypeScript files (the web part)
  {
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      globals: {
        ...globals.browser,
      },
    },
    plugins: {
      "@typescript-eslint": tseslint.plugin,
    },
    rules: {
      ...js.configs.recommended.rules,
      ...tseslint.configs.recommended.rules,
      "@typescript-eslint/no-unused-vars": "off",
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/ban-ts-comment": "off",
    },
  },
  // Config for JavaScript files (the Electron part)
  {
    files: ["main.js", "preload.js"],
    languageOptions: {
      globals: {
        ...globals.node,
        __dirname: "readonly",
      },
    },
    rules: {
        ...js.configs.recommended.rules,
        "no-unused-vars": "warn",
    }
  }
];
