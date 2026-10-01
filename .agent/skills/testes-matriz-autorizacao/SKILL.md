---
name: testes-matriz-autorizacao
description: Use para gerar e manter a matriz de testes de autorização (perfil × ação × escopo) a partir da tabela de permissões.
---

# Matriz de autorização

Fonte única: a tabela de permissões em `packages/domain/src/authz/`. A matriz de referência está em `docs/testing/matriz-autorizacao.md`.

## Como funciona
1. Os testes percorrem a tabela: para cada ação, perfil e escopo, afirmam permitido ou negado (`can()` no domínio; rota/Server Action em integração).
2. Perfis testados: ADMIN_MASTER, GESTOR do departamento, GESTOR de outro departamento, MEMBRO, PENDENTE, INACTIVE, anônimo.
3. **CI falha** se existir rota ou Server Action sem linha na tabela (teste que lista as rotas do app e compara).
4. Casos de IDOR: trocar `userId`, `departmentId`, `assignmentId`, `programId` no corpo e na URL e conferir 403/404 sem vazar existência.
5. DTOs: afirmar quais campos cada perfil recebe (membro não recebe telefone, e-mail, endereço ou aniversário de terceiros).
6. Regras especiais: só ADMIN promove; ninguém altera o próprio papel; sempre existe ao menos um ADMIN_MASTER ativo.
7. Menu: itens visíveis por perfil iguais aos definidos em `docs/design/menus.md`; rota de item escondido responde 403.
