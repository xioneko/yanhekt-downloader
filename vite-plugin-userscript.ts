import type { Plugin } from "vite"
import type { OutputAsset, OutputChunk } from "rollup"
import path from "node:path"

export default (): Plugin[] => {
  let rootDir!: string
  return [
    {
      name: "userscript:styles",
      apply: "build",
      enforce: "post",
      generateBundle(options, bundle) {
        let stylesheet: string = ""
        let js!: OutputChunk
        for (const [fileName, assetOrChunk] of Object.entries(bundle)) {
          if (path.extname(fileName) === ".css") {
            stylesheet += (assetOrChunk as OutputAsset).source as string
            delete bundle[fileName]
          }
          if (assetOrChunk.type == "chunk") {
            js = assetOrChunk
          }
        }
        js.code = styleInjection(stylesheet) + js.code
      },
    },
    {
      name: "userscript:metadata",
      apply: "build",
      enforce: "post",
      configResolved(config) {
        rootDir = config.root
      },
      async generateBundle(options, bundle) {
        const metadata = (
          await import(path.resolve(rootDir, "metadata.js")).catch((err) => {
            console.error("Failed to load metadata.js in root directory")
            throw err
          })
        ).default
        if (!metadata) {
          throw new Error("metadata.js should export an object as default")
        }

        let banner = "// ==UserScript==\n"
        const COLUMN_WIDTH = Math.max(
          ...Object.keys(metadata).map((key) => key.length),
        )
        for (const [key, value] of Object.entries(metadata)) {
          banner += `// @${key.padEnd(COLUMN_WIDTH)}   ${value}\n`
        }
        banner += "// ==/UserScript==\n"
        for (const assetOrChunk of Object.values(bundle)) {
          if (assetOrChunk.type === "chunk") {
            assetOrChunk.code = banner + assetOrChunk.code
          }
        }
      },
    },
  ]
}

const styleInjection = (stylesheet: string) => {
  stylesheet = stylesheet
    .replace(/\\/g, "\\\\")
    .replace(/`/g, "\\`")
    .replace(/\$/g, "\\$")
  return `\
(function() {
  const style = document.createElement("style");
  document.head.appendChild(style);
  style.textContent = \`${stylesheet}\`;
})()
`
}
