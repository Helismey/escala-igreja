# Modelo de ameaças (STRIDE) — versão inicial

Ativos: dados pessoais dos membros, contas e sessões, escala e programas, chaves e segredos, número de WhatsApp da igreja.
Fronteiras de confiança: navegador/app ↔ servidor; servidor ↔ banco; servidor ↔ provedores (e-mail, push, WhatsApp); desenvolvedor/agente ↔ repositório e segredos.

| Componente | Ameaça (STRIDE) | Exemplo | Mitigação | Regra |
|---|---|---|---|---|
| Login/cadastro | S, D | Força bruta, enumeração de e-mails | Rate limit, mensagens genéricas, MFA admin | 10 |
| Sessão/tokens | S, E | Roubo de cookie/token, reuso de refresh | Cookies seguros, rotação e revogação | 10 |
| API/Server Actions | E, T | IDOR, alteração de escala de outro departamento | `can()` + consultas por escopo, Zod | 11, 12 |
| Cadastro de membros | I | Vazamento de endereço/telefone | DTO por perfil, criptografia de campos, auditoria | 11, 13 |
| Upload de foto/logo | T, D | Arquivo malicioso, SVG com script, EXIF com GPS | Validação de conteúdo, reprocessamento, SVG proibido | 12 |
| Importação CSV | T | Injeção de fórmula, texto com instruções ao agente | Sanitização, dado não confiável | 18, skill importacao-membros |
| Motor de escala | T, R | Concorrência quebrando regras; ação sem rastro | Transação com bloqueio, `AuditLog` | 19, ADR-004 |
| Lembretes/WhatsApp | S, I, D | Envio a destino arbitrário, bloqueio do número, vazamento em mensagem | Destino do banco, opt-out, conteúdo mínimo, fallback | 16 |
| Webhooks de entrada | S, T | Requisição forjada, replay | Assinatura e timestamp | 16 |
| Banco | I, T | Acesso indevido, backup exposto | Privilégio mínimo, TLS, backups criptografados | 13 |
| CI/CD e dependências | T | Pacote malicioso, segredo vazado | Auditoria, lockfile, gitleaks, branch protegida | 14, 15 |
| Agente de IA | T, I, E | Prompt injection via dados, leitura de `.env`, instalação de skill maliciosa | Regras da 18, permissões restritas | 18 |
| App mobile | I | Token em armazenamento simples, deep link malicioso | Keychain/Keystore, validação de links | 17 |

Riscos prioritários para a Fase 1: IDOR/autorização, senhas e sessão, vazamento de dados de membros, segredos no repositório.
Revisar este documento ao fim de cada fase (workflow /auditoria-seguranca).
