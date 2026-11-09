import { beforeEach, describe, expect, it } from "vitest";
import type { Calibration } from "../src/calibration";
import { calibrationStore } from "../src/calibrationStore";

const lab = (L: number) => ({ L, a: 0, b: 0 });
const cal: Calibration = [lab(1), lab(2), lab(3), lab(4), lab(5), lab(6)];

describe("calibrationStore", () => {
  beforeEach(() => calibrationStore.clear());

  it("has no Calibration until one is set", () => {
    expect(calibrationStore.get()).toBeNull();
  });

  it("keeps the Calibration until recalibration replaces it", () => {
    calibrationStore.set(cal);
    expect(calibrationStore.get()).toBe(cal);
    const next: Calibration = [lab(9), lab(8), lab(7), lab(6), lab(5), lab(4)];
    calibrationStore.set(next);
    expect(calibrationStore.get()).toBe(next);
  });

  it("forgets the Calibration when cleared", () => {
    calibrationStore.set(cal);
    calibrationStore.clear();
    expect(calibrationStore.get()).toBeNull();
  });
});
