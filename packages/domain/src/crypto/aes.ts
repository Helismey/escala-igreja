import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const CURRENT_VERSION = 'v1';
const IV_LENGTH = 12; // 96 bits recomendado para GCM
const AUTH_TAG_LENGTH = 16; // 128 bits

/**
 * Normaliza ou deriva uma chave de 32 bytes a partir de uma string ou chave hex.
 */
function normalizeKey(key: string): Buffer {
  if (key.length === 64 && /^[0-9a-fA-F]+$/.test(key)) {
    return Buffer.from(key, 'hex');
  }
  const keyBuf = Buffer.from(key, 'utf-8');
  if (keyBuf.length === 32) {
    return keyBuf;
  }
  // Se for diferente de 32 bytes, preenche ou trunca com segurança
  const fixedKey = Buffer.alloc(32);
  keyBuf.copy(fixedKey, 0, 0, Math.min(keyBuf.length, 32));
  return fixedKey;
}

/**
 * Criptografa dados em nível de aplicação usando AES-256-GCM.
 * Formato retornado: v1:ivHex:authTagHex:ciphertextHex
 */
export function encryptField(plainText: string, encryptionKey: string): string {
  if (!plainText) return '';
  const key = normalizeKey(encryptionKey);
  const iv = randomBytes(IV_LENGTH);

  const cipher = createCipheriv(ALGORITHM, key, iv, {
    authTagLength: AUTH_TAG_LENGTH,
  });

  const encrypted = Buffer.concat([
    cipher.update(plainText, 'utf8'),
    cipher.final(),
  ]);

  const authTag = cipher.getAuthTag();

  return `${CURRENT_VERSION}:${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted.toString('hex')}`;
}

/**
 * Decriptografa dados criptografados com AES-256-GCM.
 */
export function decryptField(encryptedPayload: string, encryptionKey: string): string {
  if (!encryptedPayload) return '';

  const parts = encryptedPayload.split(':');
  if (parts.length !== 4) {
    throw new Error('Payload criptografado em formato inválido');
  }

  const [version, ivHex, authTagHex, cipherTextHex] = parts as [string, string, string, string];
  if (version !== CURRENT_VERSION) {
    throw new Error(`Versão de criptografia não suportada: ${version}`);
  }

  const key = normalizeKey(encryptionKey);
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');
  const encrypted = Buffer.from(cipherTextHex, 'hex');

  const decipher = createDecipheriv(ALGORITHM, key, iv, {
    authTagLength: AUTH_TAG_LENGTH,
  });

  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([
    decipher.update(encrypted),
    decipher.final(),
  ]);

  return decrypted.toString('utf8');
}
