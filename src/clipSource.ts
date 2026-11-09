import type { VideoSource } from "./videoSource";

/** A recorded clip (any URL the browser can play) looped into the same video element. */
export class ClipSource implements VideoSource {
  readonly kind = "clip";

  constructor(private readonly url: string) {}

  async start(video: HTMLVideoElement): Promise<void> {
    video.srcObject = null;
    video.src = this.url;
    video.loop = true;
    video.muted = true;
    await video.play();
  }
}
