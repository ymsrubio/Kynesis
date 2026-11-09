# Kynesis

Watches a cuber turn a speedcube through the webcam and logs the moves. All video processing stays in the browser (ADR 0001).

- `npm run dev` / `npm run build`
- `npm test` runs unit (Vitest) and browser (Playwright) tests
- Replay a recorded clip (same-origin path only) instead of the camera: `/?clip=/clips/test-pattern.webm`
- `npm run clips:generate` regenerates the committed test clip (`scripts/generate-clips.mjs`). It needs `npx playwright install chromium` first, and reproduces the clip's content, not identical bytes.
