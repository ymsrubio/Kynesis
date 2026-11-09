import { expect, test, type Page } from "@playwright/test";
import { classify, deltaE, rgbToLab, type Calibration, type Face, type Rgb } from "../src/calibration";

const CLIP = "/?clip=/clips/cube-faces.webm";
const FACES: Face[] = ["U", "F", "R", "B", "L", "D"];
const STANDARD: Record<Face, Rgb> = {
  U: [255, 255, 255], F: [0, 158, 96], R: [196, 30, 58], B: [0, 81, 186], L: [255, 88, 0], D: [255, 213, 0],
};
const parseHex = (h: string): Rgb => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)) as unknown as Rgb;

/** Starts calibration at the top of the clip, where the first face slides in. */
async function startCalibration(page: Page) {
  await page.goto(CLIP);
  await expect(page.locator("#status")).toHaveAttribute("data-state", "playing");
  await page.getByRole("button", { name: "Start calibration" }).click();
  await page.locator("#feed").evaluate((v: HTMLVideoElement) => (v.currentTime = 0));
}

async function learnedColors(page: Page): Promise<Record<Face, Rgb>> {
  const out = {} as Record<Face, Rgb>;
  for (const f of FACES) out[f] = parseHex((await page.locator(`[data-face="${f}"]`).getAttribute("data-color"))!);
  return out;
}

test.describe("Calibration from a recorded clip", () => {
  test("walks through the six faces and shows six distinct colors that match their faces", async ({ page }) => {
    await startCalibration(page);
    await expect(page.locator("#calibration-prompt")).toContainText("white");
    await expect(page.locator("#calibration-prompt")).toHaveAttribute("data-state", "done", { timeout: 30_000 });

    const learned = await learnedColors(page);
    const cal = Object.fromEntries(FACES.map((f) => [f, rgbToLab(learned[f])])) as Calibration;
    for (const a of FACES) {
      for (const b of FACES) if (a < b) expect(deltaE(cal[a], cal[b])).toBeGreaterThan(20);
      expect(classify(cal, STANDARD[a])).toBe(a); // the learned color for U is the one nearest white, etc.
    }
  });

  test("asks for the faces one at a time, in order", async ({ page }) => {
    await startCalibration(page);
    const prompt = page.locator("#calibration-prompt");
    await expect(prompt).toContainText("Face 1 of 6");
    await expect(prompt).toContainText("Face 2 of 6", { timeout: 15_000 });
    await expect(page.locator('[data-face="U"]')).toHaveAttribute("data-color", /#/);
    await expect(page.locator('[data-face="F"]')).not.toHaveAttribute("data-color", /#/);
  });

  test("can be redone, and is gone after a reload", async ({ page }) => {
    await startCalibration(page);
    await expect(page.locator("#calibration-prompt")).toHaveAttribute("data-state", "done", { timeout: 30_000 });

    await page.getByRole("button", { name: "Recalibrate" }).click();
    await expect(page.locator("#calibration-prompt")).toContainText("Face 1 of 6");
    await expect(page.locator('[data-face="U"]')).not.toHaveAttribute("data-color", /#/);

    await page.reload();
    await expect(page.locator('[data-face="U"]')).not.toHaveAttribute("data-color", /#/);
  });

  test("draws the guide over the feed", async ({ page }) => {
    await page.goto(CLIP);
    const feed = (await page.locator("#feed").boundingBox())!;
    const guide = (await page.locator(".guide").boundingBox())!;
    expect(guide.x + guide.width / 2).toBeCloseTo(feed.x + feed.width / 2, -1);
    expect(guide.y + guide.height / 2).toBeCloseTo(feed.y + feed.height / 2, -1);
  });
});
