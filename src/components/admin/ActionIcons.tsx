/** Small inline SVG icons for admin table actions. Use with title for accessibility. */

const size = 18;
const svgProps = { width: size, height: size, viewBox: "0 0 24 24" as const };

export function IconView({ title = "View", className = "" }: { title?: string; className?: string }) {
  return (
    <svg {...svgProps} className={`inline-block ${className}`} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <title>{title}</title>
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

export function IconEdit({ title = "Edit", className = "" }: { title?: string; className?: string }) {
  return (
    <svg {...svgProps} className={`inline-block ${className}`} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <title>{title}</title>
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  );
}

export function IconDelete({ title = "Delete", className = "" }: { title?: string; className?: string }) {
  return (
    <svg {...svgProps} className={`inline-block ${className}`} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <title>{title}</title>
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <line x1="10" y1="11" x2="10" y2="17" />
      <line x1="14" y1="11" x2="14" y2="17" />
    </svg>
  );
}

export function IconPause({ title = "Pause", className = "" }: { title?: string; className?: string }) {
  return (
    <svg {...svgProps} className={`inline-block ${className}`} fill="currentColor" aria-hidden>
      <title>{title}</title>
      <rect x="6" y="4" width="4" height="16" rx="1" />
      <rect x="14" y="4" width="4" height="16" rx="1" />
    </svg>
  );
}

export function IconResume({ title = "Resume", className = "" }: { title?: string; className?: string }) {
  return (
    <svg {...svgProps} className={`inline-block ${className}`} fill="currentColor" aria-hidden>
      <title>{title}</title>
      <path d="M8 5v14l11-7z" />
    </svg>
  );
}
