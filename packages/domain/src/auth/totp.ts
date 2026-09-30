import { createHash, createHmac, randomBytes } from 'crypto';

const BASE32_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

/**
 * Converte Buffer em string Base32.
 */
export function base32Encode(buffer: Buffer): string {
  let bits = 0;
  let value = 0;
  let output = '';

  for (let i = 0; i < buffer.length; i++) {
    const byte = buffer[i]!;
    value = (value << 8) | byte;
    bits += 8;

    while (bits >= 5) {
      output += BASE32_CHARS[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }

  if (bits > 0) {
    output += BASE32_CHARS[(value << (5 - bits)) & 31];
  }

  return output;
}

/**
 * Converte string Base32 de volta para Buffer.
 */
export function base32Decode(base32: string): Buffer {
  const clean = base32.toUpperCase().replace(/[\s=-]/g, '');
  let bits = 0;
  let value = 0;
  const bytes: number[] = [];

  for (let i = 0; i < clean.length; i++) {
    const idx = BASE32_CHARS.indexOf(clean[i]!);
    if (idx === -1) {
      throw new Error(`Caractere Base32 inválido: ${clean[i]}`);
    }
    value = (value << 5) | idx;
    bits += 5;

    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }

  return Buffer.from(bytes);
}

/**
 * Gera um segredo TOTP aleatório de 20 bytes em formato Base32.
 */
export function generateTotpSecret(): string {
  const bytes = randomBytes(20);
  return base32Encode(bytes);
}

/**
 * Calcula o código TOTP de 6 dígitos para um determinado contador de tempo.
 */
export function computeTotp(secretBase32: string, counter: number): string {
  const key = base32Decode(secretBase32);
  const counterBuffer = Buffer.alloc(8);
  counterBuffer.writeBigInt64BE(BigInt(counter));

  const hmac = createHmac('sha1', key);
  hmac.update(counterBuffer);
  const digest = hmac.digest();

  // Dynamic truncation (RFC 4226)
  const offset = digest[digest.length - 1]! & 0x0f;
  const codeInt =
    ((digest[offset]! & 0x7f) << 24) |
    ((digest[offset + 1]! & 0xff) << 16) |
    ((digest[offset + 2]! & 0xff) << 8) |
    (digest[offset + 3]! & 0xff);

  const otp = codeInt % 1000000;
  return otp.toString().padStart(6, '0');
}

/**
 * Verifica se um código TOTP de 6 dígitos é válido para o segredo informado.
 * Tolera drift de tempo de +/- 1 passo de 30 segundos (janela de 90 segundos no total).
 */
export function verifyTotp(
  token: string,
  secretBase32: string,
  nowMs = Date.now(),
  stepSeconds = 30,
  window = 1
): boolean {
  if (!/^\d{6}$/.test(token)) {
    return false;
  }

  const currentCounter = Math.floor(nowMs / 1000 / stepSeconds);

  for (let offset = -window; offset <= window; offset++) {
    const expected = computeTotp(secretBase32, currentCounter + offset);
    if (expected === token) {
      return true;
    }
  }

  return false;
}

/**
 * Gera URL para cadastro em apps como Google Authenticator / 1Password.
 */
export function getTotpUri(secretBase32: string, accountName: string, issuer = 'Escala Igreja'): string {
  const encodedIssuer = encodeURIComponent(issuer);
  const encodedAccount = encodeURIComponent(accountName);
  return `otpauth://totp/${encodedIssuer}:${encodedAccount}?secret=${secretBase32}&issuer=${encodedIssuer}&algorithm=SHA1&digits=6&period=30`;
}

/**
 * Gera 8 códigos de recuperação aleatórios e seus respectivos hashes SHA-256.
 */
export function generateRecoveryCodes(): { plainCodes: string[]; hashedCodes: string[] } {
  const plainCodes: string[] = [];
  const hashedCodes: string[] = [];

  for (let i = 0; i < 8; i++) {
    const code = randomBytes(5).toString('hex').toUpperCase(); // 10 caracteres hexadecimais legíveis
    plainCodes.push(code);
    hashedCodes.push(createHash('sha256').update(code).digest('hex'));
  }

  return { plainCodes, hashedCodes };
}

/**
 * Valida um código de recuperação e, se válido, retorna a lista atualizada sem o código consumido.
 */
export function verifyAndConsumeRecoveryCode(
  inputCode: string,
  hashedCodes: string[]
): { valid: boolean; remainingHashedCodes: string[] } {
  if (!inputCode || !hashedCodes || hashedCodes.length === 0) {
    return { valid: false, remainingHashedCodes: hashedCodes || [] };
  }

  // Normaliza o código removendo espaços e hifens
  const normalized = inputCode.trim().toUpperCase().replace(/[\s-]/g, '');
  const hash = createHash('sha256').update(normalized).digest('hex');

  const index = hashedCodes.indexOf(hash);
  if (index === -1) {
    return { valid: false, remainingHashedCodes: hashedCodes };
  }

  const remaining = [...hashedCodes];
  remaining.splice(index, 1);

  return { valid: true, remainingHashedCodes: remaining };
}

/**
 * Formata um segredo Base32 em grupos de 4 caracteres legíveis (ex: ABCD EFGH ...).
 */
export function formatSecretForDisplay(secret: string): string {
  const clean = secret.toUpperCase().replace(/\s/g, '');
  return clean.match(/.{1,4}/g)?.join(' ') || clean;
}
