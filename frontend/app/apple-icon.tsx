import { ImageResponse } from 'next/og';

export const size = { width: 180, height: 180 };
export const contentType = 'image/png';

function EagleShieldIcon({ size = 130 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
      <path
        d="M24 2.5L7 14.5v11c0 11 7.5 17 17 19 9.5-2 17-8 17-19v-11L24 2.5z"
        fill="#0f0f0f"
      />
      <g fill="#e41e26">
        <ellipse cx="13" cy="16" rx="3.2" ry="3.5" />
        <path d="M10.2 15.2L8 13" stroke="#e41e26" strokeWidth="0.65" fill="none" strokeLinecap="round" />
        <ellipse cx="35" cy="16" rx="3.2" ry="3.5" />
        <path d="M37.8 15.2L40 13" stroke="#e41e26" strokeWidth="0.65" fill="none" strokeLinecap="round" />
        <path d="M21 19v13h6V19h-6z" />
        <path d="M24 19l-5 6h2l3-3 3 3h2l-5-6z" />
        <path d="M17 20.5L9 22l5.5 4 2.5-2.5V20.5z" />
        <path d="M31 20.5l8 1.5-5.5 4-2.5-2.5V20.5z" />
        <path d="M15.5 22.5l-4 1 2.5 2 1.5-1.5v-2z" />
        <path d="M32.5 22.5l4 1-2.5 2-1.5-1.5v-2z" />
        <path d="M23 31.5l1 4 1-4h-2z" />
      </g>
    </svg>
  );
}

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#000000',
        }}
      >
        <EagleShieldIcon size={130} />
      </div>
    ),
    { ...size }
  );
}
