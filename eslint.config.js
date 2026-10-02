import eslintJs from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["node_modules", "dist", "src-tauri/target", "src-tauri/gen", "ui/build"] },
  eslintJs.configs.recommended,
  ...tseslint.configs.strict,
  {
    linterOptions: { noInlineConfig: true, reportUnusedDisableDirectives: "error" },
    rules: {
      "max-lines": ["error", { max: 200, skipBlankLines: true, skipComments: true }],
      "max-lines-per-function": ["error", { max: 30, skipBlankLines: true, skipComments: true }],
      "max-params": ["error", 4],
      "max-depth": ["error", 3],
      complexity: ["error", 8],
      "id-length": ["error", { min: 3, exceptions: ["id", "to", "x", "y", "i", "j"] }],
      "no-console": "error",
      "no-warning-comments": ["error", { terms: ["todo", "fixme", "hack", "xxx"] }],
      "no-else-return": "error",
      "no-nested-ternary": "error",
      eqeqeq: "error",
      "prefer-const": "error",
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-non-null-assertion": "error",
      "@typescript-eslint/consistent-type-imports": "error",
      "@typescript-eslint/ban-ts-comment": "error",
    },
  },
  {
    files: ["**/*.mjs", "**/*.js"],
    languageOptions: { globals: { process: "readonly" } },
  },
  {
    files: ["tests/**/*.ts"],
    rules: { "max-lines-per-function": "off" },
  },
);
