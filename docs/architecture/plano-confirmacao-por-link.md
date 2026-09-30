# Plano de Funcionalidade: Confirmação e Desmarcação por Link Seguro (Fase 2)

## 1. Visão Geral
Implementação do mecanismo de confirmação de presença e aviso de imprevisto por link único e seguro, permitindo que voluntários confirmem sua participação na escala com um toque no celular diretamente através de mensagens no WhatsApp ou e-mail, sem a necessidade de efetuar login com senha.

## 2. Regras de Negócio e Segurança Afetadas
- **Regra 10 (Autenticação e Sessão):** Links por token aleatório (32 bytes = 256 bits), armazenados exclusivamente como hash SHA-256 no banco de dados (`ActionToken.tokenHash`), com expiração automática, escopo estrito (`CONFIRM_ASSIGNMENT` atrelado ao `assignmentId`) e uso único.
- **Regra 16 (Notificações e Privacidade):** Nenhuma informação pessoal sensível exposta na URL ou na página pública. Apenas dados essenciais da escala (primeiro nome do membro, título do programa, ministério, data e horário).
- **Regra 19 (Auditoria):** Toda emissão, tentativa de consumo e confirmação/desmarcação é registrada de forma imutável em `AuditLog` com IP e identificadores seguros (sem registrar o token em texto puro).
- **Proteção contra Abuso:** Rate limiting por IP na rota pública para evitar força bruta e tentativas de enumeração de links.

## 3. Modelo de Dados
- **Nenhuma alteração de schema necessária no Prisma:**
  - O modelo existente `ActionToken` já possui suporte aos campos:
    - `id` (cuid)
    - `userId` (referência ao voluntário)
    - `purpose` (`TokenPurpose.CONFIRM_ASSIGNMENT`)
    - `refId` (id da escala / `Assignment`)
    - `tokenHash` (SHA-256 único)
    - `expiresAt` (data limite de validade)
    - `usedAt` (data do consumo)

## 4. Arquivos Implementados e Alterados
1. **Domínio (`packages/domain`):**
   - `packages/domain/src/auth/action-token.ts`: Geração criptográfica segura de tokens, hashing SHA-256, verificação temporal de expiração e formatação amigável de mensagens para WhatsApp.
   - `packages/domain/test/action-token.test.ts`: Testes unitários de geração, hashing, expiração e contratos.
   - `packages/domain/src/index.ts`: Exportações centralizadas.
2. **Contratos (`packages/contracts`):**
   - `packages/contracts/src/action-token.schema.ts`: Validações Zod para criação e consumo do token.
   - `packages/contracts/src/index.ts`: Exportação dos schemas e tipos TypeScript.
3. **Banco de Dados (`packages/db`):**
   - `packages/db/src/transactions.ts`:
     - `createConfirmationTokenWithAudit`: Emissão do token, invalidação de anteriores e auditoria.
     - `verifyConfirmationToken`: Validação segura do hash e extração dos dados sanitizados.
     - `consumeConfirmationTokenWithAudit`: Consumo atômico e atualização do status (`CONFIRMED` ou `DECLINED`).
4. **Aplicação Web (`apps/web`):**
   - `apps/web/src/middleware.ts`: Liberação de rota pública para `/confirmar` e `/api/confirmar`.
   - `apps/web/src/app/api/escalas/token-confirmacao/route.ts`: Endpoint para gestores gerarem o link e a mensagem pré-formatada.
   - `apps/web/src/app/api/confirmar/[token]/route.ts`: Endpoint público com rate limit para verificação e confirmação.
   - `apps/web/src/app/confirmar/[token]/page.tsx`: Renderização SSR rápida com dados institucionais da igreja.
   - `apps/web/src/app/confirmar/[token]/ConfirmarClient.tsx`: Interface moderna, acolhedora, responsiva e com áreas de toque mínimas de 48px para celular.
   - `apps/web/src/app/escalas/EscalasClient.tsx`: Botão de cópia rápida da mensagem/link de WhatsApp diretamente na grade de escalas do gestor.
