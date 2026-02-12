'use client';

/**
 * Logo AlbNet – shqiponjë dykrenore heraldike në mburojë.
 */
export function AppLogo({ size = 40 }: { size?: number }) {
  return (
    <span
      className="inline-flex flex-shrink-0 items-center justify-center rounded-[12px] bg-white dark:bg-[#0a0a0a] shadow-sm ring-1 ring-black/5 dark:ring-white/10"
      style={{ width: size, height: size }}
    >
      <svg
        width={size - 6}
        height={size - 6}
        viewBox="0 0 48 48"
        fill="none"
        className="overflow-visible"
      >
        {/* Mburojë – e zezë */}
        <path
          d="M24 2.5L7 14.5v11c0 11 7.5 17 17 19 9.5-2 17-8 17-19v-11L24 2.5z"
          fill="#0f0f0f"
        />
        {/* Shqiponja – e kuqe */}
        <g fill="#dc2626">
          {/* Dy kokët (me sy dhe sqep) */}
          <ellipse cx="13" cy="16" rx="3.2" ry="3.5" />
          <path d="M10.2 15.2L8 13" stroke="#dc2626" strokeWidth="0.65" fill="none" strokeLinecap="round" />
          <ellipse cx="35" cy="16" rx="3.2" ry="3.5" />
          <path d="M37.8 15.2L40 13" stroke="#dc2626" strokeWidth="0.65" fill="none" strokeLinecap="round" />
          {/* Trupi */}
          <path d="M21 19v13h6V19h-6z" />
          <path d="M24 19l-5 6h2l3-3 3 3h2l-5-6z" />
          {/* Krahë të hapur (dy shtresa) */}
          <path d="M17 20.5L9 22l5.5 4 2.5-2.5V20.5z" />
          <path d="M31 20.5l8 1.5-5.5 4-2.5-2.5V20.5z" />
          <path d="M15.5 22.5l-4 1 2.5 2 1.5-1.5v-2z" />
          <path d="M32.5 22.5l4 1-2.5 2-1.5-1.5v-2z" />
          {/* Bisht */}
          <path d="M23 31.5l1 4 1-4h-2z" />
        </g>
      </svg>
    </span>
  );
}
