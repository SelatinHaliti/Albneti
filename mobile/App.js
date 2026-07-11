import React, { useState, useRef, useCallback } from 'react';
import {
  SafeAreaView,
  StatusBar,
  StyleSheet,
  View,
  Platform,
  BackHandler,
  ActivityIndicator,
  Text,
  TouchableOpacity,
  Animated,
  Image,
} from 'react-native';
import { WebView } from 'react-native-webview';
import * as SplashScreen from 'expo-splash-screen';

SplashScreen.preventAutoHideAsync().catch(() => {});

const APP_URL = 'https://albneti.vercel.app';
const ALBANIAN_RED = '#e41e26';
const IG_BLUE = '#0095f6';
const BG_COLOR = '#000000';

export default function App() {
  const webViewRef = useRef(null);
  const [canGoBack, setCanGoBack] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const fadeAnim = useRef(new Animated.Value(1)).current;

  React.useEffect(() => {
    if (Platform.OS !== 'android') return;
    const handler = BackHandler.addEventListener('hardwareBackPress', () => {
      if (canGoBack && webViewRef.current) {
        webViewRef.current.goBack();
        return true;
      }
      return false;
    });
    return () => handler.remove();
  }, [canGoBack]);

  const onLoadEnd = useCallback(() => {
    SplashScreen.hideAsync().catch(() => {});
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 400,
      useNativeDriver: true,
    }).start(() => setLoading(false));
  }, [fadeAnim]);

  const onError = useCallback(() => {
    setError(true);
    setLoading(false);
    SplashScreen.hideAsync().catch(() => {});
  }, []);

  const retry = useCallback(() => {
    setError(false);
    setLoading(true);
    fadeAnim.setValue(1);
    webViewRef.current?.reload();
  }, [fadeAnim]);

  const injectedJS = `
    (function() {
      document.documentElement.classList.add('dark');
      document.body.classList.add('is-native-app');
      let meta = document.querySelector('meta[name="viewport"]');
      if (!meta) {
        meta = document.createElement('meta');
        meta.name = 'viewport';
        document.head.appendChild(meta);
      }
      meta.content = 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover';
      const style = document.createElement('style');
      style.textContent = \`
        .safe-area-pb { padding-bottom: env(safe-area-inset-bottom, 8px) !important; }
        .install-banner { display: none !important; }
        body.is-native-app { -webkit-user-select: none; user-select: none; }
      \`;
      document.head.appendChild(style);
      window.albnetNative = { platform: '${Platform.OS}', version: '1.0.0' };
    })();
    true;
  `;

  if (error) {
    return (
      <SafeAreaView style={styles.errorContainer}>
        <StatusBar barStyle="light-content" backgroundColor={BG_COLOR} />
        <View style={styles.errorContent}>
          <View style={styles.errorIconContainer}>
            <Text style={styles.errorIcon}>🦅</Text>
          </View>
          <Text style={styles.errorTitle}>Nuk ka lidhje</Text>
          <Text style={styles.errorMessage}>
            Kontrollo internetin dhe provo përsëri.
          </Text>
          <TouchableOpacity style={styles.retryButton} onPress={retry} activeOpacity={0.8}>
            <Text style={styles.retryText}>Provo përsëri</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.secondaryButton} onPress={retry}>
            <Text style={styles.secondaryText}>Rifresko AlbNet</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={BG_COLOR} />
      <WebView
        ref={webViewRef}
        source={{ uri: APP_URL }}
        style={styles.webview}
        onNavigationStateChange={(navState) => setCanGoBack(navState.canGoBack)}
        onLoadEnd={onLoadEnd}
        onError={onError}
        onHttpError={onError}
        injectedJavaScript={injectedJS}
        javaScriptEnabled
        domStorageEnabled
        allowsBackForwardNavigationGestures
        allowsInlineMediaPlayback
        mediaPlaybackRequiresUserAction={false}
        sharedCookiesEnabled
        thirdPartyCookiesEnabled
        cacheEnabled
        pullToRefreshEnabled
        allowFileAccess
        mixedContentMode="compatibility"
        setSupportMultipleWindows={false}
        overScrollMode="never"
        decelerationRate="normal"
        contentMode="mobile"
        textZoom={100}
        userAgent={`AlbNetApp/1.0 (${Platform.OS})`}
      />

      {loading && (
        <Animated.View style={[styles.loadingOverlay, { opacity: fadeAnim }]} pointerEvents="none">
          <View style={styles.loadingContent}>
            <Image
              source={{ uri: 'https://albneti.vercel.app/icon' }}
              style={styles.logoImage}
            />
            <Text style={styles.logoTitle}>
              <Text style={styles.logoAlb}>ALB</Text>
              <Text style={styles.logoNet}>NET</Text>
            </Text>
            <Text style={styles.tagline}>Rrjeti Social Shqiptar</Text>
            <ActivityIndicator size="small" color={ALBANIAN_RED} style={styles.spinner} />
          </View>
        </Animated.View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG_COLOR },
  webview: { flex: 1, backgroundColor: BG_COLOR },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: BG_COLOR,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  loadingContent: { alignItems: 'center' },
  logoImage: {
    width: 88,
    height: 88,
    borderRadius: 20,
    marginBottom: 16,
  },
  logoTitle: { fontSize: 28, fontWeight: '800', letterSpacing: 3, marginBottom: 6 },
  logoAlb: { color: ALBANIAN_RED },
  logoNet: { color: '#fafafa' },
  tagline: { fontSize: 12, color: '#737373', marginBottom: 24, letterSpacing: 0.5 },
  spinner: { marginTop: 4 },
  errorContainer: { flex: 1, backgroundColor: BG_COLOR },
  errorContent: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32 },
  errorIconContainer: {
    width: 72, height: 72, borderRadius: 20,
    backgroundColor: '#111', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
    justifyContent: 'center', alignItems: 'center', marginBottom: 20,
  },
  errorIcon: { fontSize: 32 },
  errorTitle: { fontSize: 18, fontWeight: '700', color: '#fafafa', marginBottom: 8 },
  errorMessage: { fontSize: 14, color: '#737373', textAlign: 'center', lineHeight: 20, marginBottom: 24 },
  retryButton: {
    paddingHorizontal: 32, paddingVertical: 14, borderRadius: 12,
    backgroundColor: ALBANIAN_RED, marginBottom: 12,
  },
  retryText: { fontSize: 14, fontWeight: '600', color: '#fff' },
  secondaryButton: { paddingVertical: 10 },
  secondaryText: { fontSize: 13, color: IG_BLUE, fontWeight: '600' },
});
