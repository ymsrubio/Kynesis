import { describe, expect, it } from "vitest";
import { startFeed } from "../src/startFeed";

const video = (paused: boolean) => ({ paused }) as HTMLVideoElement;
const status = () => ({ textContent: "", dataset: {} as Record<string, string> }) as unknown as HTMLElement;
const failing = (message: string) => ({ kind: "clip" as const, start: () => Promise.reject(new Error(message)) });

describe("startFeed", () => {
  it("reports playing when the source starts", async () => {
    const s = status();
    await startFeed({ kind: "camera", start: () => Promise.resolve() }, video(false), s);
    expect(s.dataset.state).toBe("playing");
  });

  it("does not report an error when play() was interrupted but the video is playing", async () => {
    const s = status();
    await startFeed(failing("The play() request was interrupted"), video(false), s);
    expect(s.dataset.state).toBe("playing");
  });

  it("reports an error when the source fails and the video is not playing", async () => {
    const s = status();
    await startFeed(failing("Permission denied"), video(true), s);
    expect(s.dataset.state).toBe("error");
    expect(s.textContent).toContain("Permission denied");
  });
});
