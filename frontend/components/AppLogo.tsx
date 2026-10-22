'use client';

import { EagleMark } from '@/components/EagleMark';

/** Shenja e AlbNet: shqiponja në mburojë, pa kornizë shtesë. */
export function AppLogo({
  size = 40,
}: {
  size?: number;
  variant?: 'mark' | 'plain';
}) {
  return (
    <span className="inline-flex flex-shrink-0 items-center justify-center" style={{ width: size, height: size }}>
      <EagleMark size={size} />
    </span>
  );
}
