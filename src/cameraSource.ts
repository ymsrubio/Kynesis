import type { VideoSource } from "./videoSource";

/** Live webcam via getUserMedia. Frames stay in this page; nothing is uploaded. */
export class CameraSource implements VideoSource {
  readonly kind = "camera";
  async start(video: HTMLVideoElement): Promise<void> {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "user" },
      audio: false,
    });
    video.srcObject = stream;
    await video.play();
  }
}
