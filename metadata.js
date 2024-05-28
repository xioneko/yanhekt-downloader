// @ts-check
import fs from "node:fs"
import path from "node:path"

const packageJson = JSON.parse(
  fs
    .readFileSync(path.resolve(import.meta.dirname, "./package.json"))
    .toString(),
)

const metadata = {
  name: "延河课堂视频下载",
  namespace: packageJson.author,
  version: packageJson.version,
  description: "一个开箱即用的延河课堂视频下载脚本，用户界面友好，傻瓜式操作",
  license: packageJson.license,
  match: "https://www.yanhekt.cn/course/*",
  icon: "https://www.yanhekt.cn/yhkt.ico",
  downloadURL:
    "https://github.com/xioneko/yanhekt-downloader/releases/latest/download/yanhekt-downloader.user.js",
  supportURL: "https://github.com/xioneko/yanhekt-downloader/issues",
  homepageURL: "https://github.com/xioneko/yanhekt-downloader#readme",
  "inject-into": "content",
  unwrap: true,
  noframes: true,
}

export default metadata
