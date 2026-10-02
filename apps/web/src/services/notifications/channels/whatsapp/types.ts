export interface WhatsAppSendMessagePayload {
  toPhone: string; // Apenas dígitos (ex: "5511999998888")
  text: string;
  subject?: string;
  actionUrl?: string;
}

export interface WhatsAppSendResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export interface WhatsAppProvider {
  readonly name: string;
  sendMessage(payload: WhatsAppSendMessagePayload): Promise<WhatsAppSendResult>;
}
