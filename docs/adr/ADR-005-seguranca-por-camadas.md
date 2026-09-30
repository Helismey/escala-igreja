# ADR-005: Segurança em camadas e privilégio mínimo

**Status:** Proposta | **Data:** 2026-09-30

## Contexto
O sistema guarda dados pessoais de membros (telefone, endereço, aniversário, foto, contato de emergência, possivelmente menores) e será operado com apoio de agente de IA. Vazamento tem custo alto para as pessoas e para a igreja.

## Decisão
Adotar segurança em camadas com regras obrigatórias (rules 10 a 20), autorização central `can()` com escopo por departamento, auditoria somente-inserção, criptografia em nível de aplicação para campos muito sensíveis, CI com varredura de segredos e auditoria de dependências, e endurecimento do agente de IA.

## Opções
| Opção | Custo | Risco |
|---|---|---|
| Camadas + regras para agente (escolhida) | Tempo de desenvolvimento | Baixo |
| Apenas o padrão do framework | Menor | Alto: IDOR, vazamento, segredos |
| Serviço de identidade gerenciado | Pode ter custo/limite | Menor em auth, não cobre o resto |

## Consequências
Mais fácil: revisar e auditar; provar conformidade com LGPD. Mais difícil: desenvolvimento inicial um pouco mais lento e mais testes. Revisar: MFA para mais perfis, RLS no banco e WAF conforme o uso crescer.
