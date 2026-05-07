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
} from 'react-native';
import { WebView } from 'react-native-webview';

const APP_URL = 'https://albneti.vercel.app';
const PRIMARY_COLOR = '#dc2626';
const BG_COLOR = '#0a0a0a';

export default function App() {
  const webViewRef = useRef(null);
  const [canGoBack, setCanGoBack] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const fadeAnim = useRef(new Animated.Value(1)).current;

  // Handle Android back button
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
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 400,
      useNativeDriver: true,
    }).start(() => setLoading(false));
  }, [fadeAnim]);

  const onError = useCallback(() => {
    setError(true);
    setLoading(false);
  }, []);

  const retry = useCallback(() => {
    setError(false);
    setLoading(true);
    fadeAnim.setValue(1);
    webViewRef.current?.reload();
  }, [fadeAnim]);

  // Inject JS to handle dark mode and viewport
  const injectedJS = `
    (function() {
      // Force dark mode class
      document.documentElement.classList.add('dark');
      
      // Ensure viewport meta exists
      let meta = document.querySelector('meta[name="viewport"]');
      if (!meta) {
        meta = document.createElement('meta');
        meta.name = 'viewport';
        document.head.appendChild(meta);
      }
      meta.content = 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover';
      
      // Add mobile-app class for CSS targeting
      document.body.classList.add('is-native-app');
      
      // Hide bottom nav padding since native handles safe area
      const style = document.createElement('style');
      style.textContent = '.safe-area-pb { padding-bottom: 0 !important; } .safe-area-pt { padding-top: 0 !important; }';
      document.head.appendChild(style);
    })();
    true;
  `;

  if (error) {
    return (
      <SafeAreaView style={styles.errorContainer}>
        <StatusBar barStyle="light-content" backgroundColor={BG_COLOR} />
        <View style={styles.errorContent}>
          <View style={styles.errorIconContainer}>
            <Text style={styles.errorIcon}>!</Text>
          </View>
          <Text style={styles.errorTitle}>Nuk ka lidhje</Text>
          <Text style={styles.errorMessage}>
            Kontrollo lidhjen e internetit dhe provo përsëri.
          </Text>
          <TouchableOpacity style={styles.retryButton} onPress={retry} activeOpacity={0.8}>
            <Text style={styles.retryText}>Provo përsëri</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={BG_COLOR} translucent />

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
        startInLoadingState={false}
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
      />

      {/* Splash/Loading overlay */}
      {loading && (
        <Animated.View style={[styles.loadingOverlay, { opacity: fadeAnim }]} pointerEvents="none">
          <View style={styles.loadingContent}>
            {/* Simple shield logo */}
            <View style={styles.logoContainer}>
              <View style={styles.shield}>
                <Text style={styles.shieldText}>A</Text>
              </View>
            </View>
            <Text style={styles.logoTitle}>ALBNET</Text>
            <ActivityIndicator
              size="small"
              color={PRIMARY_COLOR}
              style={styles.spinner}
            />
          </View>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BG_COLOR,
  },
  webview: {
    flex: 1,
    backgroundColor: BG_COLOR,
  },
  // Loading overlay
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: BG_COLOR,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  loadingContent: {
    alignItems: 'center',
  },
  logoContainer: {
    marginBottom: 16,
  },
  shield: {
    width: 72,
    height: 72,
    borderRadius: 18,
    backgroundColor: '#111111',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  shieldText: {
    fontSize: 32,
    fontWeight: '800',
    color: PRIMARY_COLOR,
  },
  logoTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#fafafa',
    letterSpacing: 2,
    marginBottom: 24,
  },
  spinner: {
    marginTop: 8,
  },
  // Error screen
  errorContainer: {
    flex: 1,
    backgroundColor: BG_COLOR,
  },
  errorContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  errorIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 16,
    backgroundColor: '#111111',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  errorIcon: {
    fontSize: 28,
    fontWeight: '700',
    color: '#737373',
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fafafa',
    marginBottom: 8,
  },
  errorMessage: {
    fontSize: 14,
    color: '#737373',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  retryButton: {
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: PRIMARY_COLOR,
    shadowColor: PRIMARY_COLOR,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  retryText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
  },
});
