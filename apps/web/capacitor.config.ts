import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'br.org.escalaigreja.app',
  appName: 'Escala Igreja',
  webDir: 'public',
  server: {
    // Permite apontar para a URL remota de produção via variável de ambiente
    // Força HTTPS estrito e sem tráfego em texto claro (Rule 17)
    url: process.env.CAPACITOR_SERVER_URL,
    cleartext: false,
    androidScheme: 'https',
  },
  plugins: {
    Preferences: {
      group: 'escala_igreja_secure',
    },
    App: {
      disableBackButtonHandler: false,
    },
  },
  android: {
    allowMixedContent: false,
    captureInput: true,
    webContentsDebuggingEnabled: process.env.NODE_ENV !== 'production',
  },
};

export default config;
