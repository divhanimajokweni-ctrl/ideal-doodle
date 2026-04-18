# Ubuntu DJ Review Repository

This repository contains the complete Ubuntu DJ system for code review, testing, and validation.

## Repository Structure

```
ubuntu-dj-review/
├── src/                    # Source code
│   ├── ubuntudj/          # Main DJ system
│   └── index.ts           # Main entry point
├── docs/                  # Documentation
│   ├── ARCHITECTURE.md   # System architecture
│   ├── API.md           # API documentation
│   └── CHANGELOG.md     # Version history
├── e2e/                  # End-to-end tests
│   ├── trackData.js      # Test track data
│   └── dj-session.spec.ts
├── tests/                 # Unit tests
│   └── misconceptionDetector.test.ts
├── configs/              # Configuration files
│   ├── vitest.config.ts
│   ├── playwright.config.ts
│   └── tsconfig.json
└── README.md
```

## Quick Start

```bash
# Install dependencies
npm install

# Run unit tests
npm run test

# Run E2E tests
npm run test:e2e

# Start dev server
npm run dev
```

## Key Files

| File | Purpose |
|------|---------|
| `src/ubuntudj/types/misconceptions.ts` | 10 DJ misconceptions + Camelot lookup |
| `src/ubuntudj/store/djStore.ts` | Zustand session state |
| `src/ubuntudj/detector/misconceptionDetector.ts` | Pure detection function |
| `src/ubuntudj/hooks/useMisconceptionHistory.ts` | Confidence scoring |
| `src/ubuntudj/hooks/useSessionIntent.ts` | Auto-inference |
| `src/ubuntudj/integration/UbuntuDJIntegration.tsx` | Main integration |
| `src/ubuntudj/chat/chatSystem.ts` | Lindiwe prompt builder |

## Testing

```bash
# Unit tests with coverage
npm run test:coverage

# E2E tests
npx playwright test e2e/

# Open Vitest UI
npm run test:ui
```

## License

MIT