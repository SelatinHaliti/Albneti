'use client';

const size = 24;
const stroke = 'currentColor';
const strokeWidth = 2;

export function IconHome({ active }: { active?: boolean }) {
  if (active) {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2.5L3 9v12h6v-7h6v7h6V9l-9-6.5z" />
      </svg>
    );
  }
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  );
}

export function IconSearch({ active }: { active?: boolean }) {
  if (active) {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
        <path fillRule="evenodd" clipRule="evenodd" d="M3.5 11a7.5 7.5 0 1 1 15 0 7.5 7.5 0 0 1-15 0Zm7.5-9.5a9.5 9.5 0 1 0 6.32 16.61l3.57 3.57 1.42-1.41-3.57-3.57A9.5 9.5 0 0 0 11 1.5Z" />
      </svg>
    );
  }
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}

export function IconAdd() {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

export function IconReels({ active }: { active?: boolean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={active ? 'currentColor' : 'none'} stroke={active ? 'none' : stroke} strokeWidth={active ? 0 : strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      {active ? (
        <>
          <path d="M2 6a2 2 0 012-2h6l2 2h6a2 2 0 012 2v10a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
          <path d="M10 8l6 4-6 4V8z" fill="white" />
        </>
      ) : (
        <>
          <rect x="2" y="4" width="14" height="16" rx="2" />
          <path d="M16 8l6 4-6 4V8z" />
        </>
      )}
    </svg>
  );
}

export function IconLive({ active }: { active?: boolean }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={active ? 'none' : stroke}
      strokeWidth={active ? 0 : strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <rect
        x="2"
        y="7"
        width="12"
        height="10"
        rx="2"
        fill={active ? 'currentColor' : 'none'}
        stroke={active ? 'none' : stroke}
        strokeWidth={active ? 0 : strokeWidth}
      />
      <path
        d="M14 10l5-2.5v9L14 14z"
        fill={active ? 'currentColor' : 'none'}
        stroke={active ? 'none' : stroke}
        strokeWidth={active ? 0 : strokeWidth}
        strokeLinejoin="round"
      />
      <circle cx="18.5" cy="5.5" r="2.75" fill="var(--danger)" stroke="none" />
      <circle cx="18.5" cy="5.5" r="1" fill="#fff" opacity="0.95" />
    </svg>
  );
}

export function IconHeart({ filled }: { filled?: boolean }) {
  if (filled) {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
        <path d="M16.792 3.904A4.989 4.989 0 0 0 12 6.225 4.989 4.989 0 0 0 7.208 3.9c-2.674 0-4.88 2.18-4.88 4.87 0 4.143 4.435 7.49 9.672 11.91 5.237-4.42 9.672-7.767 9.672-11.91 0-2.69-2.206-4.87-4.88-4.87Z" />
      </svg>
    );
  }
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <path d="M16.792 3.904A4.989 4.989 0 0 0 12 6.225 4.989 4.989 0 0 0 7.208 3.9c-2.674 0-4.88 2.18-4.88 4.87 0 4.143 4.435 7.49 9.672 11.91 5.237-4.42 9.672-7.767 9.672-11.91 0-2.69-2.206-4.87-4.88-4.87Z" />
    </svg>
  );
}

export function IconComment() {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.656 17.008a9.993 9.993 0 1 0-3.59 3.615L22 22Z" />
    </svg>
  );
}

export function IconShare() {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <line x1="22" y1="2" x2="11" y2="13" />
      <polygon points="22 2 15 22 11 13 2 9 22 2" />
    </svg>
  );
}

export function IconBookmark({ filled }: { filled?: boolean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke={stroke} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
    </svg>
  );
}

export function IconMore() {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <circle cx="12" cy="6" r="1.5" />
      <circle cx="12" cy="12" r="1.5" />
      <circle cx="12" cy="18" r="1.5" />
    </svg>
  );
}

export function IconBack() {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <line x1="19" y1="12" x2="5" y2="12" />
      <polyline points="12 19 5 12 12 5" />
    </svg>
  );
}

export function IconSettings() {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}

export function IconLogout() {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  );
}

export function IconSun() {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="5" />
      <line x1="12" y1="1" x2="12" y2="3" />
      <line x1="12" y1="21" x2="12" y2="23" />
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
      <line x1="1" y1="12" x2="3" y2="12" />
      <line x1="21" y1="12" x2="23" y2="12" />
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
      <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
    </svg>
  );
}

export function IconMoon() {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  );
}

export function IconNotification() {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  );
}

export function IconMessage({ filled }: { filled?: boolean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke={filled ? 'none' : stroke} strokeWidth={filled ? 0 : strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <path d="M21.99 4c0-1.1-.89-2-1.99-2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h14l4 4-.01-18zM7 9h10v2H7V9zm0 4h7v2H7v-2z" />
    </svg>
  );
}

export function IconChevronLeft() {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <polyline points="15 18 9 12 15 6" />
    </svg>
  );
}

export function IconGrid() {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <rect x="3" y="3" width="7" height="7" />
      <rect x="14" y="3" width="7" height="7" />
      <rect x="14" y="14" width="7" height="7" />
      <rect x="3" y="14" width="7" height="7" />
    </svg>
  );
}

