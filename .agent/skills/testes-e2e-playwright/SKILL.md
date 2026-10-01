---
name: testes-e2e-playwright
description: Use ao criar ou manter testes ponta a ponta (Playwright), incluindo celular, desktop e acessibilidade com axe.
---

# E2E com Playwright

- Poucos testes, estáveis, nas jornadas de `docs/testing/jornadas-e2e.md`.
- Projetos: celular (viewport ~390x844, toque) e desktop. Jornadas de membro rodam no celular; gestão e admin no desktop (e as principais também no celular).
- Autenticação: um teste faz o login pela interface; os demais reutilizam sessão salva por perfil (`storageState`), gerada por helper contra o banco de teste.
- Dados: seed fictício reiniciado por suíte; relógio controlado quando a jornada depender de data.
- Notificações: adaptador falso; o teste lê o registro do que seria enviado.
- Acessibilidade: `@axe-core/playwright` nas telas principais; falha com violação séria ou crítica.
- Seletores por papel e rótulo acessível (`getByRole`, `getByLabel`), não por classe CSS.
- Sem `waitForTimeout`; usar esperas por condição. Teste instável vai para quarentena em até 48 h com issue aberta.
- Artefatos de falha (trace, screenshot) só no CI, em pastas ignoradas pelo git e sem dados reais.
