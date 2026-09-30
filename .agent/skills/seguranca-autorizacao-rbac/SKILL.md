---
name: seguranca-autorizacao-rbac
description: Use ao criar ou alterar permissões, rotas, Server Actions ou consultas que dependem de perfil ou de escopo por departamento.
---

# Autorização (RBAC com escopo)

Aplicar a rule 11.

- Implementar `can(user, action, resource)` em `packages/domain/src/authz/`, função pura com tabela de permissões por perfil e escopo (departamentos do gestor).
- Toda rota, Server Action e job chama o guard ANTES de qualquer leitura ou escrita.
- **Consultas já filtradas por escopo**: `where: { id, departmentId: { in: escopoDoUsuario } }`, nunca "buscar por id e depois checar".
- DTOs por perfil: membro recebe nome e função da equipe, sem telefone, e-mail, endereço ou aniversário de terceiros.
- Regras especiais: só ADMIN promove; ninguém muda o próprio papel; sempre ao menos um ADMIN_MASTER ativo.

Matriz de testes (obrigatória): para cada ação, casos permitido e negado por perfil; gestor de A contra dados de B; MEMBRO contra rotas de gestão; PENDENTE/INACTIVE contra tudo; manipulação de ids na URL e no corpo.
