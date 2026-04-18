# Ubuntu DJ Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    Ubuntu DJ System                         │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────┐     ┌─────────────┐     ┌─────────────┐   │
│  │   React UI   │────▶│  Zustand   │────▶│  Detector  │   │
│  │             │     │   Store    │     │            │   │
│  └─────────────┘     └─────────────┘     └─────────────┘   │
│        │                   │                   │            │
│        ▼                   ▼                   ▼            │
│  ┌─────────────┐     ┌─────────────┐     ┌─────────────┐   │
│  │  Actions    │◀────│  Context   │◀────│   Rules    │   │
│  │  (user)     │     │  (state)   │     │ (M001-010) │   │
│  └─────────────┘     └─────────────┘     └─────────────┘   │
│                              │                             │
│                              ▼                             │
│                     ┌─────────────┐                      │
│                     │   Lindiwe   │                      │
│                     │     AI      │                      │
│                     │  (feedback) │                      │
│                     └─────────────┘                      │
└─────────────────────────────────────────────────────────────┘
```

## Key Components

### 1. State Management (Zustand)
- **`djStore.ts`** - Session state outside React tree
- Resets cleanly per session
- No Strict Mode double-fire issues

### 2. Detection Engine
- **Pure function** - same input → same output
- No module-level singletons
- 10 misconception rules (M001-M010)

### 3. Session Intent System
- 4 modes: learn, practice, record, explore
- Auto-inference after 4 minutes clean play
- Resets on misconception detection

### 4. Confidence Scoring
- 0-1 scale (not binary)
- Recurrence: -0.15, Correction: +0.25
- Resolved: >0.85 + 3 occurrences

### 5. Camelot Compatibility
- Full 24-key wheel
- Compatible: same, ±1, ±11 (wraparound)
- Mixed major/minor = always compatible (intentional)

## Data Flow

```
User Action → handleUserAction()
                    │
                    ▼
           ┌────────┴────────┐
           │ Update Store     │
           │ pushAction()    │
           │ incrementXfade()│
           └────────┬────────┘
                    ▼
           ┌────────┴────────┐
           │ detectMisconception()
           │ (pure function)  │
           └────────┬────────┘
                    ▼
           ┌────────┴────────┐
           │ Match?          │
           └────────┬────────┘
                    ▼
           ┌────────┴────────┐
           │ No               │─────────────▶ (return null)
           └────────┬────────┘
                    ▼
           ┌────────┴────────┐
           │ Yes              │
           ├──────────────────┤
           │ markAlerted()    │
           │ recordMisconception()
           │ setActiveAlert() │
           │ sendToLindiwe()  │
           └──────────────────┘
```

## Misconception Rules

| ID | Name | Trigger | Response |
|----|------|---------|----------|
| M001 | Beatmatching = BPM only | Tempo match w/o pitch bend | Highlight pitch bend |
| M002 | Louder = better | Crossfader slam <500ms | Load exercise |
| M003 | Invalid loop length | Loop not power of 2 | Highlight downbeat |
| M004 | Only Low EQ | Low >60s, no mid/high | Suggest mid cut |
| M005 | Heavy reverb | Reverb >70% | Reset to 20% |
| M006 | Same key only | Reject Camelot ±1 | Show compatible keys |
| M007 | No crossfader | Session end, 0 movements | Suggest cuts |
| M008 | Off-phrase start | Start not on beat 0 | Show phrase markers |
| M009 | Energy only up | 5+ tracks increasing | Suggest energy drop |
| M010 | No cue points | Session end, 0 cues | Guide cue point setup |

## File Map

```
src/ubuntudj/
├── index.ts              # Barrel export
├── types/
│   ├── index.ts         # Type exports
│   └── misconceptions.ts  # 10 rules + Camelot
├── store/
│   └── djStore.ts       # Zustand state
├── detector/
│   └── misconceptionDetector.ts  # Pure functions
├── hooks/
│   ├── useMisconceptionHistory.ts  # Confidence
│   └── useSessionIntent.ts         # Auto-inference
├── integration/
│   └── UbuntuDJIntegration.tsx     # Main hook
└── chat/
    └── chatSystem.ts    # Lindiwe prompts
```

## Testing Strategy

1. **Unit Tests** - 50+ tests for each rule
2. **Integration** - Full user session simulation
3. **E2E** - Real browser with Playwright
4. **Performance** - <5ms detection latency