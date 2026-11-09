import { deltaE, rgbToLab, type Rgb } from "./calibration";

/** The guide is a square centred in the frame, this fraction of the frame's height on a side. The page draws the same square over the video. */
export const GUIDE_SIZE = 0.6;
/** The guide region is analysed at this many pixels a side (3 stickers of CELL each), whatever the camera resolution. */
export const GUIDE_PX = 144;
const CELL = GUIDE_PX / 3;
const C = GUIDE_PX / 2;

/** What the guide shows at the points that prove a face is held in it. */
export interface GuideReading {
  /** Median color of the patch at the guide's center: the center sticker. */
  readonly center: Rgb;
  /** Colors just inside the center sticker's four edges (in no particular order); all the same as `center` when the sticker is centered. */
  readonly inner: readonly Rgb[];
  /** Lightness (Lab L) of the darkest point in the gap between the center sticker and each neighbour (left, right, above, below). */
  readonly gapLightness: readonly number[];
}

/** Largest Lab distance an inner point may sit from the center color. */
const UNIFORM_DELTA_E = 8;
/** How much darker than the center sticker each gap must be. */
const GAP_DARKER_BY = 8;

type Pixels = ArrayLike<number>;

const region = (data: Pixels, x: number, y: number, w: number, h: number): number[] => {
  const out: number[] = [];
  for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) out.push(...Array.from({ length: 4 }, (_, k) => data[(j * GUIDE_PX + i) * 4 + k]));
  return out;
};

/** Per-channel median of RGBA pixel data; a glare or shadow speck on a few pixels does not move it. */
export function medianRgb(data: Pixels): Rgb {
  const channel = (offset: number) => {
    const values: number[] = [];
    for (let i = offset; i < data.length; i += 4) values.push(data[i]);
    values.sort((a, b) => a - b);
    return values[Math.floor(values.length / 2)];
  };
  return [channel(0), channel(1), channel(2)];
}

const meanRgb = (data: Pixels): Rgb => {
  const n = data.length / 4;
  const sum = [0, 0, 0];
  for (let i = 0; i < data.length; i += 4) for (let k = 0; k < 3; k++) sum[k] += data[i + k];
  return [sum[0] / n, sum[1] / n, sum[2] / n];
};

/** Reads the guide-sized RGBA frame (GUIDE_PX square) at the points that identify a centered face. */
export function readGuide(data: Pixels): GuideReading {
  const patch = (x: number, y: number, side: number) => medianRgb(region(data, x - side / 2, y - side / 2, side, side));
  const inner = [-1, 1].flatMap((s) => [patch(C + s * 14, C, 6), patch(C, C + s * 14, 6)]);
  // Along each direction, average across the gap's length and take the darkest position between the stickers.
  const gap = (dx: number, dy: number) => {
    let darkest = Infinity;
    for (let d = CELL / 3; d <= CELL * (2 / 3); d++) {
      const x = C + dx * d, y = C + dy * d;
      const strip = dx !== 0 ? region(data, Math.round(x), C - 6, 1, 12) : region(data, C - 6, Math.round(y), 12, 1);
      darkest = Math.min(darkest, rgbToLab(meanRgb(strip)).L);
    }
    return darkest;
  };
  return {
    center: patch(C, C, 16),
    inner,
    gapLightness: [gap(-1, 0), gap(1, 0), gap(0, -1), gap(0, 1)],
  };
}

/**
 * True when the center sticker sits in the guide's middle: uniform out to near its edges and bounded
 * by dark gaps on all four sides. A face shifted so the guide's center lands on a gap or a neighbour
 * fails, so that neighbour's color is never learned as the face's.
 */
export function faceInGuide(reading: GuideReading): boolean {
  const center = rgbToLab(reading.center);
  return (
    reading.inner.every((rgb) => deltaE(rgbToLab(rgb), center) <= UNIFORM_DELTA_E) &&
    reading.gapLightness.every((l) => l <= center.L - GAP_DARKER_BY)
  );
}

/** Reads the guide from the current video frame, or null before a frame is available. */
export function sampleGuide(video: HTMLVideoElement, canvas: HTMLCanvasElement): GuideReading | null {
  if (video.videoWidth === 0 || video.readyState < 2) return null;
  const side = video.videoHeight * GUIDE_SIZE;
  canvas.width = GUIDE_PX;
  canvas.height = GUIDE_PX;
  const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
  ctx.drawImage(video, (video.videoWidth - side) / 2, (video.videoHeight - side) / 2, side, side, 0, 0, GUIDE_PX, GUIDE_PX);
  return readGuide(ctx.getImageData(0, 0, GUIDE_PX, GUIDE_PX).data);
}
