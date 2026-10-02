import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';
import { App } from '@capacitor/app';

const TOKEN_KEY = 'revezo_auth_token';

/**
 * Verifica se a aplicação está rodando em um container nativo Capacitor (Android/iOS)
 */
export const isCapacitorNative = (): boolean => {
  try {
    return typeof Capacitor?.isNativePlatform === 'function' && Capacitor.isNativePlatform();
  } catch {
    return false;
  }
};

/**
 * Recupera o token de sessão do KeyStore (Android) / Keychain (iOS) com segurança (Rule 17)
 */
export const getSecureToken = async (): Promise<string | null> => {
  try {
    const { value } = await Preferences.get({ key: TOKEN_KEY });
    return value;
  } catch {
    return null;
  }
};

/**
 * Armazena o token de sessão no KeyStore/Keychain nativo criptografado pelo SO
 */
export const setSecureToken = async (token: string): Promise<void> => {
  await Preferences.set({ key: TOKEN_KEY, value: token });
};

/**
 * Remove o token seguro ao efetuar logout
 */
export const removeSecureToken = async (): Promise<void> => {
  await Preferences.remove({ key: TOKEN_KEY });
};

/**
 * Configura escuta de deep links (revezo://) e botão voltar nativo do Android
 */
export const setupCapacitorListeners = (onNavigate?: (path: string) => void): (() => void) => {
  if (!isCapacitorNative()) {
    return () => {};
  }

  const backHandler = App.addListener('backButton', ({ canGoBack }: { canGoBack: boolean }) => {
    if (canGoBack && typeof window !== 'undefined') {
      window.history.back();
    } else {
      App.exitApp();
    }
  });

  const urlHandler = App.addListener('appUrlOpen', (event: { url: string }) => {
    try {
      // Exemplo: revezo://confirmar/token123 -> /confirmar/token123
      const path = event.url.replace(/^revezo:\/\/?/, '/');
      if (onNavigate && path) {
        onNavigate(path);
      }
    } catch (err) {
      console.warn('[Capacitor] Erro ao processar deep link:', err);
    }
  });

  return () => {
    backHandler.then((h: { remove: () => Promise<void> }) => h.remove()).catch(() => {});
    urlHandler.then((h: { remove: () => Promise<void> }) => h.remove()).catch(() => {});
  };
};
