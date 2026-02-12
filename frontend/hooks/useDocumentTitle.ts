'use client';

import { useEffect } from 'react';

const APP_TITLE = 'AlbNet';

export function useDocumentTitle(title: string | null) {
  useEffect(() => {
    const full = title ? `${title} • ${APP_TITLE}` : APP_TITLE;
    document.title = full;
    return () => {
      document.title = APP_TITLE;
    };
  }, [title]);
}
