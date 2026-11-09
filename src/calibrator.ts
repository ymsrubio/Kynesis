import { deltaE, rgbToLab, type Calibration, type Lab } from "./calibration";
import { faceInGuide, type GuideReading } from "./guide";

/** Why the last frame did not count toward a capture. */
export type Notice = "off-guide" | "already-captured";

export interface CalibratorState {
  /** Colors learned so far, in the order shown; the index is the color class. */
  readonly captured: readonly Lab[];
  readonly calibration: Calibration | null;
  readonly notice: Notice | null;
}

export interface Calibrator {
  /** Feed what the guide shows in one video frame. */
  push(reading: GuideReading): CalibratorState;
  readonly state: CalibratorState;
}

/** Frames in a row the center sticker must hold still before it is sampled (about a third of a second at 30 fps). */
export const STEADY_FRAMES = 10;
/** Largest Lab distance a reading may sit from the window's mean and still count as held still; above sensor noise, below any hand movement. */
export const STEADY_DELTA_E = 4;
/** A new color must differ from every color already captured by at least this much, so holding one face up twice cannot fill two slots. */
export const DISTINCT_DELTA_E = 20;

const mean = (labs: Lab[]): Lab => ({
  L: labs.reduce((s, x) => s + x.L, 0) / labs.length,
  a: labs.reduce((s, x) => s + x.a, 0) / labs.length,
  b: labs.reduce((s, x) => s + x.b, 0) / labs.length,
});

/**
 * Learns six colors, one per face shown, in whatever order the cuber shows them. A color is captured
 * automatically when the last STEADY_FRAMES readings are in the guide and agree, so the cuber never
 * has to let go of the cube to press a button.
 */
export function createCalibrator(): Calibrator {
  let captured: readonly Lab[] = [];
  let window: Lab[] = [];
  let state: CalibratorState = { captured, calibration: null, notice: null };
  const set = (notice: Notice | null) => {
    if (notice !== state.notice) state = { ...state, notice };
    return state;
  };

  return {
    get state() {
      return state;
    },
    push(reading) {
      if (state.calibration) return state;
      if (!faceInGuide(reading)) {
        window = [];
        return set("off-guide");
      }
      window = [...window, rgbToLab(reading.center)].slice(-STEADY_FRAMES);
      if (window.length < STEADY_FRAMES) return set(null);
      const center = mean(window);
      if (window.some((l) => deltaE(l, center) > STEADY_DELTA_E)) return set(null);
      if (captured.some((l) => deltaE(l, center) < DISTINCT_DELTA_E)) return set("already-captured");

      captured = [...captured, center];
      const [a, b, c, d, e, f] = captured;
      const calibration: Calibration | null = captured.length === 6 ? [a, b, c, d, e, f] : null;
      state = { captured, calibration, notice: null };
      return state;
    },
  };
}
