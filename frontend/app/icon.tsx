import { ImageResponse } from 'next/og';

export const size = { width: 512, height: 512 };
export const contentType = 'image/png';

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #e41e26 0%, #1a1a1a 100%)',
          borderRadius: 112,
        }}
      >
        <div
          style={{
            fontSize: 260,
            fontWeight: 800,
            color: 'white',
            fontFamily: 'system-ui',
            letterSpacing: -8,
          }}
        >
          A
        </div>
      </div>
    ),
    { ...size }
  );
}
