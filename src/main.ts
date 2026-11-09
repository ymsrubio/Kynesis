import { FACES, type Face } from "./calibration";
import { mountCalibration } from "./calibrationUi";
import { chooseSource } from "./chooseSource";
import { startFeed } from "./startFeed";

const video = document.querySelector<HTMLVideoElement>("#feed")!;
const status = document.querySelector<HTMLElement>("#status")!;

void startFeed(chooseSource(window.location.search, window.location.origin), video, status);

mountCalibration({
  video,
  button: document.querySelector<HTMLButtonElement>("#calibrate")!,
  prompt: document.querySelector<HTMLElement>("#calibration-prompt")!,
  swatches: Object.fromEntries(
    FACES.map((f) => [f, document.querySelector<HTMLElement>(`[data-face="${f}"]`)!]),
  ) as Record<Face, HTMLElement>,
});
