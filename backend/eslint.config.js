/**
 * ESLint flat config for the Node.js API. Prettier owns formatting.
 */
import js from "@eslint/js";
import globals from "globals";
import prettier from "eslint-config-prettier/flat";

export default [
  { ignores: ["node_modules/**", "coverage/**", "logs/**"] },
  js.configs.recommended,
  {
    files: ["**/*.js"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: { ...globals.node },
    },
    rules: {
      "no-console": "warn", // use utils/logger.js instead
      "no-unused-vars": ["error", { argsIgnorePattern: "^_", ignoreRestSiblings: true }],
      eqeqeq: ["error", "always"],
      "prefer-const": "error",
    },
  },
  prettier,
];