export function IconGlobe() {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="2" y1="12" x2="22" y2="12" />
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </svg>
  );
}

/** Komuniteti – evente & diaspora */
export function IconCommunity({ active }: { active?: boolean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={active ? 'currentColor' : 'none'} stroke={active ? 'none' : stroke} strokeWidth={active ? 0 : strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      {active ? (
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zm10 10v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
      ) : (
        <>
          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </>
      )}
    </svg>
  );
}

/** Verifikim – badge blu */
export function IconVerified({ active }: { active?: boolean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={active ? 'none' : stroke} strokeWidth={active ? 0 : strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" fill={active ? 'var(--ig-blue)' : 'none'} stroke={active ? 'none' : stroke} />
      <path d="M9 12l2 2 4-4" stroke={active ? '#fff' : stroke} strokeWidth={active ? 2.5 : strokeWidth} />
    </svg>
  );
}

/** Chat global */
export function IconChatGlobal({ active }: { active?: boolean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={active ? 'currentColor' : 'none'} stroke={active ? 'none' : stroke} strokeWidth={active ? 0 : strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      {active ? (
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      ) : (
        <>
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          <circle cx="9" cy="10" r="1" fill="currentColor" stroke="none" />
          <circle cx="12" cy="10" r="1" fill="currentColor" stroke="none" />
          <circle cx="15" cy="10" r="1" fill="currentColor" stroke="none" />
        </>
      )}
    </svg>
  );
}

/* ─── Thirrje audio/video ─── */
const callStroke = 1.75;

export function IconCallMic({ size: s = 22 }: { size?: number }) {
  return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={callStroke} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M12 2a3 3 0 0 1 3 3v6a3 3 0 0 1-6 0V5a3 3 0 0 1 3-3z" />
      <path d="M19 10v1a7 7 0 0 1-14 0v-1" />
      <line x1="12" y1="18" x2="12" y2="22" />
      <line x1="8" y1="22" x2="16" y2="22" />
    </svg>
  );
}

export function IconCallMicOff({ size: s = 22 }: { size?: number }) {
  return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={callStroke} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <line x1="2" y1="2" x2="22" y2="22" />
      <path d="M9 9v2a3 3 0 0 0 5.12 2.12" />
      <path d="M15 9.34V5a3 3 0 0 0-5.94-.6" />
      <path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v1a7 7 0 0 1-.11 1.23" />
      <line x1="12" y1="18" x2="12" y2="22" />
      <line x1="8" y1="22" x2="16" y2="22" />
    </svg>
  );
}

export function IconCallVideo({ size: s = 22 }: { size?: number }) {
  return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={callStroke} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M4 9h4l2-2h4l2 2h4v8H4V9z" />
      <circle cx="12" cy="13" r="2.8" />
    </svg>
  );
}

export function IconCallVideoOff({ size: s = 22 }: { size?: number }) {
  return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={callStroke} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M4 9h4l2-2h4l2 2h4v8H4V9z" />
      <circle cx="12" cy="13" r="2.8" />
      <line x1="2" y1="2" x2="22" y2="22" strokeWidth={2.25} />
    </svg>
  );
}

export function IconCallFlip({ size: s = 22 }: { size?: number }) {
  return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={callStroke} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="5" y="8" width="9" height="8" rx="1.5" />
      <circle cx="9.5" cy="12" r="1.5" />
      <path d="M18 9v6" />
      <path d="M15 10l3-1 0 2" />
      <path d="M21 15l-3 1 0-2" />
    </svg>
  );
}

export function IconCallEnd({ size: s = 26 }: { size?: number }) {
  return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.25} strokeLinecap="round" aria-hidden>
      <path d="M7 10v2a3 3 0 003 3h4a3 3 0 003-3v-2" />
      <path d="M5 10h14l-1.2-3.6A2 2 0 0015.9 5H8.1a2 2 0 00-1.9 1.4L5 10z" />
      <line x1="9" y1="18" x2="15" y2="18" />
    </svg>
  );
}

export function IconCallAccept({ size: s = 26 }: { size?: number }) {
  return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="12" cy="12" r="9" />
      <path d="M8 12.5l2.5 2.5L16 9" />
    </svg>
  );
}

export function IconCallDecline({ size: s = 26 }: { size?: number }) {
  return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" aria-hidden>
      <circle cx="12" cy="12" r="9" />
      <line x1="9" y1="9" x2="15" y2="15" />
      <line x1="15" y1="9" x2="9" y2="15" />
    </svg>
  );
}

export function IconCallPhone({ size: s = 22 }: { size?: number }) {
  return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={callStroke} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M6.62 10.79a15.05 15.05 0 006.59 6.59l2.2-2.2a1 1 0 011.11-.21 11.36 11.36 0 003.47.56 1 1 0 011 1V20a1 1 0 01-1 1A17 17 0 013 4a1 1 0 011-1h3.5a1 1 0 011 .78 11.36 11.36 0 00.56 3.47 1 1 0 01-.21 1.11l-2.24 2.43z" />
    </svg>
  );
}

export function IconCallSpinner({ size: s = 22 }: { size?: number }) {
  return (
    <span
      className="inline-block rounded-full border-2 border-current border-t-transparent animate-spin"
      style={{ width: s, height: s }}
      aria-hidden
    />
  );
}
