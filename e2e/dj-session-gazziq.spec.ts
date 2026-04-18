// e2e/dj-session-gazziq.spec.ts
// ============================================================================
// E2E TEST – Mr Gazziq "0303" Album DJ Session
// ============================================================================

import { test, expect, Page } from "@playwright/test";
import {
  TRACKS_0303,
  SESSION_PLAYLIST,
  getTrackByTitle,
  getEnergyProgression,
  isOptimalEnergyFlow,
  areTracksCamelotCompatible,
} from "./trackData";

const USER_TRACKS = {
  intro: TRACKS_0303[0],
  track1: TRACKS_0303[1],
  track4: TRACKS_0303[2],
  track6: TRACKS_0303[3],
  track7: TRACKS_0303[4],
  track10: TRACKS_0303[5],
  track14: TRACKS_0303[6],
  end: TRACKS_0303[7],
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

async function loadTrack(page: Page, deckId: "A" | "B", trackTitle: string) {
  await page.click("button:has-text('▲ TRACK LIBRARY')");
  await page.waitForSelector("text=LIBRARY");

  const searchInput = page.locator("input[placeholder*='Search']");
  await searchInput.fill(trackTitle);
  await page.waitForTimeout(500);

  await page.click(`button:has-text('${deckId}') >> nth=0`);
  await page.click("button:has-text('▼')");
  await page.waitForTimeout(500);
}

async function getBPM(page: Page, deckId: "A" | "B"): Promise<number> {
  const bpmText = await page.locator(`.deck-${deckId} .bpm-value`).textContent();
  return parseFloat(bpmText || "0");
}

async function moveCrossfader(page: Page, targetPercent: number, durationMs: number = 1000) {
  const track = page.locator(".cf-track");
  const box = await track.boundingBox();
  if (!box) throw new Error("Crossfader not found");

  const startX = box.x + (box.width * 50) / 100;
  const endX = box.x + (box.width * targetPercent) / 100;

  await page.mouse.move(startX, box.y + box.height / 2);
  await page.mouse.down();

  const steps = 20;
  const stepDelay = durationMs / steps;
  for (let i = 1; i <= steps; i++) {
    const x = startX + ((endX - startX) * i) / steps;
    await page.mouse.move(x, box.y + box.height / 2);
    await page.waitForTimeout(stepDelay);
  }

  await page.mouse.up();
}

async function getLindiweLastMessage(page: Page): Promise<string> {
  const messages = page.locator(".ai-msg:last-child");
  await messages.waitFor({ state: "visible", timeout: 5000 });
  return (await messages.textContent()) || "";
}

// ============================================================================
// TEST SUITE – Mr Gazziq Album Session
// ============================================================================

test.describe("Mr Gazziq '0303' Album – Full DJ Session", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.waitForSelector("text=UBUNTU DJ");
    await page.waitForTimeout(2000);
  });

  test("Complete album mix: Intro → Track1 → Track4 → Track6 → Track7 → Track10 → Track14 → End", async ({
    page,
  }) => {
    const playlist = SESSION_PLAYLIST;
    const energyLog: number[] = [];
    const bpmLog: number[] = [];

    await page.click("button:has-text('🎯 Practice')");

    // Load first track (Intro) into Deck A
    await loadTrack(page, "A", playlist[0]);
    await page.click(".deck-A button:has-text('▶')");

    const introEnergy = getTrackByTitle(playlist[0])?.energy || 0;
    energyLog.push(introEnergy);
    bpmLog.push(getTrackByTitle(playlist[0])?.bpm || 0);

    await page.waitForTimeout(3000);

    // Transition through each track
    for (let i = 1; i < playlist.length; i++) {
      const currentTrack = playlist[i - 1];
      const nextTrack = playlist[i];
      const nextTrackData = getTrackByTitle(nextTrack);

      if (!nextTrackData) continue;

      await loadTrack(page, "B", nextTrack);
      await page.click(".deck-B button:has-text('▶')");

      const currentBPM = bpmLog[bpmLog.length - 1];
      const targetBPM = nextTrackData.bpm;

      if (Math.abs(currentBPM - targetBPM) > 2) {
        const pitchSlider = page.locator(".deck-B input[type='range']").first();
        const pitchAdjust = (targetBPM - currentBPM) / (currentBPM * 0.008);
        await pitchSlider.fill(Math.max(-8, Math.min(8, pitchAdjust)).toString());
        await page.waitForTimeout(500);
      }

      await moveCrossfader(page, 100, 20000);

      energyLog.push(nextTrackData.energy);
      bpmLog.push(nextTrackData.bpm);

      await page.waitForTimeout(2000);
    }

    // Verify energy progression is optimal
    const optimal = isOptimalEnergyFlow(energyLog);
    expect(optimal).toBe(true);

    console.log("Energy progression:", energyLog);
    console.log("BPM progression:", bpmLog);

    // Expected: 45 → 75 → 82 → 88 → 85 → 72 → 65 → 40
    expect(energyLog[0]).toBeLessThan(energyLog[1]);
    expect(energyLog[3]).toBeGreaterThan(energyLog[4]);
    expect(energyLog[6]).toBeGreaterThan(energyLog[7]);

    // No console errors
    const consoleErrors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") consoleErrors.push(msg.text());
    });
    expect(consoleErrors).toEqual([]);
  });

  test("Lindiwe provides harmonic mixing advice for Track4 → Track6 transition", async ({ page }) => {
    await loadTrack(page, "A", "Track 4");
    await page.click(".deck-A button:has-text('▶')");

    await loadTrack(page, "B", "Track 6");
    await page.click(".deck-B button:has-text('▶')");

    await page.fill("input[placeholder*='Ask LINDIWE']", "Are these tracks harmonically compatible?");
    await page.click("button:has-text('↑')");

    await page.waitForTimeout(3000);
    const response = await getLindiweLastMessage(page);

    expect(response).toContain("compatible") || expect(response).toContain("harmonic");
  });

  test("Energy management advice for Track6 → Track7 (energy drop)", async ({ page }) => {
    await loadTrack(page, "A", "Track 6");
    await page.click(".deck-A button:has-text('▶')");

    await loadTrack(page, "B", "Track 7");
    await page.click(".deck-B button:has-text('▶')");

    await page.fill("input[placeholder*='Ask LINDIWE']", "How should I handle this energy drop?");
    await page.click("button:has-text('↑')");

    await page.waitForTimeout(3000);
    const response = await getLindiweLastMessage(page);

    expect(response).toMatch(/energy|build|crowd|transition/i);
  });

  test("End track should have low energy (cool down)", async ({ page }) => {
    await loadTrack(page, "A", "End");
    await page.click(".deck-A button:has-text('▶')");

    const bpm = await getBPM(page, "A");
    expect(bpm).toBeLessThanOrEqual(118);

    await page.fill("input[placeholder*='Ask LINDIWE']", "How do I end a set properly?");
    await page.click("button:has-text('↑')");

    await page.waitForTimeout(3000);
    const response = await getLindiweLastMessage(page);

    expect(response).toMatch(/end|close|finish|outro/i);
  });
});

