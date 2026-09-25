// ESLint flat config. `npm run lint` — also a CI gate before the tests.
//
// react-hooks/exhaustive-deps is an error on purpose: a missing dependency
// shipped the phone lap-chart bug (a memo keyed on [drivers, total] kept
// desktop geometry after the layout switched). Where a dependency is left out
// deliberately, the line says why in an eslint-disable comment.
import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";

export default [
  { ignores: ["dist/", "node_modules/", "public/", ".impeccable/"] },
  {
    files: ["src/**/*.{js,jsx}"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: globals.browser,
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    plugins: { "react-hooks": reactHooks },
    rules: {
      ...js.configs.recommended.rules,
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "error",
      "no-unused-vars": ["error", { varsIgnorePattern: "^_", argsIgnorePattern: "^_", caughtErrors: "none" }],
    },
  },
  {
    files: ["scripts/**/*.mjs", "test/**/*.mjs", "*.config.js"],
    languageOptions: { ecmaVersion: "latest", sourceType: "module", globals: globals.node },
    rules: {
      ...js.configs.recommended.rules,
      "no-unused-vars": ["error", { varsIgnorePattern: "^_", argsIgnorePattern: "^_", caughtErrors: "none" }],
    },
  },
];
