'use client';

import React from 'react';

interface Props {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
      console.error('ErrorBoundary:', error, errorInfo);
    }
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div className="min-h-[40vh] flex flex-col items-center justify-center px-4 py-8 bg-[var(--bg)]">
          <p className="text-[var(--text)] font-medium mb-2">Diçka shkoi keq</p>
          <p className="text-[var(--text-muted)] text-sm mb-4 text-center max-w-md">
            Gabim i papritur. Rifresko faqen ose kthehu te kryefaqja.
          </p>
          <button
            type="button"
            onClick={() => this.setState({ hasError: false })}
            className="px-4 py-2 rounded-lg bg-[var(--primary)] text-white text-sm font-medium"
          >
            Provo përsëri
          </button>
          <a
            href="/feed"
            className="mt-3 text-sm text-[var(--primary)] font-medium"
          >
            Kthehu në kryefaqe
          </a>
        </div>
      );
    }
    return this.props.children;
  }
}
