import { dirname } from "node:path"
import { fileURLToPath } from "node:url"
import { FlatCompat } from "@eslint/eslintrc"
import { defineConfig, globalIgnores } from "eslint/config"

const directory = dirname(fileURLToPath(import.meta.url))
const compat = new FlatCompat({ baseDirectory: directory })

export default defineConfig([
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  globalIgnores([
    ".next/**",
    "out/**",
    "dist/**",
    "build/**",
    ".scratch/**",
    "next-env.d.ts",
  ]),
])
