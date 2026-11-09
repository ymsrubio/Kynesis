import { chooseSource } from "./chooseSource";

const video = document.querySelector<HTMLVideoElement>("#feed")!;
const status = document.querySelector<HTMLElement>("#status")!;
const source = chooseSource(window.location.search);

source
  .start(video)
  .then(() => {
    status.textContent = source.kind === "camera" ? "Live camera" : "Recorded clip";
    status.dataset.state = "playing";
  })
  .catch((err: unknown) => {
    status.textContent = `Could not start the ${source.kind}: ${err instanceof Error ? err.message : String(err)}`;
    status.dataset.state = "error";
  });
