// __tests__/lib/ubuntudj/misconceptionDetector.test.ts
// ============================================================================
// FULL UNIT TEST SUITE FOR MISCONCEPTION DETECTOR
// ============================================================================
// Tests every rule condition and the main detectMisconception function.

import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  detectMisconception,
  RuleConditions,
  createEmptyContext,
  isMisconceptionOnCooldown,
  UserActionEvent,
  DeckState,
} from "@/lib/ubuntudj/detector/misconceptionDetector";
import { MISCONCEPTIONS } from "@/lib/ubuntudj/types/misconceptions";
import { SessionIntent } from "@/lib/ubuntudj/hooks/useSessionIntent";

// ============================================================================
// MOCK DATA
// ============================================================================

const mockTrack = {
  id: 1,
  title: "Test Track",
  artist: "Test Artist",
  bpm: 124,
  key: "Am",
  genre: "Afro House",
  energy: 80,
};

const mockDeckA: DeckState = {
  track: mockTrack,
  playing: true,
  pitch: 0,
  bpm: 124,
  volume: 80,
  eqHigh: 75,
  eqMid: 75,
  eqLow: 75,
  progress: 0.5,
  cued: false,
};

const mockDeckB: DeckState = {
  track: { ...mockTrack, id: 2, title: "Other Track", bpm: 124 },
  playing: false,
  pitch: 0,
  bpm: 124,
  volume: 80,
  eqHigh: 75,
  eqMid: 75,
  eqLow: 75,
  progress: 0,
  cued: true,
};

const mockContext = createEmptyContext();

const noCooldown = () => false;

// ============================================================================
// HELPER: Get misconception by ID
// ============================================================================

function getMisconception(id: string) {
  return MISCONCEPTIONS.find((m) => m.id === id);
}

// ============================================================================
// TESTS: RuleConditions (individual rule functions)
// ============================================================================

