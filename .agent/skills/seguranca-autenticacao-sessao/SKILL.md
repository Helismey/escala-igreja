---
name: seguranca-autenticacao-sessao
description: Use ao implementar login, cadastro, recuperação de senha, sessão, MFA, tokens do app e links de confirmação por token.
---

# Autenticação e sessão

Aplicar a rule 10. Passos práticos:

1. **Hash**: Argon2id (ou bcrypt custo 12+); nunca comparar senha em texto.
2. **Login**: limitar tentativas por IP e por conta; resposta única para falha; registrar em `AuditLog`.
3. **Cadastro**: cria usuário PENDENTE; resposta igual para e-mail já existente; nada de dados acessíveis até aprovação.
4. **Recuperação**: gerar token aleatório de 32 bytes, guardar só o hash com expiração de 30 min e uso único; ao concluir, invalidar sessões.
5. **Sessão web**: cookie HttpOnly, Secure, SameSite; ID aleatório; expiração por inatividade e absoluta; rotação no login.
6. **App**: access token de 15 min + refresh com rotação e detecção de reuso (reuso = revogar a família de tokens). Tabela `RefreshToken` com hash, dispositivo e revogação.
7. **MFA TOTP** para ADMIN_MASTER: segredo criptografado, códigos de recuperação com hash.
8. **Links por token** (confirmar presença): tabela `ConfirmationToken` (hash, assignmentId, ação, expiresAt, usedAt); validar e consumir em transação.

Testes: força bruta bloqueia, sessão expira, refresh reutilizado é revogado, token expirado/usado falha, PENDENTE não acessa nada.
