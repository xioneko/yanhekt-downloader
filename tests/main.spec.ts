import { test, expect } from "@playwright/test"

test("Two parallel download tasks", async ({ page }) => {
  test.setTimeout(25 * 60 * 1000)

  await page.goto("https://www.yanhekt.cn/course/45784")
  await page.addScriptTag({ path: "./dist/yanhekt-downloader.user.js" })
  await expect(page.getByText("暂无当前课程权限"), {
    message: "当前测试的执行需要拥有课程权限",
  }).toBeHidden({ timeout: 30 * 1000 })

  const downloadBtn = page
    .locator("li")
    .filter({ hasText: /第13周 星期五 第3大节/ })
    .getByRole("button", { name: "下载" })
  await expect(downloadBtn).toBeVisible({ timeout: 60 * 1000 })

  await downloadBtn.click()
  await expect(page.getByText(/课程名称.*攻防对抗技术/)).toBeVisible()
  await expect(page.getByText(/课程节次.*第13周 星期五 第3大节/)).toBeVisible()

  await page.getByRole("button", { name: "创建" }).click()
  // Create another task
  await page
    .locator("li")
    .filter({ hasText: /第13周 星期二 第3大节/ })
    .getByRole("button", { name: "下载" })
    .click()
  await page.getByLabel("教室").click()
  await page.getByRole("button", { name: "创建" }).click()

  const expectTaskToBeSuccess = async (courseTitle: string) => {
    const match = (status: string) => new RegExp(`${courseTitle}\\s?${status}`)
    await expect(page.getByText(match("等待下载"))).toBeVisible()
    await expect(page.getByText(match("下载中"))).toBeVisible({
      timeout: 60 * 1000,
    })
    await expect(page.getByText(match("等待转码"))).toBeVisible({
      timeout: 10 * 60 * 1000,
    })
    await expect(page.getByText(match("转码中"))).toBeVisible({
      timeout: 5 * 60 * 1000,
    })
    await expect(page.getByText(match("已完成"))).toBeVisible({
      timeout: 10 * 60 * 1000,
    })
  }

  const taskSuccess = await Promise.race([
    Promise.all([
      expectTaskToBeSuccess("第13周 星期五 第3大节"),
      expectTaskToBeSuccess("第13周 星期二 第3大节"),
    ]).then(() => true),
    expect(page.getByText(/第13周 星期. 第3大节\s?下载错误/))
      .toBeVisible({ timeout: 10 * 60 * 1000 })
      .then(() => false),
  ])
  expect(taskSuccess).toBe(true)

  const downloadPromise = page.waitForEvent("download", { timeout: 60 * 1000 })
  await page
    .locator(".snackbar")
    .filter({ hasText: "第13周 星期五 第3大节" })
    .getByRole("button")
    .click()
  const videoFile = await downloadPromise
  expect(videoFile.suggestedFilename()).toMatch(
    /.*第13周 星期五 第3大节.*\.mp4/,
  )
})
