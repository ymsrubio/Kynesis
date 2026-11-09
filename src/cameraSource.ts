import type { VideoSource } from "./videoSource";

/** Live webcam via getUserMedia. Frames stay in this page; nothing is uploaded. */
export class CameraSource implements VideoSource {
  readonly kind = "camera";
  private stream: MediaStream | null = null;

  async start(video: HTMLVideoElement): Promise<void> {
    this.stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "user" },
      audio: false,
    });
    video.srcObject = this.stream;
    await video.play();
  }

  stop(): void {
    this.stream?.getTracks().forEach((t) => t.stop());
    this.stream = null;
  }
}
