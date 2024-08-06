import { encryptUrlWithAuth, getAuthToken } from "./auth"
import encrypt from "./encrypt"

export interface CourseVideo {
  course_id: number
  day: string
  ended_at: string
  id: number
  section_end: number
  section_start: number
  started_at: string
  title: string
  video_ids: number[]
  videos: CourseVideoDetail[]
  week_number: number
  week_type: number
}

export interface CourseVideoDetail {
  duration: string
  format: string
  id: number
  main: string
  type: number
  vga: string
}

// {
//   course_id: 45772,
//   day: "1",
//   ended_at: "2024-02-26 17:40:00",
//   id: 545498,
//   section_end: 10,
//   section_start: 8,
//   started_at: "2024-02-26 15:15:00",
//   title: "第1周 星期一 第4大节",
//   video_ids: [296786],
//   videos: [{
//     duration: "8937",
//     format: "m3u8",
//     id: 296786,
//     main: "https://cvideo.yanhekt.cn/vod/2024/02/26/24386094/1/Video1/Video1.m3u8",
//     type: 2,
//     vga: "https://cvideo.yanhekt.cn/vod/2024/02/26/24386094/1/VGA/VGA.m3u8",
//   }],
//   week_number: 9,
//   week_type: 0,
// }

/**
 *
 * @param courseId 课程 id
 * @returns 课程视频列表
 */
export async function fetchCourseVideos(
  courseId: string,
): Promise<CourseVideo[]> {
  const res = await fetch(
    `https://cbiz.yanhekt.cn/v2/course/session/list?course_id=${courseId}`,
    {
      headers: {
        Authorization: `Bearer ${getAuthToken()}`,
        "Xdomain-Client": "web_user",
        "xclient-timestamp": encrypt().t(),
        "xclient-signature": encrypt().s(),
        "xclient-version": encrypt().v(),
      },
    },
  )
  const { data: courses } = await res.json()

  return courses as CourseVideo[]
}

/**
 *
 * @param m3u8Url m3u8文件的 url
 * @param onProgress 下载进度更新回调
 * @returns [blob, cancel]，blob 为下载完成的视频文件，cancel 为取消下载的函数
 */
export function downloadVideo(
  m3u8Url: string,
  onProgress: (progress: number) => void,
): [blob: Promise<Blob>, cancel: () => void] {
  const controller = new AbortController()
  return [
    (async () => {
      const m3u8 = await encryptUrlWithAuth(m3u8Url)
        .then((url) => fetch(url, { signal: controller.signal }))
        .then((r) => r.text())
      const baseUrl = m3u8Url.substring(0, m3u8Url.lastIndexOf("/"))
      const tsUrls: string[] = parseTsUrls(m3u8, baseUrl)

      let progress: number = 0
      onProgress(0)

      // 分组请求，组间串行，组内并行
      const blobs: Blob[] = []
      for (const urlGroup of chunk(tsUrls, 16)) {
        const results = await Promise.all(
          urlGroup.map(async (rawUrl) => {
            let retries = 3
            let tsUrl = await encryptUrlWithAuth(rawUrl)
            while (true) {
              try {
                const res = await fetch(tsUrl, {
                  signal: controller.signal,
                }).then((res) => res.blob())
                onProgress(++progress / tsUrls.length)
                return res
              } catch (err) {
                if (err instanceof DOMException && err.name === "AbortError")
                  throw err
                if (retries-- === 0) throw err
                const filename = rawUrl.substring(rawUrl.lastIndexOf("/"))
                console.log(`Fetch ${filename} failed: Retrying...`)
                tsUrl = await encryptUrlWithAuth(rawUrl, true)
              }
            }
          }),
        )
        blobs.push(...results)
      }
      const tsFile = new Blob(blobs, { type: "video/mp2t" })
      return tsFile
    })(),
    () => {
      controller.abort()
    },
  ]
}

function parseTsUrls(m3u8: string, baseUrl: string): string[] {
  return m3u8
    .split("\n")
    .filter((line) => line.endsWith("ts"))
    .map((line) => {
      return `${baseUrl}/${line}`
    })
}

function chunk<T>(arr: T[], size: number): T[][] {
  const result: T[][] = []
  for (let i = 0; i < arr.length; i += size) {
    result.push(arr.slice(i, i + size))
  }
  return result
}
