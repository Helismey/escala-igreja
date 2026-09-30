# Segurança: dados, criptografia e LGPD (sempre ativa)

- **Em trânsito**: TLS 1.2+ (preferir 1.3) em tudo, incluindo conexão com o banco (`sslmode=require`).
- **Em repouso**: usar criptografia do provedor do banco e dos backups. Campos muito sensíveis (contato de emergência, endereço completo) podem ter criptografia em nível de aplicação (AES-256-GCM, chave em variável de ambiente segura, com rotação).
- **Minimização**: coletar só o necessário; campos opcionais claros. Nada de CPF, RG ou dado financeiro sem necessidade e ADR.
- **Menores de idade**: exigir dados do responsável; restringir exposição de foto e contato.
- **Acesso ao banco**: usuário da aplicação com privilégio mínimo (sem DROP/CREATE em produção); usuário separado para migrations; banco não exposto à internet sem necessidade; considerar RLS quando disponível no provedor.
- **Ambientes**: dados reais NUNCA em desenvolvimento ou teste; usar seed fictício. Dumps de produção não saem do ambiente seguro.
- **Backups**: automáticos, criptografados, com teste de restauração periódico e retenção definida. Exclusão de titular também vale para backups no prazo definido.
- **Direitos do titular**: exportar meus dados, corrigir, excluir/anonimizar; registro de consentimento (data, versão dos termos).
- **Vazamento**: seguir `20-seg-incidentes.md`. Comunicação à ANPD e aos titulares conforme a LGPD, no prazo vigente; conferir a regulamentação atual da ANPD antes de definir o procedimento final.
- **Exportações** (CSV, relatórios): só ADMIN, com registro em auditoria, sem envio por canais não seguros.
