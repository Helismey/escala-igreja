---
name: seguranca-web-owasp
description: Use ao construir telas, formulários, uploads, cabeçalhos HTTP e ao revisar código contra OWASP Top 10.
---

# Segurança web (OWASP)

Aplicar a rule 12. Mapa rápido:

| Risco | Como tratar neste projeto |
|---|---|
| A01 Acesso quebrado | Guard `can()` em tudo, consultas por escopo (skill seguranca-autorizacao-rbac) |
| A02 Criptografia | TLS, campos sensíveis com AES-256-GCM, Argon2id |
| A03 Injeção | Prisma parametrizado, Zod, sem SQL por concatenação, sem `dangerouslySetInnerHTML` |
| A04 Design inseguro | Threat model em `docs/security/threat-model.md` |
| A05 Configuração | Cabeçalhos de segurança, debug off, CORS restrito |
| A06 Componentes vulneráveis | `pnpm audit`, Dependabot, lockfile |
| A07 Falhas de autenticação | Rate limit, MFA admin, sessão segura |
| A08 Integridade | CI protegido, ações fixadas, sem scripts de terceiros sem revisão |
| A09 Logs | `AuditLog` e logs sem PII |
| A10 SSRF | Lista de permissão de destinos, bloquear IPs internos |

**Cabeçalhos** (em `next.config` ou middleware): CSP com nonce, HSTS, `nosniff`, `Referrer-Policy`, `Permissions-Policy`, `frame-ancestors 'none'`.
**Upload**: validar magic bytes, limitar tamanho, reprocessar imagem e remover EXIF, nome gerado pelo servidor, URL assinada, SVG proibido.
**Checklist de revisão**: entrada validada no servidor? saída escapada? autorização verificada? erro genérico? limite de taxa? segredo fora do código?
