import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the lazy-loaded audio data module (also intercepts dynamic import)
vi.mock("../../src/audio/audio-data", () => ({
  AUDIO_DATA: new Map([["consonant-ko-kai", "FAKE_BASE64"]]),
}));

import { warmupVoiceover, speakChar, stopCharVoiceover } from "../../src/audio/speech";

// The module creates `const voiceEl = new Audio()` at load time using jsdom's
// Audio. jsdom stubs play/pause as "not implemented", so override them here
// (after import, but before any test function runs).
const mockPlay = vi.fn(() => Promise.resolve());
const mockPause = vi.fn();
HTMLMediaElement.prototype.play = mockPlay;
HTMLMediaElement.prototype.pause = mockPause;

describe("speech audio unlock", () => {
  beforeEach(() => {
    mockPlay.mockClear();
    mockPause.mockClear();
  });

  it("warmupVoiceover plays silent WAV and is idempotent", () => {
    warmupVoiceover();
    expect(mockPlay).toHaveBeenCalledTimes(1);

    // Second call should be a no-op (_warmedUp flag)
    mockPlay.mockClear();
    warmupVoiceover();
    expect(mockPlay).not.toHaveBeenCalled();
  });

  it("speakChar does not create new Audio instances", async () => {
    const OrigAudio = window.Audio;
    const ctorSpy = vi.fn();
    window.Audio = function (...args: unknown[]) {
      ctorSpy();
      return new OrigAudio(...(args as []));
    } as unknown as typeof Audio;

    speakChar("ก");
    await new Promise(r => setTimeout(r, 0));
    expect(ctorSpy).not.toHaveBeenCalled();

    window.Audio = OrigAudio;
  });

  it("speakChar pauses current audio then plays new char", async () => {
    speakChar("ก");
    expect(mockPause).toHaveBeenCalled();

    await new Promise(r => setTimeout(r, 0));
    expect(mockPlay).toHaveBeenCalled();
  });

  it("speakChar with unknown char does not call play", async () => {
    speakChar("X");
    await new Promise(r => setTimeout(r, 0));
    expect(mockPlay).not.toHaveBeenCalled();
  });

  it("stopCharVoiceover pauses and resets position", () => {
    stopCharVoiceover();
    expect(mockPause).toHaveBeenCalled();
  });
});
