import { FACES, FACE_COLOR_NAME, labToRgb, type Face } from "./calibration";
import { calibrationStore } from "./calibrationStore";
import { createCalibrator, type Calibrator, type CalibratorState } from "./calibrator";
import { sampleCenter } from "./guide";

const hex = ([r, g, b]: readonly number[]) =>
  "#" + [r, g, b].map((v) => Math.round(v).toString(16).padStart(2, "0")).join("");

export interface CalibrationElements {
  video: HTMLVideoElement;
  button: HTMLButtonElement;
  prompt: HTMLElement;
  swatches: Record<Face, HTMLElement>;
}

/** Wires the guided Calibration: Start/Recalibrate button, per-face prompt, and the learned-color swatches. */
export function mountCalibration(els: CalibrationElements): void {
  const canvas = document.createElement("canvas");
  let calibrator: Calibrator | null = null;
  let run = 0; // restarting abandons the previous frame loop

  const render = (state: CalibratorState) => {
    for (const face of FACES) {
      const lab = state.captured[face];
      const el = els.swatches[face];
      if (lab) {
        const color = hex(labToRgb(lab));
        el.dataset.color = color;
        el.style.background = color;
      } else {
        delete el.dataset.color;
        el.style.background = "";
      }
    }
    if (state.next) {
      const n = FACES.indexOf(state.next) + 1;
      els.prompt.textContent = `Face ${n} of 6: hold the ${FACE_COLOR_NAME[state.next]}-centered face still inside the guide`;
      els.prompt.dataset.state = "waiting";
    } else {
      els.prompt.textContent = "Calibrated. These are this cube's six colors.";
      els.prompt.dataset.state = "done";
      els.button.textContent = "Recalibrate";
    }
  };

  const onFrame = (id: number) => {
    if (id !== run || !calibrator || calibrator.state.next === null) return;
    const rgb = sampleCenter(els.video, canvas);
    if (rgb) {
      const before = calibrator.state;
      const after = calibrator.push(rgb);
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
