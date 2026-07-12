'use client';

import type { ReactNode } from 'react';

export function CallControlButton({
  onClick,
  label,
  ariaLabel,
  disabled,
  variant = 'glass',
  children,
}: {
  onClick: () => void;
  label?: string;
  ariaLabel: string;
  disabled?: boolean;
  variant?: 'glass' | 'glass-active' | 'danger' | 'success';
  children: ReactNode;
}) {
  const variantClass =
    variant === 'danger'
      ? 'call-ctrl-btn--danger'
      : variant === 'success'
        ? 'call-ctrl-btn--success'
        : variant === 'glass-active'
          ? 'call-ctrl-btn--active'
          : 'call-ctrl-btn--glass';

  return (
    <div className="call-ctrl-wrap">
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        aria-label={ariaLabel}
        className={`call-ctrl-btn ig-touch ${variantClass}`}
      >
        {children}
      </button>
      {label ? <span className="call-ctrl-label">{label}</span> : null}
    </div>
  );
}
