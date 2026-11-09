import { describe, expect, it } from "vitest";
import { chooseSource } from "../src/chooseSource";

describe("chooseSource", () => {
  it("uses the live camera when the page URL names no clip", () => {
    expect(chooseSource("").kind).toBe("camera");
  });

  it("plays a recorded clip when the page URL has ?clip=<url>", () => {
    expect(chooseSource("?clip=/clips/test-pattern.webm").kind).toBe("clip");
  });

  it("falls back to the camera when the clip parameter is empty", () => {
    expect(chooseSource("?clip=").kind).toBe("camera");
  });
});

describe("chooseSource same-origin rule", () => {
  it.each(["https://evil.test/a.webm", "//evil.test/a.webm", "/\\evil.test/a.webm", "a.webm"])(
    "ignores the off-device clip %s and uses the camera",
    (clip) => {
      expect(chooseSource(`?clip=${encodeURIComponent(clip)}`).kind).toBe("camera");
    },
  );
});
