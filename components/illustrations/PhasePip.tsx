// Phase pip — small motif for sidebar grouping.

export function PhasePip({ phase = 1, size = 16 }: { phase?: number; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      {phase === 1 && <circle cx="8" cy="8" r="3" fill="currentColor" />}
      {phase === 2 && (
        <path d="M3 12 L13 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      )}
      {phase === 3 && (
        <path d="M3 8 L13 8 M8 3 L8 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      )}
      {phase === 4 && (
        <g stroke="currentColor" strokeWidth="1.25" fill="none">
          <circle cx="4" cy="5" r="1.5" />
          <circle cx="12" cy="5" r="1.5" />
          <circle cx="4" cy="11" r="1.5" />
          <circle cx="12" cy="11" r="1.5" />
          <path d="M5.5 5 L10.5 11 M5.5 11 L10.5 5" />
        </g>
      )}
      {phase === 5 && (
        <g fill="currentColor">
          <circle cx="4" cy="8" r="1.5" />
          <circle cx="8" cy="8" r="2" />
          <circle cx="12" cy="8" r="1.5" />
        </g>
      )}
    </svg>
  );
}
