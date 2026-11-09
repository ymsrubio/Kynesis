import { describe, expect, it } from "vitest";
import { classify, deltaE, labToRgb, rgbToLab, type Calibration, type Rgb } from "../src/calibration";

// Six speedcube sticker colors (white, green, red, blue, orange, yellow). Class ids carry no face meaning.
const STANDARD: readonly Rgb[] = [[255, 255, 255], [0, 158, 96], [196, 30, 58], [0, 81, 186], [255, 88, 0], [255, 213, 0]];
const under = (k: number, rgb: Rgb): Rgb => [Math.min(255, rgb[0] * k), Math.min(255, rgb[1] * k), Math.min(255, rgb[2] * k)];
const calibrationUnder = (k: number): Calibration => {
  const [a, b, c, d, e, f] = STANDARD.map((rgb) => rgbToLab(under(k, rgb)));
  return [a, b, c, d, e, f];
};

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
  it("labels each calibration color with its own class", () => {
    const cal = calibrationUnder(1);
    STANDARD.forEach((rgb, i) => expect(classify(cal, rgb)).toBe(i));
  });

  it("follows the lighting: dim samples match a dim calibration", () => {
    const cal = calibrationUnder(0.6);
    STANDARD.forEach((rgb, i) => {
      const [r, g, b] = under(0.6, rgb);
      expect(classify(cal, [r + 6, g - 5, b + 4])).toBe(i);
    });
  });
});

describe("labToRgb", () => {
  it("inverts rgbToLab so learned colors can be shown back", () => {
    for (const rgb of STANDARD) {
      const back = labToRgb(rgbToLab(rgb));
      back.forEach((v, i) => expect(v).toBeCloseTo(rgb[i], 0));
    }
  });
});
