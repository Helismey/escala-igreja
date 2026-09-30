---
name: seed-e-dados-de-teste
description: Use para criar dados fictícios de desenvolvimento e teste.
---

# Seed fictício

- Script `packages/db/prisma/seed.ts` com igreja, 4 departamentos, ~60 membros, funções, programas e escalas fictícias e reproduzíveis (semente fixa).
- Nomes, telefones (faixas reservadas), e-mails (`@example.com`) e endereços inventados. NUNCA dados reais.
- Incluir casos de borda: pessoa em 2 departamentos, quem já tem 2 escalas no dia, indisponibilidades, slots abertos.
- Perfis de teste: 1 admin, 2 gestores, membros e PENDENTE.
