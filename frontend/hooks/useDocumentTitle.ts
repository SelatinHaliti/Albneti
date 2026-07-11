'use client';

import { useEffect } from 'react';

const APP_TITLE = 'AlbNet';

/** Tab-i i shfletuesit mbetet gjithmonë "AlbNet" */
export function useDocumentTitle(_title?: string | null) {
  useEffect(() => {
    document.title = APP_TITLE;
  }, []);
}
