import { expect, test, type Page } from "@playwright/test";
import { deltaE, rgbToLab, type Rgb } from "../src/calibration";

const CLIP = "/?clip=/clips/cube-faces.webm";
const STANDARD: Rgb[] = [[255, 255, 255], [0, 158, 96], [196, 30, 58], [0, 81, 186], [255, 88, 0], [255, 213, 0]];
const parseHex = (h: string): Rgb => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const slot = (page: Page, i: number) => page.locator(`[data-slot="${i}"]`);

/** Starts calibration `at` seconds into the clip, whichever face happens to be showing. */
async function startCalibration(page: Page, at: number) {
  await page.goto(CLIP);
  await expect(page.locator("#status")).toHaveAttribute("data-state", "playing");
  await page.locator("#feed").evaluate((v: HTMLVideoElement, t) => (v.currentTime = t), at);
  await page.getByRole("button", { name: "Start calibration" }).click();
}

async function learnedColors(page: Page): Promise<Rgb[]> {
  const out: Rgb[] = [];
  for (let i = 0; i < 6; i++) out.push(parseHex((await slot(page, i).getAttribute("data-color"))!));
  return out;
}

test.describe("Calibration from a recorded clip", () => {
  // Starting at the top, mid-face (red), and during a slide, so no capture order is assumed.
  for (const at of [0, 5.2, 8.6]) {
    test(`learns six distinct colors, one per face, starting ${at}s into the clip`, async ({ page }) => {
      await startCalibration(page, at);
      await expect(page.locator("#calibration-prompt")).toHaveAttribute("data-state", "done", { timeout: 40_000 });

      const learned = (await learnedColors(page)).map(rgbToLab);
      const nearest = learned.map((lab) => {
        const d = STANDARD.map((s) => deltaE(lab, rgbToLab(s)));
        const best = d.indexOf(Math.min(...d));
        expect(d[best]).toBeLessThan(35); // each learned color is a real cube color under mild lighting change
        return best;
      });
      expect([...nearest].sort()).toEqual([0, 1, 2, 3, 4, 5]); // all six colors, none twice
    });
  }

  test("asks for faces one at a time", async ({ page }) => {
    await startCalibration(page, 0);
    const prompt = page.locator("#calibration-prompt");
    await expect(prompt).toContainText("Face 1 of 6");
    await expect(prompt).toContainText("Face 2 of 6", { timeout: 15_000 });
    await expect(slot(page, 0)).toHaveAttribute("data-color", /#/);
    await expect(slot(page, 1)).not.toHaveAttribute("data-color", /#/);
  });

  test("says so when a face it already has is shown again", async ({ page }) => {
    await startCalibration(page, 0);
    await expect(page.locator("#calibration-notice")).toContainText("already captured", { timeout: 15_000 });
  });

  test("can be redone, and is gone after a reload", async ({ page }) => {
    await startCalibration(page, 0);
    await expect(page.locator("#calibration-prompt")).toHaveAttribute("data-state", "done", { timeout: 40_000 });

    await page.getByRole("button", { name: "Recalibrate" }).click();
    await expect(page.locator("#calibration-prompt")).toContainText("Face 1 of 6");
    await expect(slot(page, 0)).not.toHaveAttribute("data-color", /#/);

    await page.reload();
    await expect(slot(page, 0)).not.toHaveAttribute("data-color", /#/);
  });

  test("draws the guide over the feed", async ({ page }) => {
    await page.goto(CLIP);
    const feed = (await page.locator("#feed").boundingBox())!;
    const guide = (await page.locator(".guide").boundingBox())!;
    expect(guide.x + guide.width / 2).toBeCloseTo(feed.x + feed.width / 2, -1);
    expect(guide.y + guide.height / 2).toBeCloseTo(feed.y + feed.height / 2, -1);
  });
});
