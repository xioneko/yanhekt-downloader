import encrypt from "./encrypt"

/**
 * Example: 将 ".../Video1/Video1.m3u8" 变为 ".../Video1/a97f12c055a10ee51d60e441e618bfef/Video.m3u8?Xvideo_Token=..."
 * @param {string} rawUrl m3u8 或 ts 文件的原始 url
 * @returns 加密并添加身份验证参数后的 url
 */
export async function encryptUrlWithAuth(
  rawUrl: string,
  refreshToken: boolean = false,
) {
  const url = encrypt().p(rawUrl)
  const params = await createAuthParams(refreshToken)

  return `${url}?${params}`

  async function createAuthParams(refreshToken: boolean) {
    if (!AuthParams.token || refreshToken) {
      await AuthParams.refreshToken()
    }

    const timestamp = encrypt().t()
    // prettier-ignore
    return "Xvideo_Token=" + AuthParams.token
      + "&Xclient_Timestamp=" + timestamp
      + "&Xclient_Signature=" + encrypt().s(timestamp)
      + "&Xclient_Version=" + encrypt().v()
      + "&Platform=yhkt_user"
  }
}

namespace AuthParams {
  export let token: string
  export const refreshToken = throttle(async () => {
    token = await getVideoToken()
  }, 1000)
}

async function getVideoToken(): Promise<string> {
  const response = await fetch(
    "https://cbiz.yanhekt.cn/v1/auth/video/token?id=0",
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

  const body = await response.json()
  return body["data"]["token"]
}

export function getAuthToken(): string {
  // eslint-disable-next-line
  const token = JSON.parse(localStorage.auth ?? "{}").token
  if (!token) throw new Error("获取身份认证信息失败")

  return token as string
}

function throttle<T>(func: () => Promise<T>, wait: number): () => Promise<T> {
  let result: Promise<T> | undefined
  return () => {
    if (result !== undefined) {
      return result
    }
    result = func()
    setTimeout(() => (result = undefined), wait)
    return result
  }
}
