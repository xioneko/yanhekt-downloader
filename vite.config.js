import { defineConfig } from "vite"
import { resolve } from "node:path"
import solid from "vite-plugin-solid"
import unocss from "unocss/vite"
import { name } from "./package.json"
import userscript from "./vite-plugin-userscript"

/* global __dirname */

export default defineConfig(({ mode }) => {
  const DEV = mode === "development"
  return {
    plugins: [unocss(), solid(), userscript()],
    build: {
      lib: {
        entry: resolve(__dirname, "src/index.tsx"),
        name: "user_script",
        formats: ["iife"],
        fileName: () => "yanhekt-downloader.user.js",
      },
      minify: DEV ? false : "esbuild",
    },
    esbuild: {
      minifyIdentifiers: false,
      minifyWhitespace: false,
      drop: DEV ? [] : ["console", "debugger"],
    },
    resolve: {
      alias: {
        "@assets": resolve(__dirname, "src/assets"),
        "@styles": resolve(__dirname, "src/css"),
      },
    },
  }
})
