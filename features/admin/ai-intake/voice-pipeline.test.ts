import { describe, expect, it } from "vitest";

import { parseAudioDataUrlForTest } from "@/features/admin/ai-intake/voice-pipeline";

describe("parseAudioDataUrl", () => {
  it("parses plain base64 audio data URLs", () => {
    const dataUrl =
      "data:audio/webm;base64," + Buffer.from("abc").toString("base64");
    const parsed = parseAudioDataUrlForTest(dataUrl);
    expect(parsed?.mime).toBe("audio/webm");
    expect(Buffer.from(parsed!.bytes).toString()).toBe("abc");
  });

  it("parses MediaRecorder URLs with codecs params", () => {
    const dataUrl =
      "data:audio/webm;codecs=opus;base64," +
      Buffer.from("opus-bytes").toString("base64");
    const parsed = parseAudioDataUrlForTest(dataUrl);
    expect(parsed).not.toBeNull();
    expect(parsed?.mime).toBe("audio/webm");
    expect(Buffer.from(parsed!.bytes).toString()).toBe("opus-bytes");
  });

  it("parses mp4 codec strings from Safari", () => {
    const dataUrl =
      "data:audio/mp4;codecs=mp4a.40.2;base64," +
      Buffer.from("aac").toString("base64");
    const parsed = parseAudioDataUrlForTest(dataUrl);
    expect(parsed?.mime).toBe("audio/mp4");
  });
});
