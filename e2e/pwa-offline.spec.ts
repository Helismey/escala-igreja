import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('PWA e Suporte Offline', () => {
  test('Manifesto PWA (/manifest.json) é válido e cumpre critérios de instalabilidade', async ({
    request,
  }) => {
    const res = await request.get('/manifest.json');
    expect(res.status()).toBe(200);

    const manifest = await res.json();
    expect(manifest.name).toBe('Revezo');
    expect(manifest.short_name).toBe('Escala');
    expect(manifest.start_url).toBe('/');
    expect(manifest.display).toBe('standalone');
    expect(manifest.theme_color).toBe('#0F4C5C');
    expect(manifest.background_color).toBe('#F4F6F7');

    expect(Array.isArray(manifest.icons)).toBe(true);
    const icon192 = manifest.icons.find((i: { sizes: string }) => i.sizes === '192x192');
    const icon512 = manifest.icons.find((i: { sizes: string }) => i.sizes === '512x512');
    expect(icon192).toBeDefined();
    expect(icon512).toBeDefined();
  });

  test('Service Worker (/sw.js) está publicado e contém rotinas de cache e Web Push', async ({
    request,
  }) => {
    const res = await request.get('/sw.js');
    expect(res.status()).toBe(200);

    const content = await res.text();
    expect(content).toContain("addEventListener('install'");
    expect(content).toContain("addEventListener('activate'");
    expect(content).toContain("addEventListener('fetch'");
    expect(content).toContain("addEventListener('push'");
    expect(content).toContain("addEventListener('notificationclick'");
  });

  test('Ícones PWA estão disponíveis e respondem com status 200', async ({ request }) => {
    const icon192Res = await request.get('/icon-192.png');
    expect(icon192Res.status()).toBe(200);

    const icon512Res = await request.get('/icon-512.png');
    expect(icon512Res.status()).toBe(200);
  });

  test('Página de fallback offline (/offline) é amigável e acessível', async ({ page }) => {
    const response = await page.goto('/offline');
    expect(response?.status()).toBe(200);

    // Valida textos em pt-BR
    await expect(page.getByRole('heading', { name: /você está sem conexão/i })).toBeVisible();
    await expect(
      page.getByText(/não conseguimos carregar novos dados no momento/i)
    ).toBeVisible();

    // Valida link para escalas salvas
    const linkMinhaEscala = page.getByRole('link', { name: /ver minha escala salva/i });
    await expect(linkMinhaEscala).toBeVisible();
    await expect(linkMinhaEscala).toHaveAttribute('href', '/minha-escala');

    // Valida botão de reconexão
    const retryButton = page.getByRole('button', { name: /tentar reconectar/i });
    await expect(retryButton).toBeVisible();

    // Auditoria de Acessibilidade
    const accessibilityScan = await new AxeBuilder({ page })
      .disableRules(['color-contrast'])
      .analyze();
    expect(accessibilityScan.violations.filter((v) => v.impact === 'critical')).toEqual([]);
  });
});
