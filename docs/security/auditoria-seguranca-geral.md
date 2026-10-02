# Relatório de Auditoria de Segurança — Escala Igreja

**Data:** 01/10/2026  
**Auditor Responsável:** Antigravity / Security Auditor  
**Escopo:** Monorepo Completo (`apps/web`, `packages/contracts`, `packages/domain`, `packages/db`)  
**Status Geral:** APROVADO COM HARDENING APLICADO (Nenhum risco crítico ou alto pendente)

---

## 1. Sumário Executivo

Uma auditoria abrangente de segurança foi realizada na aplicação **Escala Igreja**, combinando análise estática, revisão manual de código de pontos críticos, verificação do modelo de ameaças (STRIDE), conformidade com OWASP Top 10 (2021) e LGPD.

### Principais Destaques:
- **Vulnerabilidades de Dependências (`pnpm audit`)**: **0 vulnerabilidades** encontradas em todo o grafo de dependências.
- **Autenticação & Sessão**: Cookies `HttpOnly`, `SameSite=lax`, assinados com `HMAC-SHA256` e validados via `timingSafeEqual`. Senhas com `scrypt` parametrizado conforme OWASP ($N=16384, r=8, p=1$) e política rigorosa de 12+ caracteres.
- **Autorização (RBAC) & Escopo Multi-Igreja**: Matriz completa de autorização passando 73 testes automatizados (`authz-matrix.test.ts`), bloqueando acessos não autorizados por congregação ou hierarquia ministerial.
- **Criptografia em Repouso**: AES-256-GCM com IV de 96 bits aleatório por campo para dados sensíveis (TOTP secret, endereços e contatos de emergência).
- **Hardening Implementado nesta Auditoria**: Fail-closed em produção para endpoints de cron (`CRON_SECRET`) e webhooks (`WEBHOOK_SECRET`), além de comparação em tempo constante (`timingSafeEqual`) em todos os tokens e chave derivada com SHA-256 no AES.

---

## 2. Avaliação OWASP Top 10 (2021)

| Categoria OWASP | Status | Controles e Evidências |
|---|---|---|
| **A01: Broken Access Control** | **Protegido** | Função `can()` pura no domínio; 73 testes em `authz-matrix.test.ts` e 36 testes em `hierarchy-and-roles.test.ts`. Validação de IDOR e escopo em todas as rotas e Server Actions. Pastores e Anciãos limitados estritamente à sua hierarquia. |
| **A02: Cryptographic Failures** | **Protegido** | Senhas com `scrypt` + salt de 16 bytes. Segredos TOTP cifrados com AES-256-GCM. Tokens de ação armazenados apenas como hash SHA-256. Web Push VAPID conforme RFC 8291. Normalização de chave AES aprimorada via SHA-256. |
| **A03: Injection** | **Protegido** | Consultas no banco 100% parametrizadas via Prisma ORM (zero SQL concatenado). Zero `dangerouslySetInnerHTML`. Sanitização rigorosa via esquemas Zod em toda requisição de API e upload de planilha. |
| **A04: Insecure Design** | **Protegido** | Rate limiting na memória (`InMemoryRateLimiter`) contra força bruta no login (5 tent./15min), cadastro e recuperação de senha. Trava de auto-rebaixamento e exclusão do último `ADMIN_MASTER`. Proteção contra corrida e over-scheduling. |
| **A05: Security Misconfiguration** | **Protegido** | Headers de segurança ativos no `next.config.ts` (`CSP`, `HSTS` de 2 anos, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`). Cookies restritos com `HttpOnly`, `SameSite` e `Secure`. |
| **A06: Vulnerable/Outdated Components** | **Protegido** | `pnpm audit` limpo (0 vulnerabilidades). `overrides` configurados no `package.json` para bibliotecas transitivas. Dependências bloqueadas no `pnpm-lock.yaml`. |
| **A07: Identification and Authentication Failures** | **Protegido** | MFA compulsório para administradores gerais; rotação de sessão no login; expiração absoluta no servidor (7 dias); bloqueio temporário após 5 falhas sucessivas de autenticação. |
| **A08: Software and Data Integrity Failures** | **Protegido** | `pnpm-workspace.yaml` com `allowBuilds` restrito; webhooks com assinatura HMAC-SHA256 e proteção contra ataques de repetição (tolerância de 5 minutos). |
| **A09: Security Logging and Monitoring Failures** | **Protegido** | Tabela `AuditLog` imutável para ações críticas (criação de membros, alterações de cargo, logins, MFA); metadados limpos sem PII ou senhas em texto puro. |
| **A10: Server-Side Request Forgery (SSRF)** | **Protegido** | URLs externas validadas e limitadas a domínios/protocolos HTTPS pré-configurados; envio de mensagens apenas para contatos registrados no banco de dados. |

---

## 3. Conformidade com a LGPD (Dados de Membros e Menores)

1. **Proteção a Voluntários Menores de Idade**:
   - Campos `isMinor`, `guardianName`, `guardianPhone` e `guardianConsentAt` persistidos e auditados.
   - Apenas gestores com perfil autorizado visualizam dados de contato do responsável legal.
2. **Opt-Out e Preferências de Notificação**:
   - Respeito individual aos canais de envio (`optOutWhatsapp`, `optOutEmail`, `optOutPush`, `optOutSms`).
3. **Direitos do Titular (Exportação e Esquecimento)**:
   - Endpoint `/api/perfil/exportar` e `/api/membros/exportar` implementando o direito à portabilidade de dados.
   - Endpoint `/api/perfil/excluir` para exclusão e anonimização de dados pessoais sob demanda.
4. **Minimização de Dados**:
   - Notificações enviadas contendo apenas as informações indispensáveis para a realização do culto/compromisso (Regra 16).

---

## 4. Hardening e Melhorias Aplicadas nesta Sessão

1. **Endpoints de Cron (`/api/cron/keepalive` e `/api/cron/reminders`)**:
   - Implementado princípio *fail-closed*: em ambiente de produção (`NODE_ENV === 'production'`), se a variável `CRON_SECRET` não estiver configurada no servidor, a requisição é terminada imediatamente com status `500`, impedindo execução não autorizada.
   - Substituição da comparação direta de strings por buffers comparados em tempo constante com `crypto.timingSafeEqual`, eliminando potenciais vazamentos de temporização (*timing attacks*).
2. **Webhook do WhatsApp (`/api/webhooks/whatsapp`)**:
   - Implementado *fail-closed* em produção se `WEBHOOK_SECRET` estiver ausente.
   - Verificação estrita de assinatura HMAC-SHA256 e controle de replay com janela de 5 minutos.
3. **Normalização de Chaves Criptográficas (`packages/domain/src/crypto/aes.ts`)**:
   - Para qualquer entrada de chave com tamanho não padrão, a derivação agora utiliza `createHash('sha256')`, assegurando 256 bits uniformes de entropia criptográfica.

---

## 5. Matriz de Testes de Segurança

- **Testes Unitários e Propriedades**: 274 testes passando em 22 suítes.
- **Matriz de Autorização**: 73 testes em `packages/domain/test/authz-matrix.test.ts`.
- **Criptografia e Autenticação**: 12 testes em `packages/domain/test/crypto-and-auth.test.ts`.
- **Concorrência**: 3 testes em `packages/domain/test/concurrency.test.ts`.
- **Tempo de Execução**: 964 ms.
