import type { Calibration } from "./calibration";

let current: Calibration | null = null;

/** The Calibration in force, held in memory only: gone on reload, replaced on recalibration. */
export const calibrationStore = {
  get: (): Calibration | null => current,
  set: (c: Calibration): void => {
    current = c;
  },
  clear: (): void => {
    current = null;
  },
};
