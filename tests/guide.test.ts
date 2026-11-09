import { describe, expect, it } from "vitest";
import type { Rgb } from "../src/calibration";
import { GUIDE_PX, faceInGuide, medianRgb, readGuide } from "../src/guide";

const CELL = GUIDE_PX / 3;
const NEIGHBOURS: Rgb[] = [[0, 158, 96], [196, 30, 58], [0, 81, 186], [255, 88, 0], [255, 213, 0], [255, 255, 255], [0, 158, 96], [196, 30, 58]];

/** A guide-sized RGBA frame: a 3x3 face (black gaps, differently colored neighbours) shifted by (dx, dy) over a gray wall. */
function frame(center: Rgb, dx = 0, dy = 0, wall: Rgb = [90, 90, 90]): number[] {
  const out: number[] = [];
  for (let y = 0; y < GUIDE_PX; y++) {
    for (let x = 0; x < GUIDE_PX; x++) {
      const cx = x - dx, cy = y - dy;
      let rgb: Rgb = wall;
      if (cx >= 0 && cy >= 0 && cx < GUIDE_PX && cy < GUIDE_PX) {
        const col = Math.floor(cx / CELL), row = Math.floor(cy / CELL);
        const inSticker = cx % CELL >= 2 && cx % CELL < CELL - 2 && cy % CELL >= 2 && cy % CELL < CELL - 2;
        const i = row * 3 + col;
        rgb = !inSticker ? [8, 8, 8] : i === 4 ? center : NEIGHBOURS[i < 4 ? i : i - 1];
      }
      out.push(rgb[0], rgb[1], rgb[2], 255);
    }
  }
  return out;
}

describe("faceInGuide", () => {
  it("accepts a face held in the guide, even a dark one", () => {
    expect(faceInGuide(readGuide(frame([255, 255, 255])))).toBe(true);
    expect(faceInGuide(readGuide(frame([0, 60, 140])))).toBe(true);
  });

  it("tolerates a small shift", () => {
    expect(faceInGuide(readGuide(frame([0, 158, 96], 4, -4)))).toBe(true);
  });

  it("rejects a face shifted so the guide's center falls on a gap or a neighbour's sticker", () => {
    expect(faceInGuide(readGuide(frame([255, 255, 255], 24, 0)))).toBe(false);
    expect(faceInGuide(readGuide(frame([255, 255, 255], 0, -24)))).toBe(false);
    expect(faceInGuide(readGuide(frame([255, 255, 255], 20, 20)))).toBe(false);
  });

  it("rejects an empty guide showing a flat wall", () => {
    const wall = Array.from({ length: GUIDE_PX * GUIDE_PX }, () => [90, 90, 90, 255]).flat();
    expect(faceInGuide(readGuide(wall))).toBe(false);
  });

  it("reads the center sticker's color", () => {
    expect(readGuide(frame([10, 150, 90])).center).toEqual([10, 150, 90]);
  });
});

describe("medianRgb", () => {
  it("ignores a minority of outlier pixels", () => {
    const px = (r: number, g: number, b: number) => [r, g, b, 255];
    const data = [...px(10, 20, 30), ...px(10, 20, 30), ...px(11, 21, 31), ...px(255, 255, 255)];
    expect(medianRgb(data)).toEqual([11, 21, 31]);
  });
});
