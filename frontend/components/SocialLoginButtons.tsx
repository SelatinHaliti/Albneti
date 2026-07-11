'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { GoogleLogin } from '@react-oauth/google';
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
    AppleID?: {
      auth: {
        init: (config: Record<string, unknown>) => void;
        signIn: () => Promise<{
          authorization: { id_token: string };
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
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Script load failed'));
    document.head.appendChild(script);
  });
}

export function SocialLoginButtons({ onError }: Props) {
  const router = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [backendStatus, setBackendStatus] = useState<OAuthStatus>({ google: false, apple: false });
  const [appleReady, setAppleReady] = useState(false);
  const [appleLoading, setAppleLoading] = useState(false);

  const googleEnabled = Boolean(GOOGLE_CLIENT_ID);
  const appleEnabled = Boolean(APPLE_CLIENT_ID);

  const handleAuthSuccess = useCallback(
    (data: { user: unknown; token: string }) => {
      setAuth(data.user as Parameters<typeof setAuth>[0], data.token);
      router.push('/feed');
      router.refresh();
    },
    [setAuth, router]
  );

  const handleGoogleSuccess = useCallback(
    async (credentialResponse: { credential?: string }) => {
      if (!credentialResponse.credential) {
        onError?.('Google nuk dha token. Provoni përsëri.');
        return;
      }
      try {
        const data = await api<{ user: unknown; token: string }>('/api/auth/google', {
          method: 'POST',
          body: { credential: credentialResponse.credential },
        });
        handleAuthSuccess(data);
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Kyçja me Google dështoi.';
        if (msg.includes('nuk është aktivizuar')) {
          onError?.('Google login nuk është konfiguruar në server. Kontaktoni administratorin.');
        } else {
          onError?.(msg);
        }
      }
    },
    [handleAuthSuccess, onError]
  );

  const handleAppleLogin = useCallback(async () => {
    if (!window.AppleID?.auth) {
      onError?.('Apple Sign In nuk u ngarkua. Rifreskoni faqen.');
      return;
    }
    setAppleLoading(true);
    try {
      const response = await window.AppleID.auth.signIn();
      const identityToken = response.authorization?.id_token;
      if (!identityToken) throw new Error('Token Apple mungon.');
      const fullName = response.user?.name
        ? { firstName: response.user.name.firstName, lastName: response.user.name.lastName }
        : undefined;
      const data = await api<{ user: unknown; token: string }>('/api/auth/apple', {
        method: 'POST',
        body: { identityToken, fullName },
      });
      handleAuthSuccess(data);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Kyçja me Apple dështoi.';
      if (!msg.toLowerCase().includes('popup_closed') && !msg.toLowerCase().includes('cancel')) {
        if (msg.includes('nuk është aktivizuar')) {
          onError?.('Apple login nuk është konfiguruar në server.');
        } else {
          onError?.(msg);
        }
      }
    } finally {
      setAppleLoading(false);
    }
  }, [handleAuthSuccess, onError]);

  useEffect(() => {
    api<OAuthStatus>('/api/auth/oauth-status')
      .then(setBackendStatus)
      .catch(() => setBackendStatus({ google: false, apple: false }));
  }, []);

  useEffect(() => {
    if (!appleEnabled) return;
    loadScript(
      'https://appleid.cdn-apple.com/appleauth/static/jsapi/appleid/1/en_US/appleid.auth.js',
      'apple-auth'
    )
      .then(() => {
        if (window.AppleID?.auth) {
          window.AppleID.auth.init({
            clientId: APPLE_CLIENT_ID,
            scope: 'name email',
            redirectURI: typeof window !== 'undefined' ? window.location.origin : 'https://albneti.vercel.app',
            usePopup: true,
          });
          setAppleReady(true);
        }
      })
      .catch(() => onError?.('Apple Sign In nuk u ngarkua.'));
  }, [appleEnabled, onError]);

  if (!googleEnabled && !appleEnabled) {
    return (
      <div className="text-center py-2">
        <p className="text-[11px] text-[var(--text-muted)]">
          Kyçja me Google/Apple aktivizohet së shpejti.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="auth-divider">
        <span>ose</span>
      </div>

      {googleEnabled && (
        <div className="social-google-btn flex justify-center w-full">
          {backendStatus.google ? (
            <GoogleLogin
              onSuccess={handleGoogleSuccess}
              onError={() => onError?.('Google u anulua ose dështoi.')}
              text="continue_with"
              shape="rectangular"
              theme="outline"
              size="large"
              width="320"
              locale="sq"
            />
          ) : (
            <button
              type="button"
              disabled
              className="social-oauth-disabled"
              title="Backend nuk është konfiguruar"
            >
              <GoogleIcon />
              <span>Vazhdo me Google</span>
            </button>
          )}
        </div>
      )}

      {appleEnabled && (
        <button
          type="button"
          onClick={handleAppleLogin}
          disabled={appleLoading || !appleReady || !backendStatus.apple}
          className="social-apple-btn"
        >
          <AppleIcon />
          <span>
            {appleLoading
              ? 'Duke u kyçur...'
              : backendStatus.apple
                ? 'Vazhdo me Apple'
                : 'Apple – duke u aktivizuar...'}
          </span>
        </button>
      )}
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden>
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  );
}

function AppleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
    </svg>
  );
}
