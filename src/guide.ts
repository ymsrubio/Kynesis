import type { Rgb } from "./calibration";

/** The guide is a square centred in the frame, this fraction of the frame's height on a side. The page draws the same square over the video. */
export const GUIDE_SIZE = 0.6;
/** Fraction of the guide that the center sticker's sampled patch covers (the sticker is a third; stay well inside it). */
const PATCH = 1 / 6;

export interface Rect { x: number; y: number; width: number; height: number }

/** The pixel patch inside the guide's center sticker, for a frame of the given size. */
export function centerPatch(frameWidth: number, frameHeight: number): Rect {
  const guide = frameHeight * GUIDE_SIZE;
  const side = Math.max(1, Math.round(guide * PATCH));
  return { x: Math.round((frameWidth - side) / 2), y: Math.round((frameHeight - side) / 2), width: side, height: side };
}

/** Per-channel median of RGBA pixel data; a glare or shadow speck on a few pixels does not move it. */
export function medianRgb(data: ArrayLike<number>): Rgb {
  const channel = (offset: number) => {
    const values: number[] = [];
    for (let i = offset; i < data.length; i += 4) values.push(data[i]);
    values.sort((a, b) => a - b);
    return values[Math.floor(values.length / 2)];
  };
  return [channel(0), channel(1), channel(2)];
}

/** Reads the center-sticker color from the current video frame, or null before a frame is available. */
export function sampleCenter(video: HTMLVideoElement, canvas: HTMLCanvasElement): Rgb | null {
  if (video.videoWidth === 0 || video.readyState < 2) return null;
  const patch = centerPatch(video.videoWidth, video.videoHeight);
  canvas.width = patch.width;
  canvas.height = patch.height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
  ctx.drawImage(video, patch.x, patch.y, patch.width, patch.height, 0, 0, patch.width, patch.height);
  return medianRgb(ctx.getImageData(0, 0, patch.width, patch.height).data);
}
