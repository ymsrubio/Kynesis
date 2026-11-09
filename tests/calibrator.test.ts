import { describe, expect, it } from "vitest";
import { classify, type Face, type Rgb } from "../src/calibration";
import { createCalibrator } from "../src/calibrator";

const COLORS: Record<Face, Rgb> = {
  U: [240, 240, 235], F: [10, 150, 90], R: [190, 30, 50], B: [10, 80, 180], L: [250, 90, 10], D: [250, 210, 20],
};
const ORDER: Face[] = ["U", "F", "R", "B", "L", "D"];
const hold = (c: ReturnType<typeof createCalibrator>, rgb: Rgb, n = 10) => {
  for (let i = 0; i < n; i++) c.push(rgb);
};
const wobble = (rgb: Rgb, i: number): Rgb => [rgb[0] + (i % 3) - 1, rgb[1] - (i % 2), rgb[2] + (i % 3)];

describe("Calibrator", () => {
  it("starts by asking for the first face", () => {
    expect(createCalibrator().state.next).toBe("U");
  });

  it("captures a face once it has been held steady, then asks for the next", () => {
    const c = createCalibrator();
    hold(c, COLORS.U);
    expect(c.state.captured.U).toBeDefined();
    expect(c.state.next).toBe("F");
  });

  it("does not capture a face that is still moving", () => {
    const c = createCalibrator();
    for (let i = 0; i < 30; i++) c.push([i * 8, 100, 100]);
    expect(c.state.captured.U).toBeUndefined();
  });

  it("does not capture on too few frames", () => {
    const c = createCalibrator();
    hold(c, COLORS.U, 4);
    expect(c.state.captured.U).toBeUndefined();
  });

  it("tolerates sensor noise while the face is held", () => {
    const c = createCalibrator();
    for (let i = 0; i < 10; i++) c.push(wobble(COLORS.U, i));
    expect(c.state.captured.U).toBeDefined();
  });

  it("ignores the same face if it is still held after capture", () => {
    const c = createCalibrator();
    hold(c, COLORS.U, 40);
    expect(Object.keys(c.state.captured)).toEqual(["U"]);
  });

  it("restarts the steadiness count after a movement", () => {
    const c = createCalibrator();
    hold(c, COLORS.F, 6);
    c.push(COLORS.R);
    hold(c, COLORS.F, 6);
    expect(c.state.captured.U).toBeUndefined();
  });

  it("finishes with a Calibration that maps each color to its face after six faces", () => {
    const c = createCalibrator();
    for (const face of ORDER) {
      expect(c.state.calibration).toBeNull();
      hold(c, COLORS[face]);
    }
    expect(c.state.next).toBeNull();
    const cal = c.state.calibration!;
    for (const face of ORDER) expect(classify(cal, COLORS[face])).toBe(face);
  });

  it("leaves the finished Calibration untouched by later frames", () => {
    const c = createCalibrator();
    for (const face of ORDER) hold(c, COLORS[face]);
    const done = c.state;
    hold(c, [128, 128, 128], 30);
    expect(c.state).toBe(done);
  });
});
