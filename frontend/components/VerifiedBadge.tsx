'use client';

type VerifiedBadgeProps = {
  size?: number;
  className?: string;
  title?: string;
};

/** Badge verifikimi blu – si Instagram Meta Verified */
export function VerifiedBadge({ size = 16, className = '', title = 'Llogari e verifikuar' }: VerifiedBadgeProps) {
  return (
    <span className={`verified-badge inline-flex items-center ${className}`} title={title} aria-label={title}>
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
        <circle cx="12" cy="12" r="10" fill="#0095F6" />
        <path
          d="M9.5 12.2l1.8 1.8 3.4-3.6"
          stroke="#fff"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}

export function VerifiedBadgeGold({ size = 16, className = '' }: { size?: number; className?: string }) {
  return (
    <span className={`verified-badge verified-badge-gold inline-flex items-center ${className}`} title="Krijues Pro">
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
        <circle cx="12" cy="12" r="10" fill="url(#goldGrad)" />
        <path d="M9.5 12.2l1.8 1.8 3.4-3.6" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
        <defs>
          <linearGradient id="goldGrad" x1="0" y1="0" x2="24" y2="24">
            <stop stopColor="#f5d061" />
            <stop offset="1" stopColor="#c9a227" />
          </linearGradient>
        </defs>
      </svg>
    </span>
  );
}