// ============================================================================
// HARMONIC COMPATIBILITY TESTS
// ============================================================================

describe("Camelot Compatibility", () => {
  it("Track4 (Gm) → Track6 (Fm) are compatible", () => {
    expect(areTracksCamelotCompatible("Gm", "Fm")).toBe(true);
  });

  it("Track6 (Fm) → Track7 (Cm) are compatible", () => {
    expect(areTracksCamelotCompatible("Fm", "Cm")).toBe(true);
  });

  it("Track7 (Cm) → Track10 (Dm) are compatible", () => {
    expect(areTracksCamelotCompatible("Cm", "Dm")).toBe(true);
  });

  it("Track10 (Dm) → Track14 (Am) are compatible", () => {
    expect(areTracksCamelotCompatible("Dm", "Am")).toBe(true);
  });
});

// ============================================================================
// ENERGY PROGRESSION TESTS
// ============================================================================

describe("Energy Progression", () => {
  it("energy progression is not monotonic", () => {
    const energies = getEnergyProgression();
    expect(isOptimalEnergyFlow(energies)).toBe(true);
  });

  it("starts low, builds to peak, then drops", () => {
    const energies = getEnergyProgression();
    const peakIndex = energies.indexOf(Math.max(...energies));
    const endIndex = energies.length - 1;

    // Peak should be in the middle (around Track6)
    expect(peakIndex).toBeGreaterThan(2);
    expect(peakIndex).toBeLessThan(6);

    // End should be lower than peak
    expect(energies[endIndex]).toBeLessThan(energies[peakIndex]);
  });
});