import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  NativeModules,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { WebView } from 'react-native-webview';
import Constants from 'expo-constants';

const DEFAULT_WEB_URL = 'http://localhost:4028/resident-demo';

function getLanHostFromMetro(): string | null {
  const scriptURL = NativeModules?.SourceCode?.scriptURL as string | undefined;
  if (!scriptURL) return null;
  const match = scriptURL.match(/https?:\/\/([^/:]+)(?::\d+)?\//i);
  return match?.[1] ?? null;
}

function getLanHostFromExpoConstants(): string | null {
  const expoHost =
    (Constants as unknown as { expoGoConfig?: { debuggerHost?: string } }).expoGoConfig
      ?.debuggerHost ?? null;
  if (!expoHost) return null;
  return expoHost.split(':')[0] ?? null;
}

function getWebUrl(): { url: string; debugSource: string } {
  const envUrl = process.env.EXPO_PUBLIC_WEB_URL?.trim();
  if (envUrl) return { url: envUrl, debugSource: 'env:EXPO_PUBLIC_WEB_URL' };

  const constantsHost = getLanHostFromExpoConstants();
  if (constantsHost && constantsHost !== 'localhost' && constantsHost !== '127.0.0.1') {
    return {
      url: `http://${constantsHost}:4028/resident-demo`,
      debugSource: `expo-constants:${constantsHost}`,
    };
  }

  const lanHost = getLanHostFromMetro();
  if (lanHost && lanHost !== 'localhost' && lanHost !== '127.0.0.1') {
    return { url: `http://${lanHost}:4028/resident-demo`, debugSource: `metro:${lanHost}` };
  }

  if (Platform.OS === 'android') {
    return { url: 'http://10.0.2.2:4028/resident-demo', debugSource: 'android-emulator-fallback' };
  }

  return { url: DEFAULT_WEB_URL, debugSource: 'localhost-fallback' };
}

export default function App() {
  const [loading, setLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const resolved = useMemo(() => getWebUrl(), []);
  const webUrl = resolved.url;

  return (
    <SafeAreaView style={styles.root}>
      <StatusBar style="dark" />
      <View style={styles.header}>
        <Text style={styles.brand}>lys</Text>
        <Text style={styles.caption}>Expo test wrapper</Text>
      </View>

      {hasError ? (
        <View style={styles.errorWrap}>
          <Text style={styles.errorTitle}>Kunne ikke indlaese appen</Text>
          <Text style={styles.errorText}>Start Next.js: npm run dev i budr-luksus</Text>
          <Text style={styles.errorText}>URL: {webUrl}</Text>
          <Text style={styles.errorText}>Kilde: {resolved.debugSource}</Text>
        </View>
      ) : (
        <>
          <WebView
            source={{ uri: webUrl }}
            style={styles.webview}
            onLoadEnd={() => setLoading(false)}
            onError={() => {
              setLoading(false);
              setHasError(true);
            }}
            sharedCookiesEnabled
            thirdPartyCookiesEnabled
          />
          {loading && (
            <View style={styles.loading}>
              <ActivityIndicator size="small" color="#2D5BE3" />
            </View>
          )}
        </>
      )}
      <View style={styles.footer}>
        <Pressable onPress={() => setHasError(false)}>
          <Text style={styles.footerText}>Hvis blank: tjek at Mac-IP:4028 koerer</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F7F5F1' },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E8E3DA',
    backgroundColor: '#FFFFFF',
  },
  brand: { fontSize: 22, fontStyle: 'italic', color: '#2D5BE3', fontWeight: '600' },
  caption: { fontSize: 12, color: '#6B6459' },
  webview: { flex: 1, backgroundColor: '#F7F5F1' },
  loading: {
    position: 'absolute',
    top: 72,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  footer: {
    borderTopWidth: 1,
    borderTopColor: '#E8E3DA',
    padding: 8,
    backgroundColor: '#FFFFFF',
  },
  footerText: { textAlign: 'center', fontSize: 11, color: '#6B6459' },
  errorWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  errorTitle: { fontSize: 18, fontWeight: '700', color: '#1A1814', marginBottom: 8 },
  errorText: { fontSize: 13, color: '#6B6459', marginBottom: 4, textAlign: 'center' },
});
