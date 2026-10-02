import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import {
  WhatsAppNotificationChannel,
  resolveWhatsAppProvider,
} from '../src/services/notifications/channels/whatsapp-channel';
import {
  MetaCloudWhatsAppProvider,
  EvolutionWhatsAppProvider,
  ZApiWhatsAppProvider,
  SimulationWhatsAppProvider,
} from '../src/services/notifications/channels/whatsapp';
import { NotificationRecipient } from '../src/services/notifications/types';
import { RenderedMessage } from '@escala-igreja/domain';

describe('WhatsApp Multi-Provider Channel (Meta Cloud API, Evolution, Z-API, Simulation)', () => {
  const originalEnv = process.env;

  const mockRecipient: NotificationRecipient = {
    userId: 'user-wpp-1',
    name: 'Carlos Oliveira',
    email: 'carlos@example.com',
    phonePrimary: '(62) 98765-4321',
    whatsapp: '62987654321',
    preferredChannel: 'WHATSAPP',
    optOutWhatsapp: false,
    optOutEmail: false,
    optOutPush: false,
    optOutSms: true,
  };

  const mockMessage: RenderedMessage = {
    subject: 'Escala Confirmada',
    title: 'Culto Matutino',
    bodyText: 'Olá, Carlos! Você está escalado na Sonoplastia amanhã às 09:00.',
    bodyHtml: '<p>Olá, Carlos!</p>',
    actionUrl: 'https://escala.igreja.local/confirmar/token-wpp',
  };

  beforeEach(() => {
    process.env = { ...originalEnv };
    vi.restoreAllMocks();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('bloqueia envio e retorna erro quando destinatário possui opt-out de WhatsApp', async () => {
    const channel = new WhatsAppNotificationChannel();
    const result = await channel.send({ ...mockRecipient, optOutWhatsapp: true }, mockMessage);

    expect(result.success).toBe(false);
    expect(result.channel).toBe('whatsapp');
    expect(result.error).toContain('opt-out');
  });

  it('retorna erro quando destinatário não possui número de telefone cadastrado', async () => {
    const channel = new WhatsAppNotificationChannel();
    const result = await channel.send(
      { ...mockRecipient, phonePrimary: null, whatsapp: null },
      mockMessage
    );

    expect(result.success).toBe(false);
    expect(result.error).toContain('sem número de telefone');
  });

  it('retorna erro se o telefone possuir menos de 10 dígitos', async () => {
    const channel = new WhatsAppNotificationChannel();
    const result = await channel.send(
      { ...mockRecipient, phonePrimary: '12345', whatsapp: '12345' },
      mockMessage
    );

    expect(result.success).toBe(false);
    expect(result.error).toContain('inválido ou incompleto');
  });

  describe('Resolução Dinâmica de Provedores', () => {
    it('retorna SimulationProvider por padrão se nenhuma credencial estiver no .env', () => {
      delete process.env.WHATSAPP_PROVIDER;
      delete process.env.META_WHATSAPP_TOKEN;
      delete process.env.EVOLUTION_API_URL;
      delete process.env.ZAPI_TOKEN;

      const provider = resolveWhatsAppProvider();
      expect(provider).toBeInstanceOf(SimulationWhatsAppProvider);
      expect(provider.name).toBe('simulation');
    });

    it('retorna MetaCloudProvider quando WHATSAPP_PROVIDER=meta e chaves estão presentes', () => {
      process.env.WHATSAPP_PROVIDER = 'meta';
      process.env.META_WHATSAPP_TOKEN = 'mock-meta-token';
      process.env.META_WHATSAPP_PHONE_NUMBER_ID = '1234567890';

      const provider = resolveWhatsAppProvider();
      expect(provider).toBeInstanceOf(MetaCloudWhatsAppProvider);
      expect(provider.name).toBe('meta');
    });

    it('faz fallback para simulação se WHATSAPP_PROVIDER=meta mas chaves estiverem ausentes', () => {
      process.env.WHATSAPP_PROVIDER = 'meta';
      delete process.env.META_WHATSAPP_TOKEN;
      delete process.env.META_WHATSAPP_PHONE_NUMBER_ID;

      const provider = resolveWhatsAppProvider();
      expect(provider).toBeInstanceOf(SimulationWhatsAppProvider);
    });

    it('retorna EvolutionProvider quando WHATSAPP_PROVIDER=evolution', () => {
      process.env.WHATSAPP_PROVIDER = 'evolution';
      process.env.EVOLUTION_API_URL = 'https://evolution.example.com';
      process.env.EVOLUTION_API_KEY = 'mock-evo-key';

      const provider = resolveWhatsAppProvider();
      expect(provider).toBeInstanceOf(EvolutionWhatsAppProvider);
      expect(provider.name).toBe('evolution');
    });

    it('retorna ZApiProvider quando WHATSAPP_PROVIDER=zapi', () => {
      process.env.WHATSAPP_PROVIDER = 'zapi';
      process.env.ZAPI_INSTANCE_ID = 'zapi-inst-123';
      process.env.ZAPI_TOKEN = 'zapi-token-abc';

      const provider = resolveWhatsAppProvider();
      expect(provider).toBeInstanceOf(ZApiWhatsAppProvider);
      expect(provider.name).toBe('zapi');
    });
  });

  describe('Envios com os diferentes provedores', () => {
    it('envia mensagem via Meta Cloud API com sucesso', async () => {
      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            messaging_product: 'whatsapp',
            messages: [{ id: 'wamid.HBgM...' }],
          }),
          { status: 200 }
        )
      );

      const metaProvider = new MetaCloudWhatsAppProvider({
        token: 'test-meta-token',
        phoneNumberId: '987654321',
      });

      const channel = new WhatsAppNotificationChannel(metaProvider);
      const result = await channel.send(mockRecipient, mockMessage);

      expect(fetchSpy).toHaveBeenCalledWith(
        'https://graph.facebook.com/v21.0/987654321/messages',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            Authorization: 'Bearer test-meta-token',
            'Content-Type': 'application/json',
          }),
        })
      );

      const callBody = JSON.parse(fetchSpy.mock.calls[0][1]?.body as string);
      expect(callBody.to).toBe('5562987654321');
      expect(callBody.text.body).toBe(mockMessage.bodyText);

      expect(result.success).toBe(true);
      expect(result.externalMessageId).toBe('wamid.HBgM...');
    });

    it('envia mensagem via Evolution API com sucesso', async () => {
      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            key: { id: 'evo-msg-id-123' },
          }),
          { status: 200 }
        )
      );

      const evoProvider = new EvolutionWhatsAppProvider({
        apiUrl: 'https://evo.minhaigreja.com',
        apiKey: 'evo-secret-key',
        instanceName: 'igreja-central',
      });

      const channel = new WhatsAppNotificationChannel(evoProvider);
      const result = await channel.send(mockRecipient, mockMessage);

      expect(fetchSpy).toHaveBeenCalledWith(
        'https://evo.minhaigreja.com/message/sendText/igreja-central',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            apikey: 'evo-secret-key',
          }),
        })
      );

      const callBody = JSON.parse(fetchSpy.mock.calls[0][1]?.body as string);
      expect(callBody.number).toBe('5562987654321');

      expect(result.success).toBe(true);
      expect(result.externalMessageId).toBe('evo-msg-id-123');
    });

    it('envia mensagem via Z-API com sucesso', async () => {
      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            zaapId: 'zaap-998877',
            messageId: 'zapi-msg-1',
          }),
          { status: 200 }
        )
      );

      const zapiProvider = new ZApiWhatsAppProvider({
        instanceId: 'inst-12345',
        token: 'token-67890',
        clientToken: 'security-token',
      });

      const channel = new WhatsAppNotificationChannel(zapiProvider);
      const result = await channel.send(mockRecipient, mockMessage);

      expect(fetchSpy).toHaveBeenCalledWith(
        'https://api.z-api.io/instances/inst-12345/token/token-67890/send-text',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Client-Token': 'security-token',
          }),
        })
      );

      const callBody = JSON.parse(fetchSpy.mock.calls[0][1]?.body as string);
      expect(callBody.phone).toBe('5562987654321');

      expect(result.success).toBe(true);
      expect(result.externalMessageId).toBe('zaap-998877');
    });

    it('opera em modo de simulação sem disparar requisições externas', async () => {
      const fetchSpy = vi.spyOn(globalThis, 'fetch');
      const simProvider = new SimulationWhatsAppProvider();
      const channel = new WhatsAppNotificationChannel(simProvider);

      const result = await channel.send(mockRecipient, mockMessage);

      expect(fetchSpy).not.toHaveBeenCalled();
      expect(result.success).toBe(true);
      expect(result.externalMessageId).toContain('sim-wpp-');
    });
  });
});
