import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { PushNotificationChannel } from '../src/services/notifications/channels/push-channel';
import { NotificationRecipient } from '../src/services/notifications/types';
import { RenderedMessage } from '@escala-igreja/domain';
import { prisma } from '@escala-igreja/db';
import webpush from 'web-push';

vi.mock('@escala-igreja/db', () => {
  return {
    prisma: {
      pushSubscription: {
        findMany: vi.fn(),
        delete: vi.fn(),
      },
    },
  };
});

vi.mock('web-push', () => {
  return {
    default: {
      setVapidDetails: vi.fn(),
      sendNotification: vi.fn(),
    },
  };
});

describe('PushNotificationChannel (Web Push VAPID & RFC 8291)', () => {
  const originalEnv = process.env;
  let channel: PushNotificationChannel;

  const mockRecipient: NotificationRecipient = {
    userId: 'user-voluntario-1',
    name: 'Lucas Silva',
    email: 'lucas@example.com',
    preferredChannel: 'PUSH',
    optOutPush: false,
    optOutEmail: false,
    optOutWhatsapp: false,
    optOutSms: true,
  };

  const mockMessage: RenderedMessage = {
    subject: 'Lembrete de Escala',
    title: 'Culto de Domingo',
    bodyText: 'Você está escalado como Vocalista às 19:00.',
    bodyHtml: '<p>Você está escalado como Vocalista às 19:00.</p>',
    actionUrl: '/minha-escala',
  };

  beforeEach(() => {
    process.env = { ...originalEnv };
    channel = new PushNotificationChannel();
    vi.clearAllMocks();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('bloqueia envio e retorna erro se o destinatário marcou opt-out para push', async () => {
    const optOutRecipient = { ...mockRecipient, optOutPush: true };
    const result = await channel.send(optOutRecipient, mockMessage);

    expect(result.success).toBe(false);
    expect(result.channel).toBe('push');
    expect(result.error).toContain('opt-out');
    expect(prisma.pushSubscription.findMany).not.toHaveBeenCalled();
    expect(webpush.sendNotification).not.toHaveBeenCalled();
  });

  it('retorna erro se o voluntário não possui nenhum dispositivo cadastrado', async () => {
    vi.mocked(prisma.pushSubscription.findMany).mockResolvedValueOnce([]);

    const result = await channel.send(mockRecipient, mockMessage);

    expect(result.success).toBe(false);
    expect(result.error).toContain('não possui nenhum dispositivo');
    expect(webpush.sendNotification).not.toHaveBeenCalled();
  });

  it('opera em modo de simulação quando as chaves VAPID não estão configuradas no ambiente', async () => {
    delete process.env.VAPID_PUBLIC_KEY;
    delete process.env.VAPID_PRIVATE_KEY;

    vi.mocked(prisma.pushSubscription.findMany).mockResolvedValueOnce([
      {
        id: 'sub-1',
        userId: 'user-voluntario-1',
        endpoint: 'https://fcm.googleapis.com/fcm/send/abc',
        keys: { p256dh: 'key1', auth: 'auth1' },
      } as any,
    ]);

    const result = await channel.send(mockRecipient, mockMessage);

    expect(result.success).toBe(true);
    expect(result.externalMessageId).toContain('sim-push');
    expect(webpush.sendNotification).not.toHaveBeenCalled();
  });

  it('dispara Web Push real com VAPID quando as chaves estão configuradas', async () => {
    process.env.VAPID_PUBLIC_KEY = 'test-public-key';
    process.env.VAPID_PRIVATE_KEY = 'test-private-key';
    process.env.VAPID_SUBJECT = 'mailto:contato@escala.local';

    vi.mocked(prisma.pushSubscription.findMany).mockResolvedValueOnce([
      {
        id: 'sub-1',
        userId: 'user-voluntario-1',
        endpoint: 'https://fcm.googleapis.com/fcm/send/abc',
        keys: { p256dh: 'test-p256dh', auth: 'test-auth' },
      } as any,
    ]);

    vi.mocked(webpush.sendNotification).mockResolvedValueOnce({} as any);

    const result = await channel.send(mockRecipient, mockMessage);

    expect(webpush.setVapidDetails).toHaveBeenCalledWith(
      'mailto:contato@escala.local',
      'test-public-key',
      'test-private-key'
    );
    expect(webpush.sendNotification).toHaveBeenCalledWith(
      {
        endpoint: 'https://fcm.googleapis.com/fcm/send/abc',
        keys: { p256dh: 'test-p256dh', auth: 'test-auth' },
      },
      JSON.stringify({
        title: 'Culto de Domingo',
        body: 'Você está escalado como Vocalista às 19:00.',
        url: '/minha-escala',
      })
    );

    expect(result.success).toBe(true);
    expect(result.externalMessageId).toContain('push-');
  });

  it('remove automaticamente inscrições expiradas ou revogadas (HTTP 410 Gone / 404 Not Found)', async () => {
    process.env.VAPID_PUBLIC_KEY = 'test-public-key';
    process.env.VAPID_PRIVATE_KEY = 'test-private-key';

    vi.mocked(prisma.pushSubscription.findMany).mockResolvedValueOnce([
      {
        id: 'sub-obsoleta',
        userId: 'user-voluntario-1',
        endpoint: 'https://updates.push.services.mozilla.com/wpush/v2/def',
        keys: { p256dh: 'k', auth: 'a' },
      } as any,
    ]);

    const error410 = new Error('Subscription has expired or is no longer valid');
    (error410 as any).statusCode = 410;
    vi.mocked(webpush.sendNotification).mockRejectedValueOnce(error410);

    const result = await channel.send(mockRecipient, mockMessage);

    // Deve ter tentado remover a inscrição obsoleta do banco
    expect(prisma.pushSubscription.delete).toHaveBeenCalledWith({
      where: { id: 'sub-obsoleta' },
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('Subscription has expired');
  });
});
