import eslint from "@eslint/js"
import solid from "eslint-plugin-solid/configs/typescript.js"
import eslintConfigPrettier from "eslint-config-prettier"
import tsEslint from "typescript-eslint"
import unocss from "@unocss/eslint-config/flat"

export default tsEslint.config(
  eslint.configs.recommended,
  ...tsEslint.configs.recommendedTypeChecked,
  unocss,
  {
    files: ["src/**/*", "test/**/*"],
    languageOptions: {
      parserOptions: {
        project: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      "@typescript-eslint/no-unsafe-assignment": "warn",
      "@typescript-eslint/no-unsafe-member-access": "warn",
      "@typescript-eslint/no-unsafe-return": "warn",
      "@typescript-eslint/no-unsafe-call": "warn",
      "@typescript-eslint/no-namespace": "off",
    },
  },
  {
    files: ["src/**/*.{ts, tsx}"],
    ...solid,
  },
  {
    ignores: ["src/**/*", "test/**/*"],
    ...tsEslint.configs.disableTypeChecked,
  },
  {
    ignores: ["dist/"],
  },
  {
    rules: {
      "no-debugger": "off",
      "no-constant-condition": "off",
      "@typescript-eslint/no-unused-vars": "off",
      "@typescript-eslint/ban-ts-comment": "off",
    },
  },
  eslintConfigPrettier,
)