describe("RuleConditions", () => {
  describe("beatmatchSameBPMOnly (M001)", () => {
    it("returns true when BPMs are close and no pitch bend used recently", () => {
      const event: UserActionEvent = {
        type: "tempo_slider_moved",
        deck: "B",
        value: 0,
        timestamp: Date.now(),
      };
      const deckBAdjusted = { ...mockDeckB, pitch: 0 };
      const result = RuleConditions.beatmatchSameBPMOnly(
        event,
        mockDeckA,
        deckBAdjusted,
        { ...mockContext, recentActions: [] }
      );
      expect(result).toBe(true);
    });

    it("returns false when BPMs are not close", () => {
      const event: UserActionEvent = {
        type: "tempo_slider_moved",
        deck: "B",
        value: 50,
        timestamp: Date.now(),
      };
      const deckBAdjusted = { ...mockDeckB, pitch: 0 };
      const result = RuleConditions.beatmatchSameBPMOnly(
        event,
        mockDeckA,
        deckBAdjusted,
        mockContext
      );
      expect(result).toBe(false);
    });

    it("returns false when pitch bend was used recently", () => {
      const event: UserActionEvent = {
        type: "tempo_slider_moved",
        deck: "B",
        value: 0,
        timestamp: Date.now(),
      };
      const contextWithPitchBend = {
        ...mockContext,
        recentActions: [{ type: "pitch_bend", timestamp: Date.now() - 10000 }],
      };
      const result = RuleConditions.beatmatchSameBPMOnly(
        event,
        mockDeckA,
        mockDeckB,
        contextWithPitchBend
      );
      expect(result).toBe(false);
    });
  });

  describe("abruptCrossfader (M002)", () => {
    it("returns true when crossfader moved very fast", () => {
      const event: UserActionEvent = {
        type: "crossfader_moved",
        durationMs: 300,
        previousValue: 0,
        value: 1,
        timestamp: Date.now(),
      };
      expect(RuleConditions.abruptCrossfader(event)).toBe(true);
    });

    it("returns false when crossfader moved slowly", () => {
      const event: UserActionEvent = {
        type: "crossfader_moved",
        durationMs: 2000,
        previousValue: 0,
        value: 1,
        timestamp: Date.now(),
      };
      expect(RuleConditions.abruptCrossfader(event)).toBe(false);
    });

    it("returns false for non-crossfader events", () => {
      const event: UserActionEvent = {
        type: "tempo_slider_moved",
        timestamp: Date.now(),
      };
      expect(RuleConditions.abruptCrossfader(event)).toBe(false);
    });
  });

  describe("invalidLoopLength (M003)", () => {
    it("returns true for invalid loop lengths (3, 5, 6, 7)", () => {
      const event: UserActionEvent = { type: "loop_set", loopLength: 3, timestamp: Date.now() };
      expect(RuleConditions.invalidLoopLength(event)).toBe(true);
      event.loopLength = 5;
      expect(RuleConditions.invalidLoopLength(event)).toBe(true);
      event.loopLength = 7;
      expect(RuleConditions.invalidLoopLength(event)).toBe(true);
    });

    it("returns false for valid loop lengths (1, 2, 4, 8, 16)", () => {
      [1, 2, 4, 8, 16].forEach((length) => {
        const event: UserActionEvent = { type: "loop_set", loopLength: length, timestamp: Date.now() };
        expect(RuleConditions.invalidLoopLength(event)).toBe(false);
      });
    });
  });

  describe("onlyUsesLowEQ (M004)", () => {
    it("returns true when only low EQ touched recently", () => {
      const event: UserActionEvent = {
        type: "eq_changed",
        knob: "low",
        value: 50,
        timestamp: Date.now(),
      };
      const contextWithOldMidHigh = { ...mockContext, lastMidOrHighChange: Date.now() - 120000 };
      const result = RuleConditions.onlyUsesLowEQ(event, mockDeckA, mockDeckB, contextWithOldMidHigh);
      expect(result).toBe(true);
    });

    it("returns false when mid or high EQ used recently", () => {
      const event: UserActionEvent = {
        type: "eq_changed",
        knob: "low",
        value: 50,
        timestamp: Date.now(),
      };
      const contextWithRecentMid = { ...mockContext, lastMidOrHighChange: Date.now() - 30000 };
      const result = RuleConditions.onlyUsesLowEQ(event, mockDeckA, mockDeckB, contextWithRecentMid);
      expect(result).toBe(false);
    });
  });

  describe("heavyReverb (M005)", () => {
    it("returns true when reverb > 70", () => {
      const event: UserActionEvent = {
        type: "effect_changed",
        effect: "reverb",
        value: 80,
        timestamp: Date.now(),
      };
      expect(RuleConditions.heavyReverb(event)).toBe(true);
    });

    it("returns false when reverb ≤ 70", () => {
      const event: UserActionEvent = {
        type: "effect_changed",
        effect: "reverb",
        value: 50,
        timestamp: Date.now(),
      };
      expect(RuleConditions.heavyReverb(event)).toBe(false);
    });

    it("returns false for non-reverb effects", () => {
      const event: UserActionEvent = {
        type: "effect_changed",
        effect: "delay",
        value: 90,
        timestamp: Date.now(),
      };
      expect(RuleConditions.heavyReverb(event)).toBe(false);
    });
  });

  describe("avoidsHarmonicMixing (M006)", () => {
    it("returns true when user rejects harmonically compatible track", () => {
      const event: UserActionEvent = {
        type: "track_load_rejected",
        track: { key: "Gm" },
        timestamp: Date.now(),
      };
      const result = RuleConditions.avoidsHarmonicMixing(event, mockDeckA);
      expect(result).toBe(true);
    });

    it("returns false when rejecting distant key", () => {
      const event: UserActionEvent = {
        type: "track_load_rejected",
        track: { key: "F#" },
        timestamp: Date.now(),
      };
      const result = RuleConditions.avoidsHarmonicMixing(event, mockDeckA);
      expect(result).toBe(false);
    });
  });

  describe("neverUsesCrossfader (M007)", () => {
    it("returns true when crossfaderMovements is 0", () => {
      const event: UserActionEvent = { type: "session_end", timestamp: Date.now() };
      const contextWithNoMovements = { ...mockContext, crossfaderMovements: 0 };
      const result = RuleConditions.neverUsesCrossfader(event, mockDeckA, mockDeckB, contextWithNoMovements);
      expect(result).toBe(true);
    });

    it("returns false when crossfader was used", () => {
      const event: UserActionEvent = { type: "session_end", timestamp: Date.now() };
      const contextWithMovements = { ...mockContext, crossfaderMovements: 5 };
      const result = RuleConditions.neverUsesCrossfader(event, mockDeckA, mockDeckB, contextWithMovements);
      expect(result).toBe(false);
    });
  });

  describe("offPhraseStart (M008)", () => {
    it("returns true when track starts off phrase boundary", () => {
      const event: UserActionEvent = {
        type: "track_start",
        startPosition: 4,
        timestamp: Date.now(),
      };
      expect(RuleConditions.offPhraseStart(event)).toBe(true);
    });

    it("returns false when track starts on phrase boundary", () => {
      const event: UserActionEvent = { type: "track_start", startPosition: 0, timestamp: Date.now() };
      expect(RuleConditions.offPhraseStart(event)).toBe(false);
      event.startPosition = 32;
      expect(RuleConditions.offPhraseStart(event)).toBe(false);
    });
  });

  describe("monotonicEnergy (M009)", () => {
    it("returns true when last 5 tracks have increasing energy", () => {
      const event: UserActionEvent = {
        type: "track_load",
        track: { energy: 90 },
        timestamp: Date.now(),
      };
      const contextWithIncreasing = {
        ...mockContext,
        previousTracks: [
          { energy: 50 },
          { energy: 60 },
          { energy: 70 },
          { energy: 80 },
          { energy: 85 },
        ],
      };
      const result = RuleConditions.monotonicEnergy(event, mockDeckA, mockDeckB, contextWithIncreasing);
      expect(result).toBe(true);
    });

    it("returns false when energy fluctuates", () => {
      const event: UserActionEvent = {
        type: "track_load",
        track: { energy: 70 },
        timestamp: Date.now(),
      };
      const contextWithFluctuating = {
        ...mockContext,
        previousTracks: [
          { energy: 80 },
          { energy: 60 },
          { energy: 90 },
          { energy: 50 },
          { energy: 75 },
        ],
      };
      const result = RuleConditions.monotonicEnergy(event, mockDeckA, mockDeckB, contextWithFluctuating);
      expect(result).toBe(false);
    });
  });

  describe("neverSetsCuePoints (M010)", () => {
    it("returns true when no cue points set", () => {
      const event: UserActionEvent = { type: "session_end", timestamp: Date.now() };
      const contextWithNoCues = { ...mockContext, cuePointsSet: 0 };
      const result = RuleConditions.neverSetsCuePoints(event, mockDeckA, mockDeckB, contextWithNoCues);
      expect(result).toBe(true);
    });

    it("returns false when cue points were set", () => {
      const event: UserActionEvent = { type: "session_end", timestamp: Date.now() };
      const contextWithCues = { ...mockContext, cuePointsSet: 3 };
      const result = RuleConditions.neverSetsCuePoints(event, mockDeckA, mockDeckB, contextWithCues);
      expect(result).toBe(false);
    });
  });
});

