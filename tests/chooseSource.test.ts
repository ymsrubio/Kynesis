import { describe, expect, it } from "vitest";
import { chooseSource } from "../src/chooseSource";

const ORIGIN = "http://localhost:4173";

describe("chooseSource", () => {
  it("uses the live camera when the page URL names no clip", () => {
    expect(chooseSource("", ORIGIN).kind).toBe("camera");
  });

  it("plays a recorded clip when the page URL has ?clip=<url>", () => {
    expect(chooseSource("?clip=/clips/test-pattern.webm", ORIGIN).kind).toBe("clip");
  });

  it("falls back to the camera when the clip parameter is empty", () => {
    expect(chooseSource("?clip=", ORIGIN).kind).toBe("camera");
  });
});

describe("chooseSource same-origin rule", () => {
  it.each(["/\t/x", "/\n/x", "//x", "/\\x", "https://x", "javascript:alert(1)"])(
    "ignores the off-device clip %s and uses the camera",
    (clip) => {
      expect(chooseSource(`?clip=${encodeURIComponent(clip)}`, ORIGIN).kind).toBe("camera");
    },
  );
});
