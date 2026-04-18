'use client';

import { useUbuntuDJIntegration, buildSystem } from '@/ubuntudj';

export default function Home() {
  const mockDeckA = { track: { bpm: 124, key: 'Am', energy: 75 }, playing: true, pitch: 0, bpm: 124 };
  const mockDeckB = { track: { bpm: 126, key: 'Fm', energy: 88 }, playing: false, pitch: 0, bpm: 126 };

  const { handleUserAction, sessionIntent, skillScore, unresolvedMisconceptions } = useUbuntuDJIntegration(mockDeckA, mockDeckB);

  return (
    <main style={{ padding: '2rem', fontFamily: 'system-ui' }}>
      <h1>Ubuntu DJ Review App</h1>
      <p>Session Intent: {sessionIntent}</p>
      <p>Skill Score: {skillScore ?? 'N/A'}</p>
      <p>Unresolved Misconceptions: {unresolvedMisconceptions.length}</p>
      
      <section style={{ marginTop: '2rem' }}>
        <h2>Actions</h2>
        <button onClick={() => handleUserAction({ type: 'play', deck: 'A', timestamp: Date.now() })}>
          Play Deck A
        </button>
        <button onClick={() => handleUserAction({ type: 'crossfader_moved', value: 100, previousValue: 0, durationMs: 300, timestamp: Date.now() })}>
          Slam Crossfader
        </button>
        <button onClick={() => handleUserAction({ type: 'loop_set', loopLength: 3, timestamp: Date.now() })}>
          Set Invalid Loop
        </button>
      </section>

      <pre style={{ marginTop: '2rem', padding: '1rem', background: '#f5f5f5' }}>
        {JSON.stringify({ sessionIntent, skillScore, unresolvedMisconceptions }, null, 2)}
      </pre>
    </main>
  );
}