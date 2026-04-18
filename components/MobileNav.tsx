'use client';

import type { View } from '@/components/main-panel';

const ITEMS: { id: View; label: string; icon: React.ReactNode }[] = [
  {
    id: 'home',
    label: 'inicio',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z" />
        <path d="M9 21V12h6v9" />
      </svg>
    ),
  },
  {
    id: 'search',
    label: 'buscar',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
        <circle cx="10" cy="10" r="7" />
        <line x1="15" y1="15" x2="21" y2="21" />
      </svg>
    ),
  },
  {
    id: 'library',
    label: 'biblioteca',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" />
        <rect x="14" y="3" width="7" height="7" />
        <rect x="3" y="14" width="7" height="7" />
        <rect x="14" y="14" width="7" height="7" />
      </svg>
    ),
  },
  {
    id: 'upload',
    label: 'subir',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
        <polyline points="17 8 12 3 7 8" />
        <line x1="12" y1="3" x2="12" y2="15" />
      </svg>
    ),
  },
];

interface Props {
  view: View;
  onNav: (v: View) => void;
}

export default function MobileNav({ view, onNav }: Props) {
  return (
    <nav
      className="mobile-nav"
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        height: '56px',
        background: '#0f1014',
        borderTop: '1px solid rgba(255,255,255,0.06)',
        display: 'flex',
        alignItems: 'stretch',
        zIndex: 40,
      }}
    >
      {ITEMS.map((item) => {
        const active = view === item.id;
        return (
          <button
            key={item.id}
            onClick={() => onNav(item.id)}
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '3px',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: active ? '#e8e4df' : '#444',
              transition: 'color 0.15s ease',
              padding: 0,
            }}
          >
            {item.icon}
            <span style={{ fontSize: '8px', letterSpacing: '0.06em' }}>{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
