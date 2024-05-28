import { FFmpeg } from "@ffmpeg/ffmpeg"
import { fetchFile, toBlobURL } from "@ffmpeg/util"

const CDN_BASE = "https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd"

const ffmpeg = new FFmpeg()

const resolveQueue: (() => void)[] = []
let isTaskRunning: boolean = false

async function enqueue(task: () => Promise<Blob>): Promise<Blob> {
  if (isTaskRunning) {
    await new Promise<void>((resolve) => resolveQueue.push(resolve))
  }
  isTaskRunning = true
  try {
    return await task()
  } finally {
    resolveQueue.shift()?.()
    isTaskRunning = false
  }
}

export function convertTsToMp4(
  tsFile: Blob,
  onLog: (message: string) => void,
  onProgress: (progress: number) => void,
): [blob: Promise<Blob>, cancel: () => void] {
  const controller = new AbortController()
  const logCallback = ({ message }: { message: string }) => onLog(message)
  const progressCallback = ({ progress }: { progress: number }) =>
    onProgress(progress)

  return [
    enqueue(async () => {
      if (!ffmpeg.loaded) {
        // prettier-ignore
        await ffmpeg.load({
          coreURL: await toBlobURL(`${CDN_BASE}/ffmpeg-core.js`, "text/javascript"),
          wasmURL: await toBlobURL(`${CDN_BASE}/ffmpeg-core.wasm`, "application/wasm"),
      })
      }
      ffmpeg.on("log", logCallback)
      ffmpeg.on("progress", progressCallback)

      await ffmpeg.writeFile("input.ts", await fetchFile(tsFile))
      await ffmpeg.exec(
        ["-i", "input.ts", "-c", "copy", "output.mp4"],
        undefined,
        { signal: controller.signal },
      )

      ffmpeg.off("log", logCallback)
      ffmpeg.off("progress", progressCallback)

      const data = await ffmpeg.readFile("output.mp4")

      await ffmpeg.deleteFile("input.ts")
      await ffmpeg.deleteFile("output.mp4")

      return new Blob([data], { type: "video/mp4" })
    }),
    () => {
      controller.abort()
    },
  ]
}
