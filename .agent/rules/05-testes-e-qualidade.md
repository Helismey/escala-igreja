# Testes e qualidade (sempre ativa)

Estratégia completa em `docs/testing/estrategia-de-testes.md`.

**Pirâmide**: muitos unitários e de propriedade (Vitest + fast-check), integração com PostgreSQL real, poucos E2E (Playwright, celular e desktop), mais testes de segurança, acessibilidade e desempenho.

**Obrigatório**
- O motor de escala e a autorização (`packages/domain`) têm testes unitários E de propriedade. As invariantes da regra 00 viram propriedades: nunca sobrepor horários, nunca passar de 2 escalas por dia, nunca escalar quem está indisponível.
- A matriz de autorização é gerada da tabela de permissões (perfil × ação × escopo). Rota ou ação nova sem linha na matriz faz o CI falhar.
- Datas e cron testados com relógio congelado (America/Sao_Paulo, virada de dia).
- Notificações em teste usam sempre o adaptador falso (`NOTIFICATIONS_DRIVER=fake`). Nunca enviar mensagem real em teste.
- Concorrência testada com chamadas paralelas contra o banco (ADR-004).
- Dados de teste: seed e fábricas fictícios com semente fixa. Nunca dados reais.
- Toda correção de bug começa com um teste que falha.
- Antes de concluir uma tarefa: `pnpm lint && pnpm typecheck && pnpm test`.

**Salvaguardas para o agente de IA**
- É proibido alterar, desabilitar (`skip`, `only`, `todo`), afrouxar uma asserção ou apagar teste existente só para fazê-lo passar. Se o teste estiver errado, explicar o motivo, mostrar o diff e aguardar aprovação.
- Todo teste novo precisa falhar quando o comportamento é quebrado: ao escrever, provar mentalmente ou rodando que ele falha sem a correção. Teste sem asserção significativa ou que só repete a implementação não vale.
- Não reduzir meta de cobertura nem excluir arquivos da cobertura sem aprovação.
- Mocks só nas bordas (relógio, canais de envio, rede). Nunca mockar o domínio nem o banco nos testes de integração.
- Relatar no fim da tarefa: o que foi testado, o que ficou sem teste e por quê.
- Teste de mutação (Stryker) no domínio roda toda noite e antes de cada release; mutantes sobreviventes viram testes novos.

**Metas**
- Motor de escala e autorização: ~95% de ramos e mutação acima de 80%.
- Demais pacotes: sem meta rígida; cobrir caminhos críticos, erros, bordas, limites de segurança e integridade de dados.
- Pular: getters triviais, código do framework, scripts descartáveis.

**Segurança nos testes**: matriz de autorização por perfil e escopo, limite de tentativas de login, expiração e reuso de tokens, upload inválido, webhook com assinatura inválida e replay, cabeçalhos, concorrência (skills `seguranca-autorizacao-rbac` e `testes-de-concorrencia`).

Decisão técnica relevante gera ADR em `docs/adr/`.
