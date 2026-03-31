'use client';

import dynamic from 'next/dynamic';

const CodexReader = dynamic(
  () => import('./CodexReader').then((m) => m.CodexReader),
  {
    ssr: false,
    loading: () => (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100dvh',
          background: '#0a0612',
          gap: '1rem',
        }}
      >
        <div
          style={{
            fontSize: '3rem',
            color: '#c9a84c',
          }}
        >
          &#x29DB;
        </div>
        <div
          style={{
            fontFamily: 'serif',
            color: '#8a7333',
            letterSpacing: '0.2em',
            fontSize: '0.85rem',
          }}
        >
          Abriendo el Códice...
        </div>
      </div>
    ),
  }
);

export function CodexWrapper() {
  return <CodexReader />;
}
