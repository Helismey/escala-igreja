# ADR-008: Tokens de uso único (ActionToken) para confirmação de presença sem login

**Status:** Aceita | **Data:** 2026-09-30

## Contexto
Voluntários de igreja recebem lembretes de escalas por WhatsApp, e-mail ou push e precisam confirmar presença ou avisar sobre imprevistos com rapidez no celular. Exigir login com e-mail e senha nesses momentos gera atrito considerável, esquecimento de senhas e baixa taxa de confirmação prévia, prejudicando o planejamento dos cultos e programas.
Ao mesmo tempo, permitir confirmações públicas sem autenticação poderia gerar adulterações ou confirmações indevidas caso links fossem previsíveis ou estáticos.

Conforme a **Regra 10** e **Regra 16** do projeto:
- Links por token devem ser criptograficamente seguros (32 bytes aleatórios), armazenados exclusivamente como hash no banco de dados, com validade temporal restrita, escopo único (uma ação específica de uma escala específica) e de uso único.
- A URL nunca deve conter IDs sequenciais nem dados pessoais (PII).
- A tela de confirmação deve expor apenas o mínimo estritamente necessário (nome social/primeiro nome, ministério, data e horário).

## Decisão
Utilizar o modelo existente `ActionToken` com propósito `CONFIRM_ASSIGNMENT` para gerenciar links de confirmação e recusa de presença sem necessidade de sessão ativa.
1. O token bruto gerado no servidor é uma sequência criptográfica de 32 bytes (256 bits) em codificação hexadecimal ou base64url.
2. No banco de dados, persiste-se unicamente o hash SHA-256 do token (`tokenHash`), com vínculo direto a `userId`, `purpose = CONFIRM_ASSIGNMENT`, `refId = assignmentId` e uma data de expiração (`expiresAt`, por padrão 7 dias ou até o início da escala).
3. A rota pública `/confirmar/[token]` verifica o hash e exibe uma interface móvel acolhedora e acessível com duas opções claras: "Confirmar Presença" e "Não poderei ir (Desmarcar)".
4. A operação é consumida atomicamente em transação de banco de dados (`prisma.$transaction`), marcando `usedAt = now()` e atualizando o status da escala (`CONFIRMED` ou `DECLINED`).
5. Toda tentativa de consumo ou verificação é auditada em `AuditLog` com IP e resultado, sem persistir o token em texto puro nos logs.

## Opções consideradas
| Opção | Complexidade | Segurança | Experiência no Celular | Prós | Contras |
|---|---|---|---|---|---|
| **ActionToken com SHA-256 e uso único (Escolhida)** | Baixa/Média | Alta (OWASP/LGPD) | Excelente (1 toque) | Sem senha para o membro, seguro contra vazamento de banco, expiração automática | Requer emissão de token por escala |
| **Exigir login tradicional para confirmar** | Baixa | Média | Ruim | Menos rotas públicas | Grande taxa de abandono, voluntários esquecem a senha no WhatsApp |
| **JWT assinado com chave secreta na URL** | Baixa | Média | Excelente | Stateless, sem consulta a banco na validação | Não permite revogação instantânea e não garante uso único sem blacklist em memória/banco |
| **Parâmetros estáticos na URL (ex: ?assignmentId=123&action=confirm)** | Mínima | Inaceitável (Zero) | Boa | Extremamente simples | IDOR crítico, adulteração trivial, violação da Regra 10 e 16 |

## Análise de trade-offs
A abordagem de `ActionToken` com hash SHA-256 combina a melhor experiência móvel para o voluntário (confirmar com apenas um toque no celular) com o mais alto padrão de segurança do projeto: mesmo se o banco de dados for comprometido, os tokens ativos em links enviados não podem ser derivados dos hashes, e links reutilizados são rejeitados de imediato.

## Consequências
- **Mais fácil:** Voluntários confirmam ou avisam ausência em segundos diretamente do WhatsApp/E-mail, aumentando o engajamento e a previsibilidade das escalas.
- **Mais difícil:** Requer que o gerador de lembretes/mensagens crie ou recupere o token para cada voluntário e escala.
- **O que revisar:** Na Fase 3 (Substituição Automática), quando um voluntário desmarcar pelo link, o fluxo de substituição automática será acionado imediatamente.

## Ações
1. Implementar funções puras de geração e hash de tokens em `@revezo/domain`.
2. Adicionar contrato Zod no pacote `@revezo/contracts`.
3. Criar transações com auditoria em `@revezo/db` para emissão, verificação e consumo do token.
4. Ajustar middleware de autenticação para permitir a rota pública `/confirmar/*`.
5. Implementar página responsiva e acessível `/confirmar/[token]` em `apps/web`.
6. Adicionar atalho na interface de escalas para gestores copiarem o link de confirmação do voluntário.
