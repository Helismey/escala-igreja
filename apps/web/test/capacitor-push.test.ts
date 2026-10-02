import { describe, expect, it, vi, beforeEach } from 'vitest';
import {
  pushSubscriptionSchema,
  unsubscribePushSchema,
} from '@revezo/contracts';
import { registerNativePush } from '../src/lib/capacitor-push';
import * as adapter from '../src/lib/capacitor-adapter';

// Mock do @capacitor/core
vi.mock('@capacitor/core', () => ({
  Capacitor: {
    isNativePlatform: vi.fn(),
    getPlatform: vi.fn(() => 'android'),
  },
}));

// Mock do @capacitor/push-notifications
const mockCheckPermissions = vi.fn();
const mockRequestPermissions = vi.fn();
const mockRegister = vi.fn();
const mockAddListener = vi.fn();

vi.mock('@capacitor/push-notifications', () => ({
  PushNotifications: {
    checkPermissions: () => mockCheckPermissions(),
    requestPermissions: () => mockRequestPermissions(),
    register: () => mockRegister(),
    addListener: (event: string, cb: any) => mockAddListener(event, cb),
  },
}));

describe('Push Notifications Nativas e Contratos (Capacitor & Web Push)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Validação de Contratos (Zod pushSubscriptionSchema)', () => {
    it('aceita assinatura Web Push tradicional com endpoint URL e chaves ECDH', () => {
      const validWebPush = {
        endpoint: 'https://fcm.googleapis.com/fcm/send/token123',
        keys: {
          p256dh: 'BK201...',
          auth: 'xyz123...',
        },
      };

      const result = pushSubscriptionSchema.safeParse(validWebPush);
      expect(result.success).toBe(true);
      if (result.success && (!('type' in result.data) || result.data.type === 'web')) {
        expect(result.data.endpoint).toBe(validWebPush.endpoint);
      }
    });

    it('aceita assinatura Native Push (Android) com token de dispositivo', () => {
      const validAndroidPush = {
        type: 'native' as const,
        token: 'fcm-registration-token-device-98765',
        platform: 'android' as const,
      };

      const result = pushSubscriptionSchema.safeParse(validAndroidPush);
      expect(result.success).toBe(true);
      if (result.success && 'type' in result.data && result.data.type === 'native') {
        expect(result.data.type).toBe('native');
        expect(result.data.platform).toBe('android');
        expect(result.data.token).toBe('fcm-registration-token-device-98765');
      }
    });

    it('aceita assinatura Native Push (iOS) com token de dispositivo', () => {
      const validIosPush = {
        type: 'native' as const,
        token: 'apns-device-hex-token-abcdef1234567890',
        platform: 'ios' as const,
      };

      const result = pushSubscriptionSchema.safeParse(validIosPush);
      expect(result.success).toBe(true);
      if (result.success && 'type' in result.data && result.data.type === 'native') {
        expect(result.data.platform).toBe('ios');
      }
    });

    it('rejeita token nativo muito curto ou plataforma inválida', () => {
      const invalidShortToken = {
        type: 'native',
        token: 'curto',
        platform: 'android',
      };
      expect(pushSubscriptionSchema.safeParse(invalidShortToken).success).toBe(false);

      const invalidPlatform = {
        type: 'native',
        token: 'valid-token-com-tamanho-suficiente',
        platform: 'windows_phone',
      };
      expect(pushSubscriptionSchema.safeParse(invalidPlatform).success).toBe(false);
    });

    it('aceita cancelamento de inscrição com endpoint Web ou identificador nativo', () => {
      expect(
        unsubscribePushSchema.safeParse({ endpoint: 'https://fcm.googleapis.com/send/123' }).success
      ).toBe(true);

      expect(
        unsubscribePushSchema.safeParse({ endpoint: 'native://android/fcm-token-123' }).success
      ).toBe(true);

      expect(
        unsubscribePushSchema.safeParse({ endpoint: '' }).success
      ).toBe(false);
    });
  });

  describe('Função registerNativePush', () => {
    it('retorna erro se o ambiente não for um app nativo Capacitor', async () => {
      vi.spyOn(adapter, 'isCapacitorNative').mockReturnValue(false);

      const result = await registerNativePush();
      expect(result.success).toBe(false);
      expect(result.error).toContain('Ambiente não é um aplicativo nativo Capacitor');
    });

    it('retorna erro se as permissões de notificação forem negadas pelo usuário', async () => {
      vi.spyOn(adapter, 'isCapacitorNative').mockReturnValue(true);
      mockCheckPermissions.mockResolvedValueOnce({ receive: 'prompt' });
      mockRequestPermissions.mockResolvedValueOnce({ receive: 'denied' });

      const result = await registerNativePush();
      expect(result.success).toBe(false);
      expect(result.error).toContain('Permissão de notificações negada');
    });

    it('registra push com sucesso quando a permissão já foi concedida', async () => {
      vi.spyOn(adapter, 'isCapacitorNative').mockReturnValue(true);
      mockCheckPermissions.mockResolvedValueOnce({ receive: 'granted' });
      mockRegister.mockResolvedValueOnce(undefined);

      // Simula o disparo do evento 'registration' pelo plugin nativo
      mockAddListener.mockImplementation((event: string, cb: any) => {
        if (event === 'registration') {
          setTimeout(() => {
            cb({ value: 'device-token-simulado-fcm' });
          }, 10);
        }
        return Promise.resolve({ remove: vi.fn() });
      });

      // Mock de fetch para a rota /api/push/subscribe
      const originalFetch = global.fetch;
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      } as any);

      const tokenReceivedCallback = vi.fn();

      const result = await registerNativePush({
        onTokenReceived: tokenReceivedCallback,
      });

      expect(result.success).toBe(true);
      expect(result.token).toBe('device-token-simulado-fcm');
      expect(tokenReceivedCallback).toHaveBeenCalledWith('device-token-simulado-fcm');
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/push/subscribe',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        })
      );

      global.fetch = originalFetch;
    });
  });
});
