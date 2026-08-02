import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "out/**",
      "build/**",
      "next-env.d.ts",
    ],
  },
  {
    // shadcn Carousel + slug auto-fill forms sync Embla/derived state in effects.
    // The React Compiler rule flags these legitimate subscribe-then-sync patterns.
    rules: {
      "react-hooks/set-state-in-effect": "off",
    },
  },
];

export default eslintConfig;
