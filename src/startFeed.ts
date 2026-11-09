import type { VideoSource } from "./videoSource";

/** Starts `source` into `video` and reports the outcome in `status`. */
export async function startFeed(
  source: Pick<VideoSource, "kind" | "start">,
  video: HTMLVideoElement,
  status: HTMLElement,
): Promise<void> {
  try {
    await source.start(video);
  } catch (err) {
    // play() can reject (e.g. interrupted by a reload of src) while the video plays on.
    if (video.paused) {
      status.textContent = `Could not start the ${source.kind}: ${err instanceof Error ? err.message : String(err)}`;
      status.dataset.state = "error";
      return;
    }
  }
  status.textContent = source.kind === "camera" ? "Live camera" : "Recorded clip";
  status.dataset.state = "playing";
}
