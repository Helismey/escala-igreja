# Plano de testes por fase

## Fase 0 (bootstrap)
- Uma amostra de teste em cada camada (unitário, propriedade, integração, E2E de fumaça) passando no CI.
- Teste dos cabeçalhos de segurança e da rota de saúde.
- Varredura de segredos e `pnpm audit` limpos.
Saída: pipeline completo funcionando antes de qualquer funcionalidade.

## Fase 1 (base)
- Domínio: conflito, limite de 2 por dia, preferência, `can()` completo; propriedades de 1 a 8.
- Matriz de autorização completa e IDOR; rate limit de login; hash e expiração de sessão.
- Integração: atribuição concorrente, migrations, consultas por escopo.
- E2E: jornadas 1 a 4, 6 e 9; axe nas telas principais.
Saída: checklist `docs/security/checklist-pre-release.md` passando.

## Fase 2 (comunicação)
- Relógio congelado e cron D-7, D-2, D-1 sem duplicar; opt-out; fallback entre canais; webhook assinado e replay.
- E2E: jornadas 7 e 8. Piloto com um departamento em homologação.

## Fase 3 (inteligência)
- Propriedades de substituição (5 a 8); concorrência de desmarcações; alertas de vaga aberta.
- E2E: jornada 5. Mutação do domínio acima de 80%.

## Fase 3.5 (mobile)
- Offline da própria escala, push, armazenamento de tokens, deep links; teste em aparelhos reais.

## Fase 4 (automação)
- Desempenho do motor (60 membros), carga leve, relatórios e exportações com registro de auditoria.
