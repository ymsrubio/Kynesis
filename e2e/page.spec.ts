import { expect, test } from "@playwright/test";

const CLIP = "/?clip=/clips/test-pattern.webm";

async function isPlaying(page: import("@playwright/test").Page) {
  const time = () => page.locator("#feed").evaluate((v: HTMLVideoElement) => v.currentTime);
  const t0 = await time();
  await expect.poll(time).toBeGreaterThan(t0);
  return page.locator("#feed").evaluate((v: HTMLVideoElement) => v.videoWidth > 0);
}

function trackExternalRequests(page: import("@playwright/test").Page) {
  const external: string[] = [];
  page.on("request", (r) => {
    const url = new URL(r.url());
    if (!["localhost", ""].includes(url.hostname) && !["data:", "blob:"].includes(url.protocol)) {
      external.push(r.url());
    }
  });
  return external;
}

test.describe("playing a recorded clip", () => {
  test("shows the feed beside an empty Move log", async ({ page }) => {
    await page.goto(CLIP);
    await expect(page.locator("#status")).toHaveAttribute("data-state", "playing");
    expect(await isPlaying(page)).toBe(true);

    const feed = await page.locator("#feed").boundingBox();
    const log = await page.getByRole("region", { name: "Move log" }).boundingBox();
    expect(log!.x).toBeGreaterThanOrEqual(feed!.x + feed!.width - 1);
    await expect(page.getByTestId("move-log").locator("li")).toHaveCount(0);
    await expect(page.getByText("No moves yet")).toBeVisible();
  });

  test("sends no requests to any other host", async ({ page }) => {
    const external = trackExternalRequests(page);
    await page.goto(CLIP);
    await expect(page.locator("#status")).toHaveAttribute("data-state", "playing");
    expect(external).toEqual([]);
  });

  test("ignores a clip URL on another host", async ({ page }) => {
    const external = trackExternalRequests(page);
    await page.goto("/?clip=http://evil.test/a.webm");
    await expect(page.locator("#status")).toHaveAttribute("data-state", "playing");
    expect(external).toEqual([]);
  });
});

test.describe("using the live camera", () => {
  test("asks for the camera and shows the live feed", async ({ page }) => {
    await page.addInitScript(() => {
      const real = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
      (window as any).__gumCalls = [];
      navigator.mediaDevices.getUserMedia = (c) => {
        (window as any).__gumCalls.push(c);
        return real(c);
      };
    });
    await page.goto("/");
    await expect(page.locator("#status")).toHaveAttribute("data-state", "playing");
    expect(await page.evaluate(() => (window as any).__gumCalls.length)).toBe(1);
    expect(await isPlaying(page)).toBe(true);
    await expect(page.getByRole("region", { name: "Move log" })).toBeVisible();
  });

  test("says so when camera access is refused", async ({ page }) => {
    await page.addInitScript(() => {
      navigator.mediaDevices.getUserMedia = () =>
        Promise.reject(new DOMException("Permission denied", "NotAllowedError"));
    });
    await page.goto("/");
    await expect(page.locator("#status")).toHaveAttribute("data-state", "error");
    await expect(page.locator("#status")).toContainText("Permission denied");
  });
});
