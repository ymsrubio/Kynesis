import { COLOR_CLASSES, labToRgb } from "./calibration";
import { calibrationStore } from "./calibrationStore";
import { createCalibrator, type Calibrator, type CalibratorState } from "./calibrator";
import { sampleGuide } from "./guide";

const hex = ([r, g, b]: readonly number[]) =>
  "#" + [r, g, b].map((v) => Math.round(v).toString(16).padStart(2, "0")).join("");

const NOTICES = {
  "off-guide": "Move the face into the guide, with its center sticker in the middle square.",
  "already-captured": "That color is already captured. Show a face you have not shown yet.",
} as const;

export interface CalibrationElements {
  video: HTMLVideoElement;
  button: HTMLButtonElement;
  prompt: HTMLElement;
  notice: HTMLElement;
  /** Six slots, one per color class. */
  swatches: readonly HTMLElement[];
}

/** Wires the guided Calibration: Start/Recalibrate button, prompt, feedback, and the learned-color swatches. */
export function mountCalibration(els: CalibrationElements): void {
  const canvas = document.createElement("canvas");
  let calibrator: Calibrator | null = null;
  let run = 0; // restarting abandons the previous frame loop

  const render = (state: CalibratorState) => {
    for (const c of COLOR_CLASSES) {
      const lab = state.captured[c];
      const el = els.swatches[c];
      if (lab) {
        const color = hex(labToRgb(lab));
        el.dataset.color = color;
        el.style.background = color;
      } else {
        delete el.dataset.color;
        el.style.background = "";
      }
    }
    if (state.calibration) {
      els.prompt.textContent = "Calibrated. These are this cube's six colors.";
      els.prompt.dataset.state = "done";
      els.button.textContent = "Recalibrate";
    } else {
      els.prompt.textContent = `Face ${state.captured.length + 1} of 6: hold a face you have not shown yet still inside the guide`;
      els.prompt.dataset.state = "waiting";
    }
    els.notice.textContent = state.notice ? NOTICES[state.notice] : "";
  };

  const onFrame = (id: number) => {
    if (id !== run || !calibrator || calibrator.state.calibration) return;
    const reading = sampleGuide(els.video, canvas);
    if (reading) {
      const before = calibrator.state;
      const after = calibrator.push(reading);
      if (after !== before) {
        render(after);
        if (after.calibration) calibrationStore.set(after.calibration);
      }
    }
    schedule(id);
  };
  const schedule = (id: number) => {
    const cb = () => onFrame(id);
    if ("requestVideoFrameCallback" in els.video) els.video.requestVideoFrameCallback(cb);
    else requestAnimationFrame(cb);
  };

  els.button.addEventListener("click", () => {
    calibrationStore.clear();
    calibrator = createCalibrator();
    els.button.textContent = "Restart";
    render(calibrator.state);
    schedule(++run);
  });
}
