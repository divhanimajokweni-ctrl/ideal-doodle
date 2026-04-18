// e2e/trackData.js
// ============================================================================
// TRACK DATA – Mr Gazziq "0303" Album (JavaScript)
// ============================================================================

export const TRACKS_0303 = [
  { id: 1, title: "Intro", artist: "Mr Gazziq", bpm: 118, key: "Am", genre: "Afro House", energy: 45, duration: "1:45", orderPosition: 1 },
  { id: 2, title: "Track 1", artist: "Mr Gazziq", bpm: 122, key: "Em", genre: "Afro House", energy: 75, duration: "6:23", orderPosition: 2 },
  { id: 3, title: "Track 4", artist: "Mr Gazziq", bpm: 124, key: "Am", genre: "Afro Tech", energy: 82, duration: "7:10", orderPosition: 3 },
  { id: 4, title: "Track 6", artist: "Mr Gazziq", bpm: 126, key: "Dm", genre: "Afro Tech", energy: 88, duration: "6:45", orderPosition: 4 },
  { id: 5, title: "Track 7", artist: "Mr Gazziq", bpm: 124, key: "Gm", genre: "Afro House", energy: 85, duration: "7:32", orderPosition: 5 },
  { id: 6, title: "Track 10", artist: "Mr Gazziq", bpm: 120, key: "Cm", genre: "Afro House", energy: 72, duration: "8:15", orderPosition: 6 },
  { id: 7, title: "Track 14", artist: "Mr Gazziq", bpm: 118, key: "Fm", genre: "Afro Soul", energy: 65, duration: "5:58", orderPosition: 7 },
  { id: 8, title: "End", artist: "Mr Gazziq", bpm: 115, key: "Am", genre: "Afro House", energy: 40, duration: "2:30", orderPosition: 8 },
];

// Key sequence: Am → Em (+1) → Am (0) → Dm (+3) → Gm (+3) → Cm (+4) → Fm (+3) → Am (compatible)
// Camelot wheel: Am(8M) → Em(12M) → Am(8M) → Dm(3m) → Gm(10m) → Cm(2m) → Fm(5m) → Am(8M)
export const SESSION_PLAYLIST = ["Intro", "Track 1", "Track 4", "Track 6", "Track 7", "Track 10", "Track 14", "End"];

export function getTrackByTitle(title) {
  return TRACKS_0303.find((t) => t.title === title);
}

export function getEnergyProgression() {
  return SESSION_PLAYLIST.map((title) => getTrackByTitle(title)?.energy || 0);
}

export function isOptimalEnergyFlow(energies) {
  let increases = 0, decreases = 0;
  for (let i = 1; i < energies.length; i++) {
    if (energies[i] > energies[i - 1]) increases++;
    if (energies[i] < energies[i - 1]) decreases++;
  }
  return increases > 0 && decreases > 0;
}

// Full 24-key Camelot wheel with proper minor/major mapping
const CAMELOT = {
  // Minor keys (position 0-11)
  "Am": { pos: 8, mode: "m" }, "Em": { pos: 9, mode: "m" }, "Bm": { pos: 10, mode: "m" }, "F#m": { pos: 11, mode: "m" },
  "C#m": { pos: 0, mode: "m" }, "G#m": { pos: 1, mode: "m" }, "Ebm": { pos: 2, mode: "m" }, "Bbm": { pos: 3, mode: "m" },
  "Fm": { pos: 4, mode: "m" }, "Cm": { pos: 5, mode: "m" }, "Gm": { pos: 6, mode: "m" }, "Dm": { pos: 7, mode: "m" },
  // Major keys (position 0-11)
  "C": { pos: 8, mode: "M" }, "G": { pos: 9, mode: "M" }, "D": { pos: 10, mode: "M" }, "A": { pos: 11, mode: "M" },
  "E": { pos: 0, mode: "M" }, "B": { pos: 1, mode: "M" }, "F#": { pos: 2, mode: "M" }, "Db": { pos: 3, mode: "M" },
  "Ab": { pos: 4, mode: "M" }, "Eb": { pos: 5, mode: "M" }, "Bb": { pos: 6, mode: "M" }, "F": { pos: 7, mode: "M" },
};

export function areTracksCamelotCompatible(keyA, keyB) {
  if (!keyA || !keyB) return false;
  const a = CAMELOT[keyA];
  const b = CAMELOT[keyB];
  if (!a || !b) return false;
  if (a.mode !== b.mode) return false;
  const diff = Math.abs(a.pos - b.pos) % 12;
  return diff === 0 || diff === 1 || diff === 11;
}