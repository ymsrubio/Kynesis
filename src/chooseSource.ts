import { CameraSource } from "./cameraSource";
import { ClipSource } from "./clipSource";
import type { VideoSource } from "./videoSource";

const isSameOriginPath = (url: string) => /^\/(?![/\\])/.test(url);

/** `?clip=/path` plays that recorded clip from this site; anything else uses the live camera. */
export function chooseSource(search: string): VideoSource {
  const clip = new URLSearchParams(search).get("clip");
  return clip && isSameOriginPath(clip) ? new ClipSource(clip) : new CameraSource();
}
