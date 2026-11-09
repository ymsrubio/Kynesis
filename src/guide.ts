import { deltaE, rgbToLab, type Rgb } from "./calibration";

/** The guide is a square centred in the frame, this fraction of the frame's height on a side. The page draws the same square over the video. */
export const GUIDE_SIZE = 0.6;
/** The guide region is analysed at this many pixels a side (3 stickers of CELL each), whatever the camera resolution. */
export const GUIDE_PX = 144;
const CELL = GUIDE_PX / 3;
const C = GUIDE_PX / 2;

/** Distances from the guide's center to the dark gap bounding the center sticker on each side; Infinity if no gap is found. */
export interface Extent { readonly left: number; readonly right: number; readonly up: number; readonly down: number }

/** What the guide shows where it should hold the center sticker. */
export interface GuideReading {
  /** Median color at the guide's center, which `faceInGuide` has confirmed lies inside the center sticker. */
  readonly center: Rgb;
  /** Colors just inside the measured edges of that sticker; all the same as `center` when the sticker is uniform. */
  readonly inner: readonly Rgb[];
  readonly extent: Extent;
}

/** Largest Lab distance an inner point may sit from the center color. */
const UNIFORM_DELTA_E = 8;
/** How much darker than the center sticker a gap must be. */
const GAP_DARKER_BY = 8;
/** How far from the guide's center to look for a gap. */
const MAX_SCAN = CELL * 0.75;
/** A sticker measures about CELL minus its gaps across; accept this range. */
const WIDTH = [CELL * 0.65, CELL * 1.15] as const;
/** How far the sticker's middle may sit from the guide's center: a third of a sticker. */
const MAX_OFFSET = CELL / 3;

type Pixels = ArrayLike<number>;

const region = (data: Pixels, x: number, y: number, w: number, h: number): number[] => {
  const out: number[] = [];
  for (let j = y; j < y + h; j++) {
    for (let i = x; i < x + w; i++) {
      const o = (j * GUIDE_PX + i) * 4;
      out.push(data[o], data[o + 1], data[o + 2], data[o + 3]);
    }
  }
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

/**
 * Reads the guide-sized RGBA frame (GUIDE_PX square). Scans outward from the guide's center along each
 * axis to the dark gap that bounds the center sticker, then samples the sticker's own middle and
 * edges, so the check follows the sticker instead of fixed offsets.
 */
export function readGuide(data: Pixels): GuideReading {
  const patch = (x: number, y: number, side: number) =>
    medianRgb(region(data, Math.round(x - side / 2), Math.round(y - side / 2), side, side));
  const reference = rgbToLab(patch(C, C, 16)).L;
  const scan = (dx: number, dy: number) => {
    for (let d = 1; d <= MAX_SCAN; d++) {
      const x = Math.round(C + dx * d), y = Math.round(C + dy * d);
      const strip = dx !== 0 ? region(data, x, C - 6, 1, 12) : region(data, C - 6, y, 12, 1);
      if (rgbToLab(meanRgb(strip)).L <= reference - GAP_DARKER_BY) return d;
    }
    return Infinity;
  };
  const extent = { left: scan(-1, 0), right: scan(1, 0), up: scan(0, -1), down: scan(0, 1) };
  const mx = C + (extent.right - extent.left) / 2; // the sticker's measured middle
  const my = C + (extent.down - extent.up) / 2;
  if (![mx, my].every(Number.isFinite)) return { center: patch(C, C, 16), inner: [], extent };
  const hx = (extent.left + extent.right) / 2 - 8;
  const hy = (extent.up + extent.down) / 2 - 8;
  return {
    center: patch(C, C, 16),
    inner: [patch(mx - hx, my, 6), patch(mx + hx, my, 6), patch(mx, my - hy, 6), patch(mx, my + hy, 6)],
    extent,
  };
}

/**
 * True when the center sticker is found, about sticker-sized, near the guide's middle, and uniform out
 * to its edges. A face shifted so the guide's center lands on a gap or a neighbour fails, so that
 * neighbour's color is never learned as the face's.
 */
export function faceInGuide({ center, inner, extent }: GuideReading): boolean {
  const { left, right, up, down } = extent;
  if (![left, right, up, down].every(Number.isFinite)) return false;
  const widths = [left + right, up + down];
  if (widths.some((w) => w < WIDTH[0] || w > WIDTH[1])) return false;
  if (Math.abs(right - left) / 2 > MAX_OFFSET || Math.abs(down - up) / 2 > MAX_OFFSET) return false;
  const lab = rgbToLab(center);
  return inner.length === 4 && inner.every((rgb) => deltaE(rgbToLab(rgb), lab) <= UNIFORM_DELTA_E);
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
