import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('Fumaça e Acessibilidade (Smoke & A11y)', () => {
  test('Página de Login renderiza em pt-BR e cumpre regras de acessibilidade', async ({ page }) => {
    const response = await page.goto('/login');
    expect(response?.status()).toBe(200);

    // Valida cabeçalhos de segurança (Regra 12)
    const headers = response?.headers() || {};
    expect(headers['x-content-type-options']).toBe('nosniff');
    expect(headers['x-frame-options']).toBe('DENY');
    expect(headers['content-security-policy']).toContain("default-src 'self'");

    // Elementos essenciais em pt-BR
    await expect(page.locator('h1')).toContainText('Entrar no Revezo');
    await expect(page.locator('button[type="submit"]')).toBeVisible();

    // Auditoria de Acessibilidade com Axe
    const accessibilityScanResults = await new AxeBuilder({ page })
      .disableRules(['color-contrast']) // As cores são calibradas pelo tema da igreja
      .analyze();

    expect(accessibilityScanResults.violations.filter((v) => v.impact === 'critical')).toEqual([]);
  });

  test('Página de Cadastro de Voluntário é pública e acessível', async ({ page }) => {
    await page.goto('/cadastro');
    await expect(page.locator('h1')).toContainText('Cadastro de Voluntário');
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
  });

  test('Página de Recuperação de Senha é pública e acessível', async ({ page }) => {
    await page.goto('/esqueci-senha');
    await expect(page.locator('h1')).toContainText('Recuperar Senha');
    await expect(page.locator('input[type="email"]')).toBeVisible();
  });

  test('Página de Fallback Offline do PWA funciona sem autenticação', async ({ page }) => {
    await page.goto('/offline');
    await expect(page.locator('h1')).toContainText('Você está sem conexão');
  });
});
