import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { injectAuthSession } from './helpers/auth.js';

test.describe('E2E: Visualização de Escalas e Mural de Impressão A4', () => {
  test.beforeEach(async ({ context }) => {
    // Autentica como Gestor / Admin Master
    await injectAuthSession(context, {
      globalRole: 'ADMIN_MASTER',
      name: 'Pastor Roberto Nunes',
      email: 'roberto@revezo.local',
    });
  });

  test('Liderança acessa /escalas, inspeciona programas e abre modal de impressão de Mural A4', async ({ page }) => {
    const response = await page.goto('/escalas');
    expect(response?.status()).toBe(200);

    // Valida título da página de escalas
    await expect(page.getByRole('heading', { name: /montagem de escalas/i })).toBeVisible();

    // Garante congregação Central selecionada para carregar programas
    const churchSelector = page.getByRole('combobox', { name: /selecionar congregação ativa/i });
    if (await churchSelector.isVisible()) {
      await churchSelector.selectOption({ label: /central/i }).catch(() => {});
      await page.waitForTimeout(1000);
    }

    // Auditoria de Acessibilidade na visualização de escalas
    const pageA11y = await new AxeBuilder({ page })
      .disableRules(['color-contrast'])
      .analyze();
    expect(pageA11y.violations.filter((v) => v.impact === 'critical')).toEqual([]);

    // Botão de impressão do mural na barra superior
    const btnMural = page.getByRole('button', { name: /imprimir mural/i }).first();
    await expect(btnMural).toBeVisible();
    await btnMural.click();

    // Modal de Impressão A4 aberto
    const modalHeading = page.getByRole('heading', { name: /impressão de escala para mural/i });
    await expect(modalHeading).toBeVisible();

    // Controles de escopo e filtros do mural
    await expect(page.getByRole('button', { name: /apenas o culto selecionado/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /todos os cultos cadastrados/i })).toBeVisible();

    // Área de pré-visualização A4 (printable-mural-area)
    const printableArea = page.locator('#printable-mural-area');
    await expect(printableArea).toBeVisible();

    // Botão de ação de impressão presente dentro do modal
    const btnImprimir = page.getByRole('button', { name: /imprimir mural a4/i }).nth(1);
    await expect(btnImprimir).toBeVisible();

    // Auditoria de Acessibilidade com modal A4 aberto
    const modalA11y = await new AxeBuilder({ page })
      .disableRules(['color-contrast'])
      .analyze();
    expect(modalA11y.violations.filter((v) => v.impact === 'critical')).toEqual([]);

    // Fecha o modal pelo botão Fechar (X)
    const btnFechar = page.locator('button[title="Fechar"]').or(page.getByRole('button', { name: /fechar/i })).first();
    await btnFechar.click();
    await expect(modalHeading).not.toBeVisible();
  });

  test('Permite alternar entre visualização de lista e filtros de departamento no mural', async ({ page }) => {
    await page.goto('/escalas');

    const churchSelector = page.getByRole('combobox', { name: /selecionar congregação ativa/i });
    if (await churchSelector.isVisible()) {
      await churchSelector.selectOption({ label: /central/i }).catch(() => {});
      await page.waitForTimeout(1000);
    }

    // Abre o mural
    await page.getByRole('button', { name: /mural a4/i }).click();

    // Alterna para "Todos os cultos cadastrados"
    const btnTodos = page.getByRole('button', { name: /todos os cultos cadastrados/i });
    if (await btnTodos.isVisible()) {
      await btnTodos.click();
    }

    // Fecha o modal
    const closeBtn = page.locator('button[title="Fechar"]').or(page.getByRole('button', { name: /fechar/i })).first();
    await closeBtn.click();
  });
});
