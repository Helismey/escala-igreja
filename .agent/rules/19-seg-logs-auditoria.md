# Segurança: logs e auditoria (sempre ativa)

- **Auditoria** (tabela `AuditLog`, somente inserção): login e falhas, mudança de senha, criação/aprovação/rejeição de cadastro, mudança de papel ou gestor, criar/alterar/excluir programa e escala, desmarcação e substituição, exportação de dados, alteração de configurações e canais. Campos: quem, o quê, alvo, quando, IP, resultado.
- Ninguém edita nem apaga auditoria pela aplicação. Retenção definida (ex.: 12 meses) e acesso só ADMIN_MASTER.
- **Logs de aplicação**: estruturados (JSON), com ID de correlação. NUNCA registrar senha, token, cookie, chave, conteúdo de mensagem ou dado pessoal completo (mascarar telefone e e-mail: `+55 62 9****-1234`).
- Alertas mínimos: muitas falhas de login, pico de erros 5xx, falha em série no envio de lembretes, tentativa de acesso negado repetida (possível IDOR), exportação de dados.
- Erros para o usuário são genéricos; o detalhe fica só no log interno.
