# Plano de Implementação — Recuperação de Senha Segura

**Sistema:** Escala Igreja  
**Fase:** Fase 1 — Base  
**Status:** Aprovado para Execução  
**Data:** 2026-09-30  
**Objetivo:** Implementar o fluxo completo de recuperação e redefinição de senha ("Esqueci minha senha") atendendo estritamente à regra `10-seg-autenticacao.md`, à skill `seguranca-autenticacao-sessao` e ao checklist de segurança pré-release (`docs/security/checklist-pre-release.md`).

---

## 1. Diretrizes de Segurança

1. **Prevenção contra Enumeração de Usuários (Anti-User Enumeration):**
   - Ao solicitar a redefinição, a resposta para e-mails cadastrados e não cadastrados (ou inativos/pendentes) é estritamente idêntica:
     `"Se o e-mail informado estiver cadastrado, você receberá um link para redefinir sua senha em instantes."`
2. **Geração e Hashing do Token de Ação:**
   - O token gerado é uma sequência criptográfica segura de 32 bytes em hexadecimal (64 caracteres) gerada via `crypto.randomBytes(32).toString('hex')`.
   - O banco de dados **nunca armazena o token em texto puro**, apenas o hash SHA-256 (`tokenHash`).
   - Expiração estrita de **30 minutos**.
   - Propósito restrito ao enum `TokenPurpose.PASSWORD_RESET`.
   - Ao gerar um novo token de redefinição para um usuário, tokens anteriores pendentes do mesmo propósito são descartados.
3. **Uso Único e Consumo Atômico:**
   - O consumo do token ocorre em transação com `usedAt = now()`.
   - Tokens já utilizados (`usedAt !== null`) ou expirados (`expiresAt < now()`) são rejeitados de imediato.
4. **Política de Senha e Invalidação de Sessão:**
   - A nova senha deve cumprir a política mínima de 12 caracteres validada com Zod.
   - Hash atualizado com Argon2id / bcrypt custo 12.
   - Tentativas falhas de login são resetadas (`failedLogins = 0`, `lockedUntil = null`).
   - Todas as sessões e tokens de atualização (`RefreshToken`) do usuário são revogados na conclusão.
5. **Rate Limiting e Trilha de Auditoria:**
   - Rate limit específico por IP e e-mail (máximo 3 solicitações por 15 minutos).
   - Registros de auditoria imutáveis em `AuditLog` para `PASSWORD_RESET_REQUESTED` e `PASSWORD_RESET_COMPLETED`.

---

## 2. Componentes e Arquivos

1. **`docs/adr/ADR-007-recuperacao-de-senha.md`**: Registro de decisão de arquitetura sobre redefinição segura de senha com tokens de uso único e prevenção de enumeração.
2. **`packages/contracts/src/auth.schema.ts`**:
   - `forgotPasswordSchema`: validação de entrada de e-mail.
   - `resetPasswordSchema`: validação de token e nova senha (mínimo 12 caracteres) com confirmação.
3. **`packages/domain/src/auth/password-reset.ts`**:
   - Funções puras: geração de token seguro, hash SHA-256 do token, validação temporal e de integridade do token.
4. **`packages/domain/test/password-reset.test.ts`**:
   - Testes unitários do domínio: geração de token, cálculo de hash, validação de tokens válidos, expirados, já utilizados e com propósito incorreto.
5. **`packages/db/src/transactions.ts`**:
   - `requestPasswordResetToken(email, ip, userAgent)`: busca usuário ativo, gera token, salva hash no `ActionToken` e audita.
   - `resetPasswordWithToken(rawToken, newPassword, ip)`: valida token e expiração, consome token, atualiza hash da senha, revoga refresh tokens e audita.
6. **`apps/web/src/app/api/auth/forgot-password/route.ts`**:
   - Endpoint POST para solicitar redefinição com rate limiting e resposta neutra.
7. **`apps/web/src/app/api/auth/reset-password/route.ts`**:
   - Endpoint POST para redefinir a senha com o token recebido.
8. **`apps/web/src/app/esqueci-senha/page.tsx` & `EsqueciSenhaClient.tsx`**:
   - Tela de solicitação com mensagem empática e clara em pt-BR.
9. **`apps/web/src/app/redefinir-senha/page.tsx` & `RedefinirSenhaClient.tsx`**:
   - Tela para digitação da nova senha a partir de `?token=...`.
10. **`apps/web/src/app/login/page.tsx`**:
    - Link "Esqueceu sua senha?" posicionado de forma acessível.
