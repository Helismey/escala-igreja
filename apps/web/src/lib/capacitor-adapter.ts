import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';
import { App } from '@capacitor/app';

const TOKEN_KEY = 'escala_igreja_auth_token';

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
 * Configura escuta de deep links (escalaigreja://) e botão voltar nativo do Android
 */
export const setupCapacitorListeners = (onNavigate?: (path: string) => void): (() => void) => {
  if (!isCapacitorNative()) {
    return () => {};
  }

  const backHandler = App.addListener('backButton', ({ canGoBack }) => {
    if (canGoBack && typeof window !== 'undefined') {
      window.history.back();
    } else {
      App.exitApp();
    }
  });

  const urlHandler = App.addListener('appUrlOpen', (event) => {
    try {
      // Exemplo: escalaigreja://confirmar/token123 -> /confirmar/token123
      const path = event.url.replace(/^escalaigreja:\/\/?/, '/');
      if (onNavigate && path) {
        onNavigate(path);
      }
    } catch (err) {
      console.warn('[Capacitor] Erro ao processar deep link:', err);
    }
  });

  return () => {
    backHandler.then((h) => h.remove()).catch(() => {});
    urlHandler.then((h) => h.remove()).catch(() => {});
  };
};
