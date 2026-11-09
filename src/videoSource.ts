/** Where the pipeline's video comes from: the live camera or a recorded clip. */
export interface VideoSource {
  readonly kind: "camera" | "clip";
  /** Starts playing into `video`. Rejects if the source cannot be opened. */
  start(video: HTMLVideoElement): Promise<void>;
}
