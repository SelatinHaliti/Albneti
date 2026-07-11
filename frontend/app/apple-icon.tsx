import { ImageResponse } from 'next/og';

export const size = { width: 180, height: 180 };
export const contentType = 'image/png';

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
        <div
          style={{
            width: 150,
            height: 150,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'linear-gradient(135deg, #e41e26 0%, #1a1a1a 100%)',
            borderRadius: 36,
            fontSize: 80,
            fontWeight: 800,
            color: 'white',
          }}
        >
          A
        </div>
      </div>
    ),
    { ...size }
  );
}
