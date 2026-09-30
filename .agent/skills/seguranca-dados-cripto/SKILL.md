---
name: seguranca-dados-cripto
description: Use ao lidar com criptografia de campos, backups, permissões do banco, ambientes, retenção e exportação de dados de membros.
---

# Dados e criptografia

Aplicar a rule 13 (complementa a skill lgpd-dados-membros).

- **Campos sensíveis** (contato de emergência, endereço completo): criptografia em nível de aplicação com AES-256-GCM, IV aleatório por registro, chave em variável de ambiente, com identificador de versão para rotação.
- **Banco**: usuário da aplicação com privilégio mínimo; usuário de migration separado; TLS obrigatório; sem acesso público direto.
- **Backups**: `pg_dump` agendado, criptografado antes de armazenar, teste de restauração trimestral, retenção definida.
- **Ambientes**: seed fictício em dev/teste; proibido copiar produção para fora do ambiente seguro.
- **Exportações**: apenas ADMIN, registradas em auditoria, arquivo com expiração.
- **Retenção e exclusão**: política escrita (ex.: dados de ex-membro anonimizados após prazo definido pela igreja); exclusão preserva integridade dos relatórios anonimizando.
- **Menores**: dados do responsável obrigatórios; foto e contato com exposição reduzida.
