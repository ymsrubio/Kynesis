// Renders the synthetic clips in public/clips/, recorded from a canvas with MediaRecorder inside
// Chromium (no ffmpeg needed). Run: npm run clips:generate
//   test-pattern.webm  a moving color-block pattern (scaffold smoke test)
//   cube-faces.webm    a Speedcube face held inside the guide, one face after another (U F R B L D),
//                      each held ~1.3s after a ~0.5s slide-in, with mild lighting drift and sensor noise
// The picture is deterministic (seeded noise, fixed lighting per face); the WebM bytes can differ
// run to run because MediaRecorder encodes in real time.
import { chromium } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const outDir = resolve(dirname(fileURLToPath(import.meta.url)), "../public/clips");
mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage();

/** window.record(width, height, fps, frames, draw(ctx, frameIndex)) -> base64 WebM */
await page.addScriptTag({
  content: `window.record = async (width, height, fps, frames, draw) => {
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    const recorder = new MediaRecorder(canvas.captureStream(fps), { mimeType: "video/webm;codecs=vp8", videoBitsPerSecond: 4000000 });
    const chunks = [];
    recorder.ondataavailable = (e) => chunks.push(e.data);
    const stopped = new Promise((r) => (recorder.onstop = r));
    recorder.start();
    for (let f = 0; f < frames; f++) {
      draw(ctx, f);
      await new Promise((r) => setTimeout(r, 1000 / fps));
    }
    recorder.stop();
    await stopped;
    const bytes = new Uint8Array(await new Blob(chunks).arrayBuffer());
    let s = "";
    for (const b of bytes) s += String.fromCharCode(b);
    return btoa(s);
  };`,
});

const write = (name, base64) => {
  const file = resolve(outDir, name);
  writeFileSync(file, Buffer.from(base64, "base64"));
  console.log(`wrote ${file}`);
};

write(
  "test-pattern.webm",
  await page.evaluate(() => {
    const colors = ["#c41e3a", "#ff5800", "#0051ba", "#009e60", "#ffd500", "#ffffff"];
    return window.record(320, 240, 15, 30, (ctx, f) => {
      for (let i = 0; i < 6; i++) {
        ctx.fillStyle = colors[(i + f) % 6];
        ctx.fillRect((i % 3) * 107, Math.floor(i / 3) * 120, 107, 120);
      }
    });
  }),
);

write(
  "cube-faces.webm",
  await page.evaluate(() => {
    const W = 320, H = 240, FPS = 15, SLIDE = 8, HOLD = 20;
    // Standard color scheme. Order shown: U F R B L D (the order the page asks for).
    const STANDARD = { U: [255, 255, 255], F: [0, 158, 96], R: [196, 30, 58], B: [0, 81, 186], L: [255, 88, 0], D: [255, 213, 0] };
    const ORDER = ["U", "F", "R", "B", "L", "D"];
    // Mild per-face lighting: brightness and a warm/cool tint, as if the room or the cuber's angle shifts.
    const LIGHT = { U: [1.0, [1.04, 1, 0.96]], F: [0.9, [1, 1.02, 0.98]], R: [1.05, [1.05, 1, 0.95]], B: [0.85, [0.97, 1, 1.05]], L: [0.95, [1.03, 1, 0.97]], D: [1.1, [1.02, 1, 0.94]] };
    let seed = 20240607; // mulberry32: same noise every run
    const rand = () => {
      seed = (seed + 0x6d2b79f5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    // Non-center stickers are other colors, so only the center sticker identifies the face.
    const others = (face) => {
      const pool = ORDER.filter((f) => f !== face);
      return Array.from({ length: 9 }, (_, i) => (i === 4 ? face : pool[Math.floor(rand() * pool.length)]));
    };
    const stickers = Object.fromEntries(ORDER.map((f) => [f, others(f)]));
    const guide = H * 0.6, cell = guide / 3, gap = 4;
    const shade = (face, rgb) => {
      const [k, tint] = LIGHT[face];
      return rgb.map((v, i) => Math.min(255, v * k * tint[i]));
    };
    return window.record(W, H, FPS, ORDER.length * (SLIDE + HOLD), (ctx, f) => {
      const seg = Math.floor(f / (SLIDE + HOLD));
      const inSeg = f % (SLIDE + HOLD);
      const face = ORDER[seg];
      ctx.fillStyle = "#3a3a3a";
      ctx.fillRect(0, 0, W, H);
      // Slide in from the left edge to the guide, then hold.
      const t = inSeg < SLIDE ? inSeg / SLIDE : 1;
      const x0 = (W - guide) / 2 - (1 - t) * W;
      const y0 = (H - guide) / 2;
      ctx.fillStyle = "#050505";
      ctx.fillRect(x0 - 4, y0 - 4, guide + 8, guide + 8);
      stickers[face].forEach((s, i) => {
        const c = shade(face, STANDARD[s]);
        ctx.fillStyle = `rgb(${c[0]},${c[1]},${c[2]})`;
        ctx.fillRect(x0 + (i % 3) * cell + gap / 2, y0 + Math.floor(i / 3) * cell + gap / 2, cell - gap, cell - gap);
      });
      // Sensor noise on the whole frame.
      const img = ctx.getImageData(0, 0, W, H);
      for (let i = 0; i < img.data.length; i += 4) {
        const n = (rand() - 0.5) * 12;
        img.data[i] += n;
        img.data[i + 1] += n;
        img.data[i + 2] += n;
      }
      ctx.putImageData(img, 0, 0);
    });
  }),
);

await browser.close();
