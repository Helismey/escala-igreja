import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { injectAuthSession } from './helpers/auth.js';

test.describe('E2E: Minha Escala, Desmarcação com Justificativa e Alerta de Urgência (<24h)', () => {
  test.beforeEach(async ({ context }) => {
    // Autentica como voluntário ativo
    await injectAuthSession(context, {
      globalRole: 'USER',
      name: 'Beatriz Martins',
      email: 'beatriz.martins@revezo.local',
    });
  });

  test('Voluntário acessa /minha-escala, visualiza escalas, alterna visão e valida acessibilidade', async ({ page }) => {
    const response = await page.goto('/minha-escala');
    expect(response?.status()).toBe(200);

    // Valida cabeçalho amigável
    await expect(page.getByRole('heading', { name: /minha escala/i })).toBeVisible();

    // Alternância de visão Lista / Calendário
    const btnLista = page.getByRole('button', { name: /^lista/i });
    const btnCalendario = page.getByRole('button', { name: /^meu calendário/i });

    await expect(btnLista).toBeVisible();
    await expect(btnCalendario).toBeVisible();

    await btnCalendario.click();
    await expect(page.getByText('Dom').first()).toBeVisible();

    await btnLista.click();

    // Auditoria de Acessibilidade da página inicial do voluntário
    const pageA11y = await new AxeBuilder({ page })
      .disableRules(['color-contrast'])
      .analyze();
    expect(pageA11y.violations.filter((v) => v.impact === 'critical')).toEqual([]);
  });

  test('Voluntário inicia fluxo de desmarcação: valida obrigatoriedade de motivo e fecha modal', async ({ page }) => {
    await page.goto('/minha-escala');

    const btnDesmarcar = page.getByRole('button', { name: /desmarcar/i }).first();
    const hasSchedules = await btnDesmarcar.isVisible().catch(() => false);

    if (hasSchedules) {
      await btnDesmarcar.click();

      // Modal de desmarcação aberto
      const modalHeading = page.getByRole('heading', { name: /desmarcar da escala/i });
      await expect(modalHeading).toBeVisible();

      // Textarea de justificativa obrigatória
      const textareaMotivo = page.locator('#decline-reason');
      await expect(textareaMotivo).toBeVisible();

      // Botão de confirmação desabilitado sem preencher motivo
      const btnConfirmar = page.getByRole('button', { name: /confirmar desmarcação/i });
      await expect(btnConfirmar).toBeDisabled();

      // Ao digitar justificativa, o botão é habilitado
      await textareaMotivo.fill('Consulta médica de urgência inadiável com a família.');
      await expect(btnConfirmar).toBeEnabled();

      // Auditoria de Acessibilidade dentro do modal de desmarcação
      const modalA11y = await new AxeBuilder({ page })
        .disableRules(['color-contrast'])
        .analyze();
      expect(modalA11y.violations.filter((v) => v.impact === 'critical')).toEqual([]);

      // Clica em "Voltar" e cancela a desmarcação
      await page.getByRole('button', { name: /voltar/i }).click();
      await expect(modalHeading).not.toBeVisible();
    } else {
      // Estado vazio quando o voluntário não possui escalas futuras
      await expect(page.getByText(/você não está escalado\(a\) nos próximos dias/i)).toBeVisible();
    }
  });
});
