# Checklist de segurança pré-release

**Data:** 30/09/2026 | **Versão:** 1.0.0-rc1 | **Responsável:** Equipe Escala Igreja

## Autenticação e sessão
- [x] Senhas com Argon2id/bcrypt/scrypt (ADR-009); política mínima de 12 caracteres
- [x] Rate limit e bloqueio no login, cadastro e recuperação
- [x] MFA ativo e compulsório para ADMIN_MASTER (bloqueio de desativação e alerta obrigatório)
- [x] Cookies HttpOnly, Secure, SameSite; sessão expira; rotação no login
- [x] Tokens de recuperação e de confirmação: hash, expiração, uso único

## Autorização
- [x] Matriz de testes por perfil e escopo passando (`authz.test.ts`)
- [x] Nenhum acesso por id sem checar escopo (IDOR)
- [x] PENDENTE/INACTIVE sem acesso
- [x] Sempre existe ao menos um ADMIN_MASTER (trava de auto-rebaixamento e exclusão do último admin)

## Web
- [x] Toda entrada validada com Zod no servidor
- [x] Sem SQL por concatenação; sem `dangerouslySetInnerHTML`
- [x] Cabeçalhos: CSP, HSTS, nosniff, Referrer-Policy, frame-ancestors
- [x] CORS restrito; CSRF tratado
- [x] Upload/URL de foto validada estritamente com formato HTTPS e limites de comprimento

## Dados e LGPD
- [x] TLS no banco; usuário da aplicação com privilégio mínimo
- [x] Campos sensíveis criptografados (AES-256-GCM); chaves fora do código
- [x] Termos e consentimento registrados; exportar/excluir dados funcionando
- [x] Backup automático com restauração testada
- [x] Sem dados reais em dev/preview

## Segredos e CI
- [x] Nenhum segredo no repositório (varredura limpa); `.env.example` atualizado
- [x] `pnpm audit` sem alta/crítica; Dependabot ativo
- [x] Branch principal protegida; CI obrigatório
- [x] Previews sem dados reais

## Notificações
- [x] Opt-out por canal funcionando; destinatário sempre do banco
- [x] Webhooks com assinatura e proteção contra replay (estrutura em ActionTokens/logs)
- [x] Logs sem conteúdo integral e com telefone mascarado

## Logs e incidentes
- [x] `AuditLog` cobrindo ações críticas; logs sem PII
- [x] Alertas mínimos configurados
- [x] Plano de incidente conhecido e contatos atualizados

## Agente de IA
- [x] Permissões do agente conforme `agent-hardening.md`
- [x] Nenhum `.env` ou dado real exposto ao agente

## Mobile (quando aplicável)
- [x] Tokens em Keychain/Keystore; sem segredo no bundle; deep links validados (Fase 3.5 — ADR-015)

