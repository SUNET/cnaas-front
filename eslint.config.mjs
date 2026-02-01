import babelParser from "@babel/eslint-parser";
import importPlugin from "eslint-plugin-import";
import js from "@eslint/js";
import jsxA11y from "eslint-plugin-jsx-a11y";
import eslintPluginPrettierRecommended from "eslint-plugin-prettier/recommended";
import reactPlugin from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";
import globals from "globals";
// eslint-disable-next-line import/no-unresolved
import { defineConfig, globalIgnores } from "eslint/config";

const commonRules = {
  camelcase: ["error", { properties: "never" }],
  eqeqeq: "error",
  "jsx-a11y/label-has-associated-control": [
    "warn",
    { some: ["htmlFor", "nested"] },
  ],
  "jsx-a11y/label-has-for": "off",
  "no-console": "off", // allow console statements
  "no-unused-expressions": ["warn", { allowTernary: true }],
  "no-use-before-define": "off",
  "prettier/prettier": "error",
  "react-hooks/exhaustive-deps": "off",
  "react-hooks/immutability": "warn",
  "react/destructuring-assignment": "warn",
  "react/jsx-filename-extension": "off",
  "react/jsx-no-bind": "off",
  "react/prop-types": "warn",
  "react/sort-comp": "warn",
  // --- Temporarily disabled (refactor in progress) ---
  "react-hooks/set-state-in-effect": "off",
};

export default defineConfig([
  // Global ignores - files to skip entirely
  globalIgnores([".cache/", "dist/", "node_modules/", "package-lock.json"]),

  // Base config - applies to ALL files
  {
    name: "cnaas/base",
    extends: [
      js.configs.recommended,
      importPlugin.flatConfigs.recommended,
      jsxA11y.flatConfigs.recommended,
      reactPlugin.configs.flat.recommended,
      reactPlugin.configs.flat["jsx-runtime"],
      reactHooks.configs.flat.recommended,
      eslintPluginPrettierRecommended,
    ],
    languageOptions: {
      parser: babelParser,
      parserOptions: {
        requireConfigFile: false,
        ecmaFeatures: { jsx: true },
      },
    },
    settings: {
      react: { version: "detect" },
    },
    rules: commonRules,
  },

  // Test files - add Jest + Node globals, disable prop-types
  {
    name: "cnaas/tests",
    files: [
      "**/*.test.js",
      "**/*.spec.js",
      "**/__mocks__/**",
      "**/setupTests.js",
    ],
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.jest,
        global: "readonly",
        globalThis: "readonly",
        module: "readonly",
        process: "readonly",
        require: "readonly",
      },
    },
    rules: {
      "react/prop-types": "off",
    },
  },

  // Frontend (non-test files) - add browser globals
  {
    name: "cnaas/frontend",
    files: ["**/*.{js,jsx}"],
    ignores: [
      "**/*.test.js",
      "**/*.spec.js",
      "**/__mocks__/**",
      "**/setupTests.js",
    ],
    languageOptions: {
      globals: {
        ...globals.browser,
        globalThis: "readonly",
        module: "readonly",
        process: "readonly",
        require: "readonly",
      },
    },
  },
]);
