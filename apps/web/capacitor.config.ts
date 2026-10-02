import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'br.org.revezo.app',
  appName: 'Revezo',
  webDir: 'public',
  server: {
    // Permite apontar para a URL remota de produção via variável de ambiente
    // Força HTTPS estrito e sem tráfego em texto claro (Rule 17)
    url: process.env.CAPACITOR_SERVER_URL,
    cleartext: false,
    androidScheme: 'https',
    iosScheme: 'https',
  },
  plugins: {
    Preferences: {
      group: 'revezo_secure',
    },
    App: {
      disableBackButtonHandler: false,
    },
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
  },
  android: {
    allowMixedContent: false,
    captureInput: true,
    webContentsDebuggingEnabled: process.env.NODE_ENV !== 'production',
  },
  ios: {
    contentInset: 'automatic',
    allowsLinkPreview: false,
    scrollEnabled: true,
  },
};

export default config;