// ============================================================================
// TESTS: detectMisconception (main function)
// ============================================================================

describe("detectMisconception", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns null when no misconception matches", () => {
    const event: UserActionEvent = { type: "play_pressed", timestamp: Date.now() };
    const result = detectMisconception(event, mockDeckA, mockDeckB, mockContext, "practice", noCooldown);
    expect(result).toBeNull();
  });

  it("returns M001 when beatmatching misconception detected", () => {
    const event: UserActionEvent = {
      type: "tempo_slider_moved",
      deck: "B",
      value: 0,
      timestamp: Date.now(),
    };
    const deckBAdjusted = { ...mockDeckB, pitch: 0 };
    const result = detectMisconception(
      event,
      mockDeckA,
      deckBAdjusted,
      { ...mockContext, recentActions: [] },
      "practice",
      noCooldown
    );
    expect(result?.id).toBe("M001");
  });

  it("returns null in record mode for non-critical errors", () => {
    const event: UserActionEvent = {
      type: "tempo_slider_moved",
      deck: "B",
      value: 0,
      timestamp: Date.now(),
    };
    const deckBAdjusted = { ...mockDeckB, pitch: 0 };
    const result = detectMisconception(
      event,
      mockDeckA,
      deckBAdjusted,
      { ...mockContext, recentActions: [] },
      "record",
      noCooldown
    );
    expect(result).toBeNull();
  });

  it("still detects critical errors in record mode", () => {
    const event: UserActionEvent = {
      type: "crossfader_moved",
      durationMs: 150,
      previousValue: 0,
      value: 1,
      timestamp: Date.now(),
    };
    const result = detectMisconception(event, mockDeckA, mockDeckB, mockContext, "record", noCooldown);
    expect(result?.id).toBe("M002");
  });

  it("returns null in explore mode regardless of misconception", () => {
    const event: UserActionEvent = {
      type: "tempo_slider_moved",
      deck: "B",
      value: 0,
      timestamp: Date.now(),
    };
    const deckBAdjusted = { ...mockDeckB, pitch: 0 };
    const result = detectMisconception(
      event,
      mockDeckA,
      deckBAdjusted,
      { ...mockContext, recentActions: [] },
      "explore",
      noCooldown
    );
    expect(result).toBeNull();
  });
});

