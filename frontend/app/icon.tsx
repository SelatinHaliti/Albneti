import { ImageResponse } from 'next/og';
import { EagleMark } from '@/components/EagleMark';

export const runtime = 'edge';
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
          background: '#000000',
        }}
      >
        <EagleMark size={460} />
      </div>
    ),
    { ...size }
  );
}
