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
  notice: document.querySelector<HTMLElement>("#calibration-notice")!,
  swatches: [...document.querySelectorAll<HTMLElement>("[data-slot]")],
});
