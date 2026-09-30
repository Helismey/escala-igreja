# Checklist de segurança pré-release

**Data:** ____ | **Versão:** ____ | **Responsável:** ____

## Autenticação e sessão
- [ ] Senhas com Argon2id/bcrypt; política mínima de 12 caracteres
- [ ] Rate limit e bloqueio no login, cadastro e recuperação
- [ ] MFA ativo para ADMIN_MASTER
- [ ] Cookies HttpOnly, Secure, SameSite; sessão expira; rotação no login
- [ ] Tokens de recuperação e de confirmação: hash, expiração, uso único

## Autorização
- [ ] Matriz de testes por perfil e escopo passando
- [ ] Nenhum acesso por id sem checar escopo (IDOR)
- [ ] PENDENTE/INACTIVE sem acesso
- [ ] Sempre existe ao menos um ADMIN_MASTER

## Web
- [ ] Toda entrada validada com Zod no servidor
- [ ] Sem SQL por concatenação; sem `dangerouslySetInnerHTML`
- [ ] Cabeçalhos: CSP, HSTS, nosniff, Referrer-Policy, frame-ancestors
- [ ] CORS restrito; CSRF tratado
- [ ] Upload: tipo real, tamanho, EXIF removido, SVG bloqueado

## Dados e LGPD
- [ ] TLS no banco; usuário da aplicação com privilégio mínimo
- [ ] Campos sensíveis criptografados; chaves fora do código
- [ ] Termos e consentimento registrados; exportar/excluir dados funcionando
- [ ] Backup automático com restauração testada
- [ ] Sem dados reais em dev/preview

## Segredos e CI
- [ ] Nenhum segredo no repositório (varredura limpa); `.env.example` atualizado
- [ ] `pnpm audit` sem alta/crítica; Dependabot ativo
- [ ] Branch principal protegida; CI obrigatório
- [ ] Previews sem dados reais

## Notificações
- [ ] Opt-out por canal funcionando; destinatário sempre do banco
- [ ] Webhooks com assinatura e proteção contra replay
- [ ] Logs sem conteúdo integral e com telefone mascarado

## Logs e incidentes
- [ ] `AuditLog` cobrindo ações críticas; logs sem PII
- [ ] Alertas mínimos configurados
- [ ] Plano de incidente conhecido e contatos atualizados

## Agente de IA
- [ ] Permissões do agente conforme `agent-hardening.md`
- [ ] Nenhum `.env` ou dado real exposto ao agente

## Mobile (quando aplicável)
- [ ] Tokens em Keychain/Keystore; sem segredo no bundle; deep links validados
