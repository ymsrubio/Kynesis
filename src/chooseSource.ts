import { CameraSource } from "./cameraSource";
import { ClipSource } from "./clipSource";
import type { VideoSource } from "./videoSource";

/** `?clip=<path>` plays that recorded clip if it resolves to this page's own origin; anything else uses the live camera. */
export function chooseSource(search: string, origin: string): VideoSource {
  const clip = new URLSearchParams(search).get("clip");
  if (clip) {
    try {
      const resolved = new URL(clip, origin);
      if (resolved.origin === origin) return new ClipSource(resolved.href);
    } catch {
      // unparseable: fall through to the camera
    }
  }
  return new CameraSource();
}
