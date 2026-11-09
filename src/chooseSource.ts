import { CameraSource } from "./cameraSource";
import { ClipSource } from "./clipSource";
import type { VideoSource } from "./videoSource";

/** `?clip=<url>` plays that recorded clip; otherwise the live camera is used. */
export function chooseSource(search: string): VideoSource {
  const clip = new URLSearchParams(search).get("clip");
  return clip ? new ClipSource(clip) : new CameraSource();
}
