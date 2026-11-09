import { FACES, deltaE, rgbToLab, type Calibration, type Face, type Lab, type Rgb } from "./calibration";

export interface CalibratorState {
  /** The face the cuber should show next; null once all six are captured. */
  readonly next: Face | null;
  readonly captured: Readonly<Partial<Record<Face, Lab>>>;
  readonly calibration: Calibration | null;
}

export interface Calibrator {
  /** Feed the center-sticker color sampled from one video frame. */
  push(rgb: Rgb): CalibratorState;
  readonly state: CalibratorState;
}

/** Frames in a row the center sticker must hold still before it is sampled (about half a second at 30 fps). */
export const STEADY_FRAMES = 10;
/** Largest Lab distance a reading may sit from the window's mean and still count as held still; above sensor noise, below any hand movement. */
export const STEADY_DELTA_E = 4;
/** A new face must differ from every face already captured by at least this much, so holding one face up twice cannot fill two slots. */
export const DISTINCT_DELTA_E = 20;

const mean = (labs: Lab[]): Lab => ({
  L: labs.reduce((s, x) => s + x.L, 0) / labs.length,
  a: labs.reduce((s, x) => s + x.a, 0) / labs.length,
  b: labs.reduce((s, x) => s + x.b, 0) / labs.length,
});

/**
 * Walks the faces in order. A face is captured automatically when the last STEADY_FRAMES readings
 * agree, so the cuber never has to let go of the cube to press a button.
 */
export function createCalibrator(): Calibrator {
  let captured: Partial<Record<Face, Lab>> = {};
  let window: Lab[] = [];
  let state: CalibratorState = { next: FACES[0], captured, calibration: null };

  return {
    get state() {
      return state;
    },
    push(rgb) {
      if (state.next === null) return state;
      window = [...window, rgbToLab(rgb)].slice(-STEADY_FRAMES);
      if (window.length < STEADY_FRAMES) return state;
      const center = mean(window);
      if (window.some((l) => deltaE(l, center) > STEADY_DELTA_E)) return state;
      if (Object.values(captured).some((l) => deltaE(l, center) < DISTINCT_DELTA_E)) return state;

      captured = { ...captured, [state.next]: center };
      const next = FACES.find((f) => captured[f] === undefined) ?? null;
      const calibration = next === null ? ({ ...captured } as Calibration) : null;
      state = { next, captured, calibration };
      return state;
    },
  };
}
