import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('Jornada do Voluntário — Confirmação e Aviso de Imprevisto', () => {
  test('Voluntário com token inválido ou expirado visualiza mensagem clara e link de login', async ({ page }) => {
    const response = await page.goto('/confirmar/token-inexistente-ou-expirado');
    expect(response?.status()).toBe(200);

    // Valida estrutura visual de erro amigável em pt-BR
    await expect(page.getByRole('heading', { name: /link indisponível/i })).toBeVisible();
    await expect(page.getByText(/links de confirmação são de uso único/i)).toBeVisible();

    const loginButton = page.getByRole('link', { name: /entrar no sistema/i });
    await expect(loginButton).toBeVisible();
    await expect(loginButton).toHaveAttribute('href', '/login');

    // Auditoria de Acessibilidade no estado de erro
    const accessibilityScan = await new AxeBuilder({ page })
      .disableRules(['color-contrast'])
      .analyze();
    expect(accessibilityScan.violations.filter((v) => v.impact === 'critical')).toEqual([]);
  });

  test('Voluntário visualiza detalhes da escala ao acessar link de confirmação válido', async ({ page }) => {
    await page.goto('/confirmar/e2e-token-valido-teste');

    // Valida cabeçalhos e detalhes do serviço
    await expect(page.getByRole('heading', { name: /olá, ana!/i })).toBeVisible();
    await expect(page.getByText('Culto da Família')).toBeVisible();
    await expect(page.getByText('Louvor')).toBeVisible();
    await expect(page.getByText('Vocal Soprano')).toBeVisible();

    // Botões de ação em pt-BR acessíveis
    await expect(page.getByRole('button', { name: /confirmar presença/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /não poderei ir \(avisar imprevisto\)/i })).toBeVisible();

    // Acessibilidade na tela de detalhes
    const accessibilityScan = await new AxeBuilder({ page })
      .disableRules(['color-contrast'])
      .analyze();
    expect(accessibilityScan.violations.filter((v) => v.impact === 'critical')).toEqual([]);
  });

  test('Voluntário confirma presença com sucesso e recebe feedback imediato', async ({ page }) => {
    // Intercepta a chamada de API de confirmação
    await page.route('**/api/confirmar/e2e-token-valido-teste', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          message: 'Presença confirmada com sucesso! Que Deus abençoe seu ministério.',
        }),
      });
    });

    await page.goto('/confirmar/e2e-token-valido-teste');
    await page.getByRole('button', { name: /confirmar presença/i }).click();

    // Feedback caloroso e positivo exibido
    await expect(
      page.getByText('Presença confirmada com sucesso! Que Deus abençoe seu ministério.')
    ).toBeVisible();

    // Botão de confirmação não deve mais estar disponível
    await expect(page.getByRole('button', { name: /confirmar presença/i })).not.toBeVisible();
  });

  test('Voluntário informa imprevisto e desmarca com justificativa', async ({ page }) => {
    // Intercepta a chamada de API de recusa/desmarcação
    await page.route('**/api/confirmar/e2e-token-valido-teste', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          message: 'Agradecemos por nos avisar! Seu ministério foi informado sobre o imprevisto.',
        }),
      });
    });

    await page.goto('/confirmar/e2e-token-valido-teste');

    // Abre formulário de imprevisto
    await page.getByRole('button', { name: /não poderei ir \(avisar imprevisto\)/i }).click();

    await expect(
      page.getByText('Sentiremos sua falta! Pode nos contar o motivo?')
    ).toBeVisible();

    // Seleciona motivo e confirma
    await page.getByLabel('Viagem ou compromisso familiar').check();
    await page.getByRole('button', { name: /confirmar desmarcação/i }).click();

    // Feedback empático exibido
    await expect(
      page.getByText(/agradecemos por nos avisar com antecedência! o gestor da sua equipe foi notificado/i)
    ).toBeVisible();
  });
});
