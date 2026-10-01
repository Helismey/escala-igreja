---
description: Planejar e escrever testes para uma funcionalidade ou correção
---
1. Ler `docs/testing/estrategia-de-testes.md` e identificar a camada correta (unitário, propriedade, integração, E2E, segurança, acessibilidade, desempenho).
2. Listar casos: caminho feliz, bordas, erros, permissões por perfil e concorrência quando houver gravação.
3. Escrever o teste que falha primeiro; depois implementar.
4. Aplicar as skills `testes-*` pertinentes (propriedades, matriz de autorização, integração com banco, E2E, relógio e notificações).
5. Rodar `pnpm test` e, se o domínio mudou, a mutação (`pnpm test:mutation`).
6. Conferir as salvaguardas da regra 05 e relatar: testado, não testado e motivo.