// ============================================================================
// TESTS: isMisconceptionOnCooldown
// ============================================================================

describe("isMisconceptionOnCooldown", () => {
  it("returns true when alerted within cooldown period", () => {
    const recentAlertIds = [{ id: "M001", at: Date.now() - 30000 }];
    const result = isMisconceptionOnCooldown("M001", recentAlertIds, 60000);
    expect(result).toBe(true);
  });

  it("returns false when alerted outside cooldown period", () => {
    const recentAlertIds = [{ id: "M001", at: Date.now() - 120000 }];
    const result = isMisconceptionOnCooldown("M001", recentAlertIds, 60000);
    expect(result).toBe(false);
  });

  it("returns false when misconception never alerted", () => {
    const recentAlertIds = [{ id: "M002", at: Date.now() - 10000 }];
    const result = isMisconceptionOnCooldown("M001", recentAlertIds, 60000);
    expect(result).toBe(false);
  });

  it("returns false when recentAlertIds is empty", () => {
    const result = isMisconceptionOnCooldown("M001", [], 60000);
    expect(result).toBe(false);
  });
});

// ============================================================================
// TESTS: createEmptyContext
// ============================================================================

describe("createEmptyContext", () => {
  it("returns fresh context with default values", () => {
    const context = createEmptyContext();
    expect(context.recentActions).toEqual([]);
    expect(context.crossfaderMovements).toBe(0);
    expect(context.previousTracks).toEqual([]);
    expect(context.cuePointsSet).toBe(0);
    expect(context.lastMidOrHighChange).toBeLessThanOrEqual(Date.now());
  });

  it("returns new object each time", () => {
    const context1 = createEmptyContext();
    const context2 = createEmptyContext();
    expect(context1).not.toBe(context2);
  });
});

// ============================================================================
// INTEGRATION TESTS: Full user session simulation
// ============================================================================

describe("Integration: Full user session", () => {
  it("detects multiple misconceptions over a session", () => {
    let context = createEmptyContext();
    const deckA = { ...mockDeckA };
    const deckB = { ...mockDeckB };

    // User sets invalid loop
    const loopEvent: UserActionEvent = {
      type: "loop_set",
      loopLength: 3,
      timestamp: Date.now(),
    };
    let result = detectMisconception(loopEvent, deckA, deckB, context, "practice", noCooldown);
    expect(result?.id).toBe("M003");

    // Update context
    context = { ...context, recentActions: [loopEvent, ...context.recentActions] };

    // User slams crossfader
    const crossEvent: UserActionEvent = {
      type: "crossfader_moved",
      durationMs: 200,
      previousValue: 0,
      value: 1,
      timestamp: Date.now(),
    };
    result = detectMisconception(crossEvent, deckA, deckB, context, "practice", noCooldown);
    expect(result?.id).toBe("M002");

    // Update context
    context = {
      ...context,
      recentActions: [crossEvent, ...context.recentActions],
      crossfaderMovements: context.crossfaderMovements + 1,
    };

    // End session - should detect no crossfader? No, because we used it
    const endEvent: UserActionEvent = { type: "session_end", timestamp: Date.now() };
    result = detectMisconception(endEvent, deckA, deckB, context, "practice", noCooldown);
    expect(result?.id).not.toBe("M007");
  });
});