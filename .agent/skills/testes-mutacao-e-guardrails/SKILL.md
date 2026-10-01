---
name: testes-mutacao-e-guardrails
description: Use para rodar teste de mutação (Stryker), revisar a qualidade dos testes e impedir que o agente enfraqueça testes.
---

# Mutação e salvaguardas

- Stryker no `packages/domain` (escala e autorização). Rodar à noite e antes de cada release. Meta: pontuação de mutação acima de 80%.
- Mutante sobrevivente = teste faltando: escrever o teste que o mata e registrar.
- **Revisão de testes escritos pelo agente**: conferir (1) falha sem a correção, (2) asserção significativa (valores concretos, não só "não lançou erro"), (3) sem mock do domínio, (4) sem `skip`/`only`/`todo` residual, (5) sem asserção afrouxada em relação à versão anterior.
- Verificação no CI: falhar se o diff remover ou desabilitar teste, ou reduzir limites de cobertura, sem rótulo de aprovação humana no PR.
- Relatório do agente ao fim: testado, não testado e motivo.
