import { describe, expect, it } from "vitest";
import type { Rgb } from "../src/calibration";
import { GUIDE_PX, faceInGuide, medianRgb, readGuide } from "../src/guide";

const CELL = GUIDE_PX / 3;
const NEIGHBOURS: Rgb[] = [[0, 158, 96], [196, 30, 58], [0, 81, 186], [255, 88, 0], [255, 213, 0], [255, 255, 255], [0, 158, 96], [196, 30, 58]];

/** A guide-sized RGBA frame: a 3x3 face (black gaps, differently colored neighbours) shifted by (dx, dy) over a gray wall. */
function frame(center: Rgb, dx = 0, dy = 0, wall: Rgb = [90, 90, 90], noise = 0): number[] {
  const out: number[] = [];
  let seed = 12345; // deterministic noise
  const jitter = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return (seed / 2 ** 32 - 0.5) * 2 * noise;
  };
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
      out.push(rgb[0] + jitter(), rgb[1] + jitter(), rgb[2] + jitter(), 255);
    }
  }
  return out;
}

describe("faceInGuide", () => {
  it("accepts a face held in the guide, even a dark one", () => {
    expect(faceInGuide(readGuide(frame([255, 255, 255])))).toBe(true);
    expect(faceInGuide(readGuide(frame([0, 60, 140])))).toBe(true);
  });

  const SHIFTS: [string, number, number][] = [["left", -1, 0], ["right", 1, 0], ["up", 0, -1], ["down", 0, 1]];
  for (const px of [0, 8, 12]) {
    for (const [dir, ux, uy] of SHIFTS) {
      it(`accepts a face held ${px}px ${dir} of the guide's center, with sensor noise`, () => {
        expect(faceInGuide(readGuide(frame([0, 158, 96], ux * px, uy * px, [90, 90, 90], 6)))).toBe(true);
        expect(faceInGuide(readGuide(frame([0, 60, 140], ux * px, uy * px, [90, 90, 90], 6)))).toBe(true);
      });
    }
  }
  for (const [dir, ux, uy] of SHIFTS) {
    it(`rejects a face shifted 24px ${dir}, with sensor noise`, () => {
      expect(faceInGuide(readGuide(frame([255, 255, 255], ux * 24, uy * 24, [90, 90, 90], 6)))).toBe(false);
    });
  }

  it("rejects a face shifted diagonally off the center sticker", () => {
    expect(faceInGuide(readGuide(frame([255, 255, 255], 20, 20)))).toBe(false);
  });

  it("rejects a gap pattern that is not sticker-sized", () => {
    const inner: Rgb[] = [[0, 158, 96], [0, 158, 96], [0, 158, 96], [0, 158, 96]];
    const reading = (e: { left: number; right: number; up: number; down: number }) => ({ center: [0, 158, 96] as Rgb, inner, extent: e });
    expect(faceInGuide(reading({ left: 22, right: 22, up: 22, down: 22 }))).toBe(true);
    expect(faceInGuide(reading({ left: 10, right: 10, up: 22, down: 22 }))).toBe(false); // too narrow
    expect(faceInGuide(reading({ left: 22, right: 22, up: 34, down: 34 }))).toBe(false); // too tall
  });

  it("rejects an empty guide showing a flat wall", () => {
    const wall = Array.from({ length: GUIDE_PX * GUIDE_PX }, () => [90, 90, 90, 255]).flat();
    expect(faceInGuide(readGuide(wall))).toBe(false);
  });

  it("reads the center sticker's color, even when the face is shifted", () => {
    expect(readGuide(frame([10, 150, 90])).center).toEqual([10, 150, 90]);
    expect(readGuide(frame([10, 150, 90], 12, -12)).center).toEqual([10, 150, 90]);
  });
});

describe("medianRgb", () => {
  it("ignores a minority of outlier pixels", () => {
    const px = (r: number, g: number, b: number) => [r, g, b, 255];
    const data = [...px(10, 20, 30), ...px(10, 20, 30), ...px(11, 21, 31), ...px(255, 255, 255)];
    expect(medianRgb(data)).toEqual([11, 21, 31]);
  });
});
