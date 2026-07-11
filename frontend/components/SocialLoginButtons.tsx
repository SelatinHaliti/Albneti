'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/utils/api';
import { useAuthStore } from '@/store/useAuthStore';

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '';
const APPLE_CLIENT_ID = process.env.NEXT_PUBLIC_APPLE_CLIENT_ID || '';

type OAuthStatus = { google: boolean; apple: boolean };

type Props = {
  onError?: (msg: string) => void;
};

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: Record<string, unknown>) => void;
          renderButton: (el: HTMLElement, config: Record<string, unknown>) => void;
          prompt: () => void;
        };
      };
    };
    AppleID?: {
      auth: {
        init: (config: Record<string, unknown>) => void;
        signIn: () => Promise<{
          authorization: { id_token: string; code?: string };
          user?: { name?: { firstName?: string; lastName?: string } };
        }>;
      };
    };
  }
}

function loadScript(src: string, id: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (document.getElementById(id)) {
      resolve();
      return;
    }
    const script = document.createElement('script');
    script.id = id;
    script.src = src;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`Nuk u ngarkua: ${src}`));
    document.head.appendChild(script);
  });
}

export function SocialLoginButtons({ onError }: Props) {
  const router = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);
  const googleRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<OAuthStatus>({ google: false, apple: false });
  const [appleLoading, setAppleLoading] = useState(false);
  const [ready, setReady] = useState(false);

  const handleAuthSuccess = useCallback(
    (data: { user: unknown; token: string }) => {
      setAuth(data.user as Parameters<typeof setAuth>[0], data.token);
      router.push('/feed');
      router.refresh();
    },
    [setAuth, router]
  );

  const handleGoogleCredential = useCallback(
    async (response: { credential?: string }) => {
      if (!response.credential) return;
      try {
        const data = await api<{ user: unknown; token: string }>('/api/auth/google', {
          method: 'POST',
          body: { credential: response.credential },
        });
        handleAuthSuccess(data);
      } catch (err) {
        onError?.(err instanceof Error ? err.message : 'Kyçja me Google dështoi.');
      }
    },
    [handleAuthSuccess, onError]
  );

  const handleAppleLogin = useCallback(async () => {
    if (!window.AppleID?.auth) {
      onError?.('Apple Sign In nuk është i disponueshëm.');
      return;
    }
    setAppleLoading(true);
    try {
      const response = await window.AppleID.auth.signIn();
      const identityToken = response.authorization?.id_token;
      if (!identityToken) throw new Error('Token Apple mungon.');
      const fullName = response.user?.name
        ? {
            firstName: response.user.name.firstName,
            lastName: response.user.name.lastName,
          }
        : undefined;
      const data = await api<{ user: unknown; token: string }>('/api/auth/apple', {
        method: 'POST',
        body: { identityToken, fullName },
      });
      handleAuthSuccess(data);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Kyçja me Apple dështoi.';
      if (!msg.includes('popup_closed') && !msg.includes('user_cancelled')) {
        onError?.(msg);
      }
    } finally {
      setAppleLoading(false);
    }
  }, [handleAuthSuccess, onError]);

  useEffect(() => {
    api<OAuthStatus>('/api/auth/oauth-status')
      .then(setStatus)
      .catch(() => setStatus({
        google: Boolean(GOOGLE_CLIENT_ID),
        apple: Boolean(APPLE_CLIENT_ID),
      }));
  }, []);

  useEffect(() => {
    if (!status.google && !status.apple) return;

    const init = async () => {
      try {
        if (status.google && GOOGLE_CLIENT_ID) {
          await loadScript('https://accounts.google.com/gsi/client', 'google-gsi');
          if (window.google?.accounts?.id && googleRef.current) {
            window.google.accounts.id.initialize({
              client_id: GOOGLE_CLIENT_ID,
              callback: handleGoogleCredential,
              auto_select: false,
              cancel_on_tap_outside: true,
              context: 'signin',
              itp_support: true,
              locale: 'sq',
            });
            googleRef.current.innerHTML = '';
            window.google.accounts.id.renderButton(googleRef.current, {
              type: 'standard',
              theme: 'outline',
              size: 'large',
              text: 'continue_with',
              shape: 'rectangular',
              logo_alignment: 'left',
              width: 320,
              locale: 'sq',
            });
          }
        }

        if (status.apple && APPLE_CLIENT_ID) {
          await loadScript(
            'https://appleid.cdn-apple.com/appleauth/static/jsapi/appleid/1/en_US/appleid.auth.js',
            'apple-auth'
          );
          if (window.AppleID?.auth) {
            window.AppleID.auth.init({
              clientId: APPLE_CLIENT_ID,
              scope: 'name email',
              redirectURI: window.location.origin,
              usePopup: true,
            });
          }
        }
        setReady(true);
      } catch {
        onError?.('Nuk u ngarkuan butonat social. Provoni përsëri.');
      }
    };

    init();
  }, [status, handleGoogleCredential, onError]);

  if (!status.google && !status.apple) return null;

  return (
    <div className="space-y-3">
      <div className="auth-divider">
        <span>ose</span>
      </div>

      {status.google && GOOGLE_CLIENT_ID && (
        <div
          ref={googleRef}
          className={`social-google-btn flex justify-center min-h-[44px] ${ready ? '' : 'opacity-50'}`}
        />
      )}

      {status.apple && APPLE_CLIENT_ID && (
        <button
          type="button"
          onClick={handleAppleLogin}
          disabled={appleLoading || !ready}
          className="social-apple-btn"
        >
          <AppleIcon />
          <span>{appleLoading ? 'Duke u kyçur...' : 'Vazhdo me Apple'}</span>
        </button>
      )}
    </div>
  );
}

function AppleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
    </svg>
  );
}
