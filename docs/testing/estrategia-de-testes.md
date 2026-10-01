# Estratégia de testes

Objetivo: dar confiança de que as escalas respeitam as regras, que cada pessoa só vê e faz o que pode e que o sistema continua correto quando usado por várias pessoas ao mesmo tempo, sem custo extra de ferramentas.

Autenticação: **própria** (Argon2id, sessões e tokens conforme regras 10 e 11). Os testes de login rodam contra o banco de teste; sem provedor externo.

## 1. Pirâmide
| Camada | Ferramenta | Escopo | Meta | Onde roda |
|---|---|---|---|---|
| Unitários | Vitest | `packages/domain` (conflito, limite, preferência, substituição, `can()`, datas, menu por perfil), schemas Zod | Escala e autorização: ~95% de ramos | PR |
| Propriedades | fast-check | Invariantes do motor com entradas aleatórias | Todas as invariantes da regra 00 | PR |
| Integração | Vitest + PostgreSQL real | Transações, concorrência, consultas por escopo, migrations, cron, Server Actions | Todo fluxo que grava no banco | PR |
| Contrato | Zod compartilhado | Entrada e saída da API em `packages/contracts` | Toda rota versionada | PR |
| E2E | Playwright (celular e desktop) | 6 a 8 jornadas críticas | Poucas e estáveis | PR (fumaça), noturno (completo) |
| Segurança | Vitest/Playwright + CI | Matriz de autorização, IDOR, login, tokens, upload, webhook, cabeçalhos, audit, segredos, SAST | Matriz gerada da tabela | PR e noturno |
| Acessibilidade | axe no Playwright + manual | Contraste, rótulos, foco, alvos de toque | Zero violação séria nas telas principais | PR e pré-release |
| Desempenho | k6/autocannon + contagem de consultas | Motor, telas, N+1 | Regressão vira falha | Noturno |

## 2. Estratégias específicas
1. **Testes de propriedade no motor** (skill `testes-propriedades-motor`): cobrem o que ninguém lembrou de escrever.
2. **Matriz de autorização gerada** (skill `testes-matriz-autorizacao`): perfil × ação × escopo; rota sem linha na matriz quebra o CI.
3. **Relógio congelado** (skill `testes-relogio-e-notificacoes`): virada de dia, meia-noite, cron D-7, D-2, D-1 sem duplicar.
4. **Notificações com canal falso**: nunca envio real em teste; envio real só manual, com número de teste.
5. **Concorrência real** (skill `testes-de-concorrencia` e ADR-004): várias atribuições em paralelo contra o banco.
6. **Dados e ambientes**: seed e fábricas fictícios com semente fixa; nunca dados reais; banco limpo por execução.
7. **Piloto com pessoas reais**: antes do lançamento geral, um departamento pequeno (~10 voluntários) em homologação, com canais falsos; teste de usabilidade com 3 a 5 pessoas, incluindo as menos familiarizadas com tecnologia.

## 3. Salvaguardas para o agente de IA
Regras na `05-testes-e-qualidade.md` e skill `testes-mutacao-e-guardrails`: proibido enfraquecer, desabilitar ou apagar teste para passar; todo teste novo deve falhar sem a correção; mocks só nas bordas; teste de mutação (Stryker) no domínio à noite e antes de release; relatório final com "testado / não testado / por quê".

## Ambientes e dados
| Ambiente | Uso | Dados |
|---|---|---|
| Local | Desenvolvimento e testes | `docker compose` com PostgreSQL; seed fictício |
| CI | Todos os testes automatizados | Banco efêmero por execução |
| Homologação (preview) | Fumaça, piloto, testes noturnos, ZAP | Seed fictício; canais falsos ou número de teste |
| Produção | Fumaça pós-deploy somente leitura e monitoramento | Dados reais; testes nunca escrevem nem enviam mensagens |

## Etapas no CI
| Gatilho | O que roda |
|---|---|
| Pull request | lint, tipos, unitários, propriedades, integração, segurança (matriz, audit, segredos, CodeQL), E2E de fumaça, axe nas telas principais |
| Noturno | E2E completo (celular e desktop), desempenho, mutação do domínio, varredura dinâmica leve (OWASP ZAP em modo básico) contra homologação |
| Pré-release | Checklists `docs/security/checklist-pre-release.md` e `docs/deploy-checklist.md`, revisão manual de acessibilidade, teste de restauração de backup (trimestral) |
| Pós-deploy | Fumaça somente leitura, conferência do cron de lembretes e dos logs |

Qualidade: teste instável vai para quarentena em até 48 h com issue; cobertura e mutação do domínio abaixo da meta bloqueiam merge; diff que remove ou desabilita testes exige aprovação humana.

## Scripts padrão (raiz do monorepo)
`pnpm lint`, `pnpm typecheck`, `pnpm test` (unit + propriedades), `pnpm test:unit`, `pnpm test:int`, `pnpm test:e2e`, `pnpm test:e2e:smoke`, `pnpm test:mutation`, `pnpm test:perf`.

## Definição de pronto
Teste escrito antes ou junto; lint, tipos e testes passando; matriz de autorização atualizada; textos em pt-BR revisados; sem dado real; relatório do que ficou sem teste.

## Lacunas conhecidas no início
Nenhum teste escrito ainda (não há código); metas de desempenho são hipóteses e devem ser calibradas na Fase 1; WhatsApp real depende de número dedicado e só é testável manualmente.
