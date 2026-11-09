import { describe, expect, it } from "vitest";
import { centerPatch, medianRgb } from "../src/guide";

describe("centerPatch", () => {
  it("is centred in the frame and sits inside the guide's middle sticker", () => {
    const p = centerPatch(640, 480);
    expect(p.x + p.width / 2).toBeCloseTo(320, 0);
    expect(p.y + p.height / 2).toBeCloseTo(240, 0);
    // guide is 288px (0.6*480); middle sticker is 96px wide
    expect(p.width).toBeGreaterThan(8);
    expect(p.width).toBeLessThan(96);
  });
});

describe("medianRgb", () => {
  it("ignores a minority of outlier pixels", () => {
    const px = (r: number, g: number, b: number) => [r, g, b, 255];
    const data = [...px(10, 20, 30), ...px(10, 20, 30), ...px(11, 21, 31), ...px(255, 255, 255)];
    expect(medianRgb(data)).toEqual([11, 21, 31]);
  });
});
