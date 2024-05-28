import { test as setup, expect } from "@playwright/test"
import { resolve } from "node:path"

const authFile = "playwright/.auth/user.json"

if (!process.env.CI) {
  const dotenv = await import("dotenv")
  dotenv.config({ path: resolve(process.cwd(), ".env.test.local") })
}

const { LOGIN_SID, LOGIN_PWD, LOGIN_NAME } = process.env
if (!LOGIN_SID || !LOGIN_PWD || !LOGIN_NAME) {
  throw new Error("Missing LOGIN_SID, LOGIN_PWD or LOGIN_NAME in env")
}

setup("authenticate", async ({ page }) => {
  await page.goto(
    "https://login.bit.edu.cn/authserver/login?service=https://cbiz.yanhekt.cn/v1/cas/callback",
  )
  await page.getByPlaceholder("请输入学号/工号").click()
  await page.getByPlaceholder("请输入学号/工号").fill(LOGIN_SID)
  await page.getByPlaceholder("请输入密码").click()
  await page.getByPlaceholder("请输入密码").fill(LOGIN_PWD)
  await page.locator("#rememberMe").check()
  await page.getByRole("link", { name: "登录" }).click()
  await page.waitForURL("https://www.yanhekt.cn/home")
  await expect(page.getByText(LOGIN_NAME)).toBeVisible()
  await page.context().storageState({ path: authFile })
})
