import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { injectAuthSession } from './helpers/auth.js';

test.describe('E2E: Cadastro e Triagem/Aprovação de Voluntários', () => {
  test('Candidato a voluntário acessa /cadastro, preenche formulário completo e submete com sucesso', async ({ page }) => {
    // Mock de igrejas públicas para o select do cadastro
    await page.route('**/api/public/igrejas', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          churches: [{ id: 'igreja-central-1', name: 'Comunidade da Fé Central', slug: 'central' }],
        }),
      });
    });

    // Mock do endpoint de registro
    await page.route('**/api/auth/register', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          message: 'Cadastro enviado com sucesso! Aguarde o contato da liderança da sua congregação.',
        }),
      });
    });

    const response = await page.goto('/cadastro');
    expect(response?.status()).toBe(200);

    // Valida títulos e textos amigáveis em pt-BR
    await expect(page.getByRole('heading', { name: /cadastro de voluntário/i })).toBeVisible();
    await expect(page.getByText(/preencha seus dados para servir/i)).toBeVisible();

    // Preenche dados essenciais
    if (await page.locator('select[name="churchId"]').isVisible()) {
      await page.locator('select[name="churchId"]').selectOption({ index: 1 });
    }
    await page.locator('input[name="name"]').fill('Lucas Gabriel Santos');
    await page.locator('input[name="email"]').fill('lucas.santos@teste.local');
    await page.locator('input[name="password"]').fill('SenhaForte@2026!');
    await page.locator('input[name="birthDate"]').fill('1998-05-14');
    await page.locator('input[name="phonePrimary"]').fill('+5511987654321');
    await page.locator('input[name="whatsapp"]').fill('+5511987654321');

    // Contato de emergência
    await page.locator('input[name="emergencyName"]').fill('Mariana Santos');
    await page.locator('input[name="emergencyPhone"]').fill('+5511999998888');
    await page.locator('input[name="emergencyRelationship"]').fill('Esposa');

    // Termo de consentimento LGPD
    await page.locator('input[name="termsAccepted"]').check();

    // Verificação de acessibilidade da tela de cadastro
    const accessibilityScan = await new AxeBuilder({ page })
      .disableRules(['color-contrast'])
      .analyze();
    expect(accessibilityScan.violations.filter((v) => v.impact === 'critical')).toEqual([]);

    // Submete o cadastro
    await page.getByRole('button', { name: /enviar cadastro para aprovação/i }).click();

    // Tela de confirmação e boas-vindas
    await expect(page.getByRole('heading', { name: /cadastro enviado!/i })).toBeVisible();
    await expect(page.getByText(/aguarde o contato da liderança/i)).toBeVisible();

    const backLink = page.getByRole('link', { name: /voltar para o login/i });
    await expect(backLink).toBeVisible();
    await expect(backLink).toHaveAttribute('href', '/login');
  });

  test('Liderança acessa /aprovacoes e realiza triagem de novos voluntários e escalas', async ({ context, page }) => {
    // Injeta sessão como ADMIN_MASTER
    await injectAuthSession(context, {
      globalRole: 'ADMIN_MASTER',
      name: 'Pastor Marcos Aurélio',
      email: 'pastor@escalaigreja.local',
    });

    // Mock do endpoint de aprovação de voluntário
    await page.route('**/api/aprovacoes/aprovar', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          message: 'Cadastro de Lucas Gabriel aprovado com sucesso!',
        }),
      });
    });

    const response = await page.goto('/aprovacoes');
    expect(response?.status()).toBe(200);

    // Validação da interface de aprovações
    await expect(page.getByRole('heading', { name: /central de aprovações/i })).toBeVisible();

    // Abas de triagem
    const tabNovosCadastros = page.getByRole('button', { name: /novos cadastros/i });
    const tabEscalas = page.getByRole('button', { name: /escalas aguardando aprovação/i });

    await expect(tabNovosCadastros).toBeVisible();
    await expect(tabEscalas).toBeVisible();

    // Alternância de abas
    await tabEscalas.click();
    await expect(page.getByText(/nenhuma escala preliminar aguardando aprovação/i).or(page.getByRole('button', { name: /aprovar selecionadas/i }))).toBeVisible();

    await tabNovosCadastros.click();

    // Auditoria de Acessibilidade no painel de aprovações
    const accessibilityScan = await new AxeBuilder({ page })
      .disableRules(['color-contrast'])
      .analyze();
    expect(accessibilityScan.violations.filter((v) => v.impact === 'critical')).toEqual([]);
  });
});
