import babelParser from "@babel/eslint-parser";
import importPlugin from "eslint-plugin-import";
import js from "@eslint/js";
import jsxA11y from "eslint-plugin-jsx-a11y";
import eslintPluginPrettierRecommended from "eslint-plugin-prettier/recommended";
import reactPlugin from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";
import globals from "globals";
import { defineConfig } from "eslint/config";

const commonRules = {
  camelcase: "warn",
  eqeqeq: "warn",
  "jsx-a11y/label-has-associated-control": [
    "warn",
    { some: ["htmlFor", "nested"] },
  ],
  "jsx-a11y/label-has-for": "off",
  "no-console": "warn",
  "no-unused-expressions": ["warn", { allowTernary: true }],
  "no-use-before-define": "off",
  "prettier/prettier": "error",
  "react-hooks/exhaustive-deps": "off",
  "react/destructuring-assignment": "warn",
  "react/jsx-filename-extension": "off", // allow .js suffix
  "react/jsx-no-bind": "off",
  "react/jsx-uses-vars": "error",
  "react/prop-types": "off",
  "react/sort-comp": "warn",
  // TEMPORARY rules while refactor
  "jsx-a11y/anchor-is-valid": "off", // allow popup triggers use <a> without href during refactor
  "no-redeclare": "off", // allow shadowing during refactor
  "no-undef": "off", // allow require() during refactor
  "react-hooks/set-state-in-effect": "off", // allow during refactor
};

const commonLanguageOptions = {
  parser: babelParser,
  parserOptions: {
    requireConfigFile: false,
    ecmaFeatures: {
      jsx: true,
    },
  },
  globals: {
    ...globals.browser,
    ...globals.jest,
  },
};

export default defineConfig([
  js.configs.recommended,
  importPlugin.flatConfigs.recommended,
  jsxA11y.flatConfigs.recommended,
  reactPlugin.configs.flat["jsx-runtime"],
  reactHooks.configs.flat.recommended,
  {
    // Test + Node files
    files: [
      "**/*.config.js",
      "**/*.config.mjs",
      "**/*.test.js",
      "**/*.spec.js",
      "**/__mocks__/**",
    ],
    languageOptions: {
      ...commonLanguageOptions,
    },
    rules: {
      ...commonRules,
    },
  },
  {
    // Frontend (React app)
    files: ["**/*.{js,jsx,ts,tsx}"],
    ignores: ["**/*.test.*", "**/*.spec.*", "**/__mocks__/**"],
    languageOptions: {
      ...commonLanguageOptions,
      globals: {
        ...commonLanguageOptions.globals,
        process: "readonly",
      },
    },
    settings: {
      react: {
        version: "detect",
      },
    },
    rules: {
      ...commonRules,
      "no-lone-blocks": "off", // conflicts with setState
      "react/prefer-stateless-function": "warn", // allow class components
    },
  },
  // Prettier should always be last
  eslintPluginPrettierRecommended,
  {
    ignores: [
      ".cache/",
      "eslint.config.mjs",
      "dist/",
      "node_modules/",
      "package-lock.json",
    ],
  },
]);
