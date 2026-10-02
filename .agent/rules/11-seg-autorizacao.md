# Segurança: autorização (sempre ativa)

- **Negar por padrão.** Toda rota, Server Action e job verifica permissão NO SERVIDOR, mesmo que a interface já esconda o botão.
- Matriz:
  - ADMIN_MASTER: tudo.
  - GESTOR: apenas departamentos em que é gestor (membros, funções, programas, escalas, aprovações desses departamentos).
  - MEMBRO: apenas o próprio perfil, a própria escala, disponibilidade própria; vê nomes da equipe, não dados de contato de outros.
- **IDOR**: nunca confiar em `userId`, `departmentId` ou `assignmentId` vindos do cliente; sempre checar se o recurso pertence ao escopo do usuário autenticado (consulta filtrada por escopo, não busca por id e checa depois).
- Ações de risco exigem reautenticação ou confirmação: excluir membro, mudar papel, mudar gestor, exportar dados, alterar canais de envio.
- Escalada de privilégio:
  - PASTOR e ADMIN_MASTER: podem atribuir cargos até o seu nível e abaixo (o Pastor pode nomear outro Pastor, Ancião ou Voluntário; Admin Master gerencia tudo).
  - ELDER (Ancião) e GESTOR: só podem atribuir cargos e gerenciar membros para níveis estritamente abaixo do seu (um Ancião não pode nomear outro Ancião nem Pastor; apenas Voluntários). Ninguém altera o próprio papel.
  - Sempre existir pelo menos um ADMIN_MASTER ativo.
- Reprocessamento de escalas na desvinculação departamental: ao desvincular um membro de um departamento, o sistema deve automaticamente reprocessar as escalas futuras daquele membro no departamento, buscando substitutos elegíveis ou convertendo o slot em vaga aberta.
- Um helper único `can(user, action, resource)` em `packages/domain`, com testes por perfil (positivo e negativo). Proibido espalhar `if (role === ...)` pela UI.
- Testes obrigatórios: gestor A não lê nem altera departamento B; membro não vê contatos de outros; PENDENTE não acessa nada.
