import { Capacitor } from '@capacitor/core';
import { isCapacitorNative } from './capacitor-adapter';

export interface NativePushResult {
  success: boolean;
  token?: string;
  error?: string;
}

/**
 * Registra o dispositivo móvel nativo no serviço de Push Notifications (FCM no Android / APNs no iOS)
 * e cadastra o token na API do Revezo (/api/push/subscribe).
 *
 * Cumpre a Regra 09 (Push desacoplado atrás de interface) e Regra 17 (comunicação segura).
 */
export async function registerNativePush(options?: {
  onTokenReceived?: (token: string) => void;
  onNotificationReceived?: (notification: unknown) => void;
  onNotificationOpened?: (action: unknown) => void;
}): Promise<NativePushResult> {
  if (!isCapacitorNative()) {
    return {
      success: false,
      error: 'Ambiente não é um aplicativo nativo Capacitor.',
    };
  }

  try {
    // Importação dinâmica para evitar quebra em SSR do Next.js
    const { PushNotifications } = await import('@capacitor/push-notifications');

    // 1. Solicita permissão de notificações do sistema operacional
    let permStatus = await PushNotifications.checkPermissions();

    if (permStatus.receive === 'prompt' || permStatus.receive === 'prompt-with-rationale') {
      permStatus = await PushNotifications.requestPermissions();
    }

    if (permStatus.receive !== 'granted') {
      return {
        success: false,
        error: 'Permissão de notificações negada pelo usuário.',
      };
    }

    // 2. Cria promise para aguardar o evento de registro do token
    return new Promise<NativePushResult>((resolve) => {
      let isResolved = false;

      // Listener de recebimento de token
      PushNotifications.addListener('registration', async (token) => {
        if (isResolved) return;
        isResolved = true;

        try {
          const platform = Capacitor.getPlatform() === 'ios' ? 'ios' : 'android';

          // Envia o token para o backend
          const res = await fetch('/api/push/subscribe', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              type: 'native',
              token: token.value,
              platform,
            }),
          });

          const data = await res.json().catch(() => ({}));

          if (!res.ok || !data.success) {
            resolve({
              success: false,
              token: token.value,
              error: data.error || 'Falha ao registrar token no servidor.',
            });
            return;
          }

          if (options?.onTokenReceived) {
            options.onTokenReceived(token.value);
          }

          resolve({
            success: true,
            token: token.value,
          });
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : 'Erro ao cadastrar token na API';
          resolve({
            success: false,
            token: token.value,
            error: msg,
          });
        }
      });

      // Listener de erro no registro nativo
      PushNotifications.addListener('registrationError', (err) => {
        if (isResolved) return;
        isResolved = true;
        resolve({
          success: false,
          error: `Erro nativo no registro de push: ${err.error || 'desconhecido'}`,
        });
      });

      // Listener de notificação recebida em primeiro plano
      if (options?.onNotificationReceived) {
        PushNotifications.addListener('pushNotificationReceived', (notification) => {
          options.onNotificationReceived?.(notification);
        });
      }

      // Listener de clique/abertura de notificação
      PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
        if (options?.onNotificationOpened) {
          options.onNotificationOpened(action);
        } else {
          // Fallback de navegação se a notificação tiver URL/rota
          try {
            const data = action.notification?.data as { url?: string; actionUrl?: string } | undefined;
            const targetUrl = data?.url || data?.actionUrl;
            if (targetUrl && typeof window !== 'undefined') {
              window.location.href = targetUrl;
            }
          } catch {
            // Ignora falha de navegação em background
          }
        }
      });

      // 3. Dispara o registro nativo no FCM/APNs
      PushNotifications.register().catch((err) => {
        if (!isResolved) {
          isResolved = true;
          resolve({
            success: false,
            error: err instanceof Error ? err.message : 'Falha ao acionar PushNotifications.register()',
          });
        }
      });

      // Timeout de segurança (10s) para não prender a interface
      setTimeout(() => {
        if (!isResolved) {
          isResolved = true;
          resolve({
            success: false,
            error: 'Tempo esgotado ao aguardar o registro de push no dispositivo.',
          });
        }
      }, 10000);
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Erro inesperado ao inicializar push nativo';
    return {
      success: false,
      error: msg,
    };
  }
}
