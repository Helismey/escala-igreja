# Segurança: autorização (sempre ativa)

- **Negar por padrão.** Toda rota, Server Action e job verifica permissão NO SERVIDOR, mesmo que a interface já esconda o botão.
- Matriz:
  - ADMIN_MASTER: tudo.
  - GESTOR: apenas departamentos em que é gestor (membros, funções, programas, escalas, aprovações desses departamentos).
  - MEMBRO: apenas o próprio perfil, a própria escala, disponibilidade própria; vê nomes da equipe, não dados de contato de outros.
- **IDOR**: nunca confiar em `userId`, `departmentId` ou `assignmentId` vindos do cliente; sempre checar se o recurso pertence ao escopo do usuário autenticado (consulta filtrada por escopo, não busca por id e checa depois).
- Ações de risco exigem reautenticação ou confirmação: excluir membro, mudar papel, mudar gestor, exportar dados, alterar canais de envio.
- Escalada de privilégio: só ADMIN_MASTER promove; ninguém altera o próprio papel; sempre existir pelo menos um ADMIN_MASTER ativo.
- Um helper único `can(user, action, resource)` em `packages/domain`, com testes por perfil (positivo e negativo). Proibido espalhar `if (role === ...)` pela UI.
- Testes obrigatórios: gestor A não lê nem altera departamento B; membro não vê contatos de outros; PENDENTE não acessa nada.
