import { describe, expect, it } from "vitest";
import { classify, rgbToLab, type Rgb } from "../src/calibration";
import { createCalibrator } from "../src/calibrator";
import type { GuideReading } from "../src/guide";

const COLORS: Rgb[] = [[240, 240, 235], [10, 150, 90], [190, 30, 50], [10, 80, 180], [250, 90, 10], [250, 210, 20]];
const reading = (rgb: Rgb): GuideReading => ({ center: rgb, inner: [rgb, rgb, rgb, rgb], extent: { left: 22, right: 22, up: 22, down: 22 } });
/** A face off-center: the guide's center sticker color differs from what surrounds it. */
const offGuide = (rgb: Rgb): GuideReading => ({ ...reading(rgb), inner: [COLORS[1], COLORS[1], COLORS[1], COLORS[1]] });
type C = ReturnType<typeof createCalibrator>;
const hold = (c: C, r: GuideReading, n = 10) => {
  for (let i = 0; i < n; i++) c.push(r);
};
const wobble = (rgb: Rgb, i: number): GuideReading => reading([rgb[0] + (i % 3) - 1, rgb[1] - (i % 2), rgb[2] + (i % 3)]);

describe("Calibrator", () => {
  it("starts with nothing captured", () => {
    const c = createCalibrator();
    expect(c.state.captured).toHaveLength(0);
    expect(c.state.calibration).toBeNull();
    expect(c.state.notice).toBeNull();
  });

  it("captures a face once it has been held steady", () => {
    const c = createCalibrator();
    hold(c, reading(COLORS[0]));
    expect(c.state.captured).toHaveLength(1);
  });

  it("does not capture a face that is still moving", () => {
    const c = createCalibrator();
    for (let i = 0; i < 30; i++) c.push(reading([i * 8, 100, 100]));
    expect(c.state.captured).toHaveLength(0);
  });

  it("does not capture on too few frames", () => {
    const c = createCalibrator();
    hold(c, reading(COLORS[0]), 4);
    expect(c.state.captured).toHaveLength(0);
  });

  it("tolerates sensor noise while the face is held", () => {
    const c = createCalibrator();
    for (let i = 0; i < 10; i++) c.push(wobble(COLORS[0], i));
    expect(c.state.captured).toHaveLength(1);
  });

  it("restarts the steadiness count after a movement", () => {
    const c = createCalibrator();
    hold(c, reading(COLORS[1]), 6);
    c.push(reading(COLORS[2]));
    hold(c, reading(COLORS[1]), 6);
    expect(c.state.captured).toHaveLength(0);
  });

  it("captures the same face only once and says so while it is still held", () => {
    const c = createCalibrator();
    hold(c, reading(COLORS[0]), 40);
    expect(c.state.captured).toHaveLength(1);
    expect(c.state.notice).toBe("already-captured");
  });

  it("clears the notice when a new face is captured", () => {
    const c = createCalibrator();
    hold(c, reading(COLORS[0]), 20);
    hold(c, reading(COLORS[1]));
    expect(c.state.captured).toHaveLength(2);
    expect(c.state.notice).toBeNull();
  });

  it("does not capture a face that is not inside the guide, and says so", () => {
    const c = createCalibrator();
    hold(c, offGuide(COLORS[0]), 30);
    expect(c.state.captured).toHaveLength(0);
    expect(c.state.notice).toBe("off-guide");
  });

  it("does not capture a sticker that is found but far from the guide's middle", () => {
    const c = createCalibrator();
    hold(c, { ...reading(COLORS[0]), extent: { left: 4, right: 40, up: 22, down: 22 } }, 30);
    expect(c.state.captured).toHaveLength(0);
    expect(c.state.notice).toBe("off-guide");
  });

  it("needs a full steady run inside the guide after being off it", () => {
    const c = createCalibrator();
    hold(c, reading(COLORS[0]), 6);
    c.push(offGuide(COLORS[0]));
    hold(c, reading(COLORS[0]), 6);
    expect(c.state.captured).toHaveLength(0);
    hold(c, reading(COLORS[0]), 4);
    expect(c.state.captured).toHaveLength(1);
  });

  it("finishes with six classes whatever order the colors are shown in", () => {
    for (const order of [[0, 1, 2, 3, 4, 5], [4, 2, 5, 0, 3, 1]]) {
      const c = createCalibrator();
      for (const i of order) {
        expect(c.state.calibration).toBeNull();
        hold(c, reading(COLORS[i]));
      }
      const cal = c.state.calibration!;
      order.forEach((color, cls) => expect(classify(cal, COLORS[color])).toBe(cls));
      expect(cal[0].L).toBeCloseTo(rgbToLab(COLORS[order[0]]).L, 3);
    }
  });

  it("leaves the finished Calibration untouched by later frames", () => {
    const c = createCalibrator();
    for (const rgb of COLORS) hold(c, reading(rgb));
    const done = c.state;
    hold(c, reading([128, 128, 128]), 30);
    expect(c.state).toBe(done);
  });
});
