import { createHmac } from 'crypto';
import type { BrowserContext } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

const SESSION_COOKIE_NAME = 'revezo_sess';

function getSessionSecret(): string {
  if (process.env.AUTH_SECRET) {
    return process.env.AUTH_SECRET.replace(/^["']|["']$/g, '');
  }

  for (const envPath of ['apps/web/.env', '.env', 'packages/db/.env']) {
    const fullPath = path.resolve(process.cwd(), envPath);
    if (fs.existsSync(fullPath)) {
      const content = fs.readFileSync(fullPath, 'utf8');
      const match = content.match(/^AUTH_SECRET=["']?([^"'\r\n]+)["']?/m);
      if (match && match[1]) {
        return match[1];
      }
    }
  }

  return 'chave-secreta-padrao-desenvolvimento-revezo-32b';
}

const SESSION_SECRET = getSessionSecret();

export interface MockSessionOptions {
  userId?: string;
  name?: string;
  email?: string;
  globalRole?: 'ADMIN_MASTER' | 'USER';
  status?: 'ACTIVE' | 'PENDING' | 'BLOCKED';
}

/**
 * Cria o payload e assinatura HMAC idênticos aos gerados pelo auth-service.ts da aplicação.
 */
export function generateMockSessionToken(options: MockSessionOptions = {}): string {
  const payload = {
    userId: options.userId || 'usr_test_123',
    globalRole: options.globalRole || 'USER',
    status: options.status || 'ACTIVE',
    name: options.name || 'Voluntário de Teste',
    email: options.email || 'voluntario@revezo.local',
    createdAt: Date.now(),
  };

  const json = JSON.stringify(payload);
  const base64Data = Buffer.from(json, 'utf8').toString('base64url');
  const signature = createHmac('sha256', SESSION_SECRET)
    .update(base64Data)
    .digest('base64url');

  return `${base64Data}.${signature}`;
}

/**
 * Injeta o cookie de sessão autenticada diretamente no contexto do Playwright.
 */
export async function injectAuthSession(
  context: BrowserContext,
  options: MockSessionOptions = {},
  domain = 'localhost'
) {
  const token = generateMockSessionToken(options);
  await context.addCookies([
    {
      name: SESSION_COOKIE_NAME,
      value: token,
      domain,
      path: '/',
      httpOnly: true,
      sameSite: 'Lax',
    },
  ]);
}
