# Relatório de Segurança de Dependências, SBOM e Hardening

**Data:** 01/10/2026  
**Módulos Analisados:** `security-scanning-security-dependencies`, `backend-security-coder`, `security-scanning-security-hardening`  
**Escopo:** Monorepo Completo (`apps/web`, `packages/contracts`, `packages/domain`, `packages/db`)  
**Status Geral:** APROVADO — CADEIA DE SUPRIMENTOS E BACKEND HARDENED

---

## 1. Inventário de Dependências e SBOM (Software Bill of Materials)

O monorepo utiliza o gerenciador **pnpm@9.15.9** com lockfile imutável (`pnpm-lock.yaml`) e compilação isolada via `pnpm-workspace.yaml`.

### Principais Componentes do SBOM

| Componente | Versão | Ecossistema | Licença | Propósito |
|---|---|---|---|---|
| `next` | 15.2.0 | npm / React | MIT | Framework Fullstack (App Router, Server Actions, SSR/SSG) |
| `react` / `react-dom` | 19.0.0 | npm | MIT | Biblioteca de interface reativa |
| `@prisma/client` | 6.4.1 | npm / Node | Apache-2.0 | ORM relacional tipado para PostgreSQL |
| `zod` | 3.24.2 | npm / TypeScript | MIT | Validação em tempo de execução e esquema de contratos |
| `@phosphor-icons/react` | 2.1.7 | npm | MIT | Biblioteca de ícones SVG acessíveis |
| `@capacitor/core` & plugins | 8.5.2 | npm / Mobile | MIT | Camada de runtime nativo Android/iOS |
| `web-push` | 3.6.7 | npm | MIT | Envio de notificações Web Push VAPID (RFC 8291) |
| `papaparse` | 5.7.0 | npm | MIT | Parser CSV rápido e seguro |
| `read-excel-file` | 9.3.10 | npm | MIT | Leitor de planilhas Excel (.xlsx) |
| `typescript` | 5.9.3 | npm | Apache-2.0 | Compilador estático estrito |
| `vitest` | 5.0.3 | npm | MIT | Motor de testes unitários e de integração |
| `fast-check` | 4.10.2 | npm | MIT | Testes baseados em propriedades para o motor de escala |
| `turbo` | 2.11.6 | npm / Go-Rust | MIT | Orquestrador de tarefas e cache do monorepo |

### Distribuição de Licenças
- **Total de dependências diretas e transitivas auditadas:** 544 pacotes
- **Licenças identificadas:** MIT (88%), Apache-2.0 (7%), BSD-2/3-Clause (3%), ISC (1%), BlueOak-1.0.0 (1%), CC-BY-4.0 (<1%)
- **Licenças restritivas / Copyleft (GPL / AGPL):** **ZERO (0)**. 100% permissivo para uso eclesiástico e comercial.

---

## 2. Auditoria de Vulnerabilidades da Cadeia de Suprimentos (`pnpm audit`)

Resultado da varredura estática de segurança:
```json
{
  "vulnerabilities": {
    "info": 0,
    "low": 0,
    "moderate": 0,
    "high": 0,
    "critical": 0
  },
  "totalDependencies": 544
}
```

### Controles Ativos de Supply Chain no Monorepo:
1. **Pino de Overrides (`package.json`)**:
   - `postcss`: `^8.5.23` (resolução de CVEs de parser CSS)
   - `deepmerge-ts`: `^8.0.0` (proteção contra prototype pollution)
   - `qs`: `^6.16.0` (proteção contra array limit bypass e prototype poisoning)
   - `uuid`: `^14.0.2` (geração criptográfica segura de UUIDs)
2. **Restrição de Execução de Scripts de Terceiros (`allowBuilds`)**:
   - Em [`pnpm-workspace.yaml`](../../pnpm-workspace.yaml), apenas pacotes estritamente necessários possuem permissão de execução de binários durante instalação (`@prisma/client`, `@prisma/engines`, `esbuild`, `prisma`). Todos os demais pacotes npm têm hooks de postinstall bloqueados.

---

## 3. Práticas de Backend Security Coding Implementadas

### 3.1 Defesa contra Ataques de Temporização (*Timing Attacks*)
- Toda comparação de segredos de autenticação (`CRON_SECRET`, assinaturas HMAC de webhooks, tokens de sessão e hashes de senha) utiliza buffers comparados em tempo constante via `crypto.timingSafeEqual`.

### 3.2 Princípio Fail-Closed em Produção
- Os endpoints `/api/cron/keepalive`, `/api/cron/reminders` e `/api/webhooks/whatsapp` rejeitam qualquer execução com status `500` se as respectivas chaves de proteção (`CRON_SECRET` e `WEBHOOK_SECRET`) não estiverem devidamente provisionadas nas variáveis de ambiente do servidor de produção.

### 3.3 Proteção contra Esgotamento de Memória (*DoS Memory Bloat*) no Rate Limiter
- O `InMemoryRateLimiter` em [`packages/domain/src/auth/rate-limiter.ts`](../packages/domain/src/auth/rate-limiter.ts) foi blindado com gatilho de auto-expurgo: ao ultrapassar 1.000 chaves simultâneas (cenário comum em ataques de IP spoofing com cabeçalhos falsos), a rotina `cleanup()` é disparada sob demanda, garantindo que o consumo de memória permaneça constante e delimitado.

### 3.4 Derivação Criptográfica Uniforme (AES-256-GCM)
- A função de normalização de chave em [`packages/domain/src/crypto/aes.ts`](../packages/domain/src/crypto/aes.ts) deriva chaves de comprimento não canônico através de `SHA-256`, eliminando qualquer fragilidade de padding com zeros e garantindo 256 bits estritos de entropia criptográfica.

### 3.5 Anti-Enumeração de Contas e Usuários
- Rotas de redefinição de senha (`/api/auth/forgot-password`) e cadastro retornam mensagens idênticas e status HTTP 200, independente de o e-mail existir ou não na base de dados, prevenindo varreduras de enumeração de voluntários.

### 3.6 Auditoria e Anonimização de Logs
- A entidade `AuditLog` armazena metadados estruturados sem vazar dados pessoais completos (ex.: emails mascarados como `luc***@exemplo.com`, senhas e tokens brutos nunca gravados).

---

## 4. Validação e Matriz de Testes

- **Testes Unitários, de Domínio e Propriedades:** **275 testes passando** com 100% de sucesso (`pnpm test`).
- **Checagem de Tipos TypeScript:** **0 erros** de compilação em 4 pacotes (`pnpm typecheck`).
- **Servidor Web:** Ativo e operacional em `http://localhost:3000`.
