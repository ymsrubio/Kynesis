export type Face = "U" | "R" | "F" | "D" | "L" | "B";
export type Rgb = readonly [r: number, g: number, b: number];
export interface Lab { readonly L: number; readonly a: number; readonly b: number }

/** How one Speedcube's six sticker colors look under the current lighting, keyed by the face they belong to. */
export type Calibration = Readonly<Record<Face, Lab>>;

export const FACES: readonly Face[] = ["U", "F", "R", "B", "L", "D"];

const WHITE = [0.95047, 1, 1.08883] as const; // D65

const linear = (c: number) => {
  const v = Math.min(255, Math.max(0, c)) / 255;
  return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
};
const f = (t: number) => (t > 216 / 24389 ? Math.cbrt(t) : (24389 / 27 * t + 16) / 116);

/** sRGB (0-255) to CIE Lab under D65. Lab distances track perceived color difference, so lighting shifts move all colors together. */
export function rgbToLab([r, g, b]: Rgb): Lab {
  const [lr, lg, lb] = [linear(r), linear(g), linear(b)];
  const x = f((0.4124564 * lr + 0.3575761 * lg + 0.1804375 * lb) / WHITE[0]);
  const y = f(0.2126729 * lr + 0.7151522 * lg + 0.072175 * lb);
  const z = f((0.0193339 * lr + 0.119192 * lg + 0.9503041 * lb) / WHITE[2]);
  return { L: 116 * y - 16, a: 500 * (x - y), b: 200 * (y - z) };
}

/** CIE76 color difference: Euclidean distance in Lab. */
export function deltaE(x: Lab, y: Lab): number {
  return Math.hypot(x.L - y.L, x.a - y.a, x.b - y.b);
}

/** The face whose calibrated color is nearest the sample. Pure: same inputs, same face. */
export function classify(calibration: Calibration, rgb: Rgb): Face {
  const sample = rgbToLab(rgb);
  let best: Face = FACES[0];
  for (const face of FACES) {
    if (deltaE(calibration[face], sample) < deltaE(calibration[best], sample)) best = face;
  }
  return best;
}

/** How the cuber is asked for each face: the standard color scheme puts white on U, green on F, red on R, blue on B, orange on L, yellow on D. */
export const FACE_COLOR_NAME: Readonly<Record<Face, string>> = {
  U: "white", F: "green", R: "red", B: "blue", L: "orange", D: "yellow",
};

const finv = (t: number) => (t ** 3 > 216 / 24389 ? t ** 3 : (116 * t - 16) / (24389 / 27));
const gamma = (v: number) => 255 * (v <= 0.0031308 ? 12.92 * v : 1.055 * v ** (1 / 2.4) - 0.055);

/** Lab back to sRGB (0-255, clamped), for drawing a learned color. */
export function labToRgb({ L, a, b }: Lab): Rgb {
  const y = (L + 16) / 116;
  const x = finv(y + a / 500) * WHITE[0];
  const z = finv(y - b / 200) * WHITE[2];
  const yy = finv(y);
  const lin = [
    3.2404542 * x - 1.5371385 * yy - 0.4985314 * z,
    -0.969266 * x + 1.8760108 * yy + 0.041556 * z,
    0.0556434 * x - 0.2040259 * yy + 1.0572252 * z,
  ];
  return lin.map((v) => Math.min(255, Math.max(0, gamma(Math.max(0, v))))) as unknown as Rgb;
}
