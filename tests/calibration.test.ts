import { describe, expect, it } from "vitest";
import { classify, deltaE, labToRgb, rgbToLab, type Calibration, type Face, type Rgb } from "../src/calibration";

// Standard speedcube colors (WCA scheme): U white, F green, R red, B blue, L orange, D yellow.
const STANDARD: Record<Face, Rgb> = {
  U: [255, 255, 255], F: [0, 158, 96], R: [196, 30, 58], B: [0, 81, 186], L: [255, 88, 0], D: [255, 213, 0],
};
const under = (k: number, rgb: Rgb): Rgb => [rgb[0] * k, rgb[1] * k, rgb[2] * k].map((v) => Math.min(255, v)) as unknown as Rgb;
const calibrationUnder = (k: number): Calibration =>
  Object.fromEntries(Object.entries(STANDARD).map(([f, c]) => [f, rgbToLab(under(k, c))])) as Calibration;

describe("rgbToLab", () => {
  it("converts sRGB to CIE Lab (D65) matching published values", () => {
    const white = rgbToLab([255, 255, 255]);
    expect(white.L).toBeCloseTo(100, 1);
    expect(white.a).toBeCloseTo(0, 1);
    expect(white.b).toBeCloseTo(0, 1);
    const red = rgbToLab([255, 0, 0]);
    expect(red.L).toBeCloseTo(53.24, 1);
    expect(red.a).toBeCloseTo(80.09, 1);
    expect(red.b).toBeCloseTo(67.2, 1);
  });
});

describe("deltaE", () => {
  it("is the Euclidean distance in Lab", () => {
    expect(deltaE({ L: 0, a: 0, b: 0 }, { L: 3, a: 4, b: 0 })).toBe(5);
  });
});

describe("classify", () => {
  it("labels each calibration color with its own face", () => {
    const cal = calibrationUnder(1);
    for (const [face, rgb] of Object.entries(STANDARD)) expect(classify(cal, rgb)).toBe(face);
  });

  it("follows the lighting: dim samples match a dim calibration, not a bright one's neighbours", () => {
    const cal = calibrationUnder(0.6);
    for (const [face, rgb] of Object.entries(STANDARD)) {
      const noisy: Rgb = [under(0.6, rgb)[0] + 6, under(0.6, rgb)[1] - 5, under(0.6, rgb)[2] + 4];
      expect(classify(cal, noisy)).toBe(face);
    }
  });
});

describe("labToRgb", () => {
  it("inverts rgbToLab so learned colors can be shown back", () => {
    for (const rgb of Object.values(STANDARD)) {
      const back = labToRgb(rgbToLab(rgb));
      back.forEach((v, i) => expect(v).toBeCloseTo(rgb[i], 0));
    }
  });
});
