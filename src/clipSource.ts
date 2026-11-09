import type { VideoSource } from "./videoSource";

/** A recorded clip (any URL the browser can play) looped into the same video element. */
export class ClipSource implements VideoSource {
  readonly kind = "clip";
  private video: HTMLVideoElement | null = null;

  constructor(private readonly url: string) {}

  async start(video: HTMLVideoElement): Promise<void> {
    this.video = video;
    video.srcObject = null;
    video.src = this.url;
    video.loop = true;
    video.muted = true;
    await video.play();
  }

  stop(): void {
    this.video?.pause();
    this.video?.removeAttribute("src");
    this.video = null;
  }
}
