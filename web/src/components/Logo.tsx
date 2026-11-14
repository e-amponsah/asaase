/** Asaase mark: radar arcs rising over the land. */
export function Logo({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
      <rect width="32" height="32" rx="8" fill="var(--surface-2)" />
      <path d="M6 22h20" stroke="var(--gold)" strokeWidth="2.4" strokeLinecap="round" />
      <path
        d="M10 18a6 6 0 0 1 12 0M7 18a9 9 0 0 1 18 0"
        fill="none"
        stroke="var(--green)"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <circle cx="16" cy="18" r="2" fill="var(--gold)" />
    </svg>
  );
}
