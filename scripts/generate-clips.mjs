// Renders public/clips/test-pattern.webm: a moving color-block pattern, recorded from a
// canvas with MediaRecorder inside Chromium (no ffmpeg needed). Run: npm run clips:generate
// Later tickets add their synthetic cube clips the same way: draw frames, record, write a file.
import { chromium } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const out = resolve(dirname(fileURLToPath(import.meta.url)), "../public/clips/test-pattern.webm");

const browser = await chromium.launch();
const page = await browser.newPage();
const base64 = await page.evaluate(async () => {
  const canvas = document.createElement("canvas");
  canvas.width = 320;
  canvas.height = 240;
  const ctx = canvas.getContext("2d");
  const colors = ["#c41e3a", "#ff5800", "#0051ba", "#009e60", "#ffd500", "#ffffff"];
  const fps = 15;
  const frames = fps * 2;
  const recorder = new MediaRecorder(canvas.captureStream(fps), { mimeType: "video/webm;codecs=vp8" });
  const chunks = [];
  recorder.ondataavailable = (e) => chunks.push(e.data);
  const stopped = new Promise((r) => (recorder.onstop = r));
  recorder.start();
  for (let f = 0; f < frames; f++) {
    for (let i = 0; i < 6; i++) {
      ctx.fillStyle = colors[(i + f) % 6];
      ctx.fillRect((i % 3) * 107, Math.floor(i / 3) * 120, 107, 120);
    }
    await new Promise((r) => setTimeout(r, 1000 / fps));
  }
  recorder.stop();
  await stopped;
  const bytes = new Uint8Array(await new Blob(chunks).arrayBuffer());
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s);
});
await browser.close();

mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, Buffer.from(base64, "base64"));
console.log(`wrote ${out}`);
