import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { injectAuthSession } from './helpers/auth';

test.describe('Proteção de Rotas e Autenticação (Auth Guards & Login UX)', () => {
  const protectedRoutes = [
    { path: '/minha-escala', expectedRedirect: '/login?from=%2Fminha-escala' },
    { path: '/membros', expectedRedirect: '/login?from=%2Fmembros' },
    { path: '/escalas', expectedRedirect: '/login?from=%2Fescalas' },
    { path: '/trocas', expectedRedirect: '/login?from=%2Ftrocas' },
    { path: '/configuracoes', expectedRedirect: '/login?from=%2Fconfiguracoes' },
  ];

  for (const { path, expectedRedirect } of protectedRoutes) {
    test(`Visitante não autenticado é redirecionado ao tentar acessar ${path}`, async ({ page }) => {
      await page.goto(path);
      await expect(page).toHaveURL(new RegExp(expectedRedirect.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
      await expect(page.getByRole('heading', { name: /entrar no revezo/i })).toBeVisible();
    });
  }

  test('Formulário de login exibe erro amigável em pt-BR diante de credenciais inválidas', async ({ page }) => {
    // Mock da resposta de autenticação para desacoplar da base real
    await page.route('**/api/auth/login', async (route) => {
      await route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({
          success: false,
          error: 'E-mail ou senha incorretos.',
        }),
      });
    });

    await page.goto('/login');

    await page.getByLabel(/e-mail/i).fill('invalido@igreja.org');
    await page.getByLabel(/senha/i).fill('SenhaErrada123!');
    await page.getByRole('button', { name: /entrar/i }).click();

    // Mensagem de alerta visível e clara
    await expect(page.getByText('E-mail ou senha incorretos.')).toBeVisible();

    // Verificação de acessibilidade com o banner de erro visível
    const accessibilityScan = await new AxeBuilder({ page })
      .disableRules(['color-contrast'])
      .analyze();
    expect(accessibilityScan.violations.filter((v) => v.impact === 'critical')).toEqual([]);
  });

  test('Links auxiliares de recuperação e cadastro estão presentes e navegáveis', async ({ page }) => {
    await page.goto('/login');

    const forgotPasswordLink = page.getByRole('link', { name: /esqueceu sua senha\?/i });
    await expect(forgotPasswordLink).toBeVisible();
    await expect(forgotPasswordLink).toHaveAttribute('href', '/esqueci-senha');

    const registerLink = page.getByRole('link', { name: /cadastre-se como voluntário/i });
    await expect(registerLink).toBeVisible();
    await expect(registerLink).toHaveAttribute('href', '/cadastro');
  });

  test('Usuário autenticado que acessa /login é redirecionado para a home', async ({
    context,
    page,
  }) => {
    await injectAuthSession(context, {
      userId: 'usr_membro_e2e',
      globalRole: 'MEMBER',
      name: 'Membro Teste E2E',
    });

    await page.goto('/login', { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL(/\/(#.*)?$/);
  });

  test('Usuário autenticado que acessa /cadastro é redirecionado para a home', async ({
    context,
    page,
  }) => {
    await injectAuthSession(context, {
      userId: 'usr_membro_e2e',
      globalRole: 'MEMBER',
      name: 'Membro Teste E2E',
    });

    await page.goto('/cadastro', { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL(/\/(#.*)?$/);
  });
});
