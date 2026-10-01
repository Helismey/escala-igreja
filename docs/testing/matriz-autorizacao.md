# Matriz de autorização (referência inicial)

Legenda: ✔ permitido, ✖ negado (403/404), ◐ permitido só no escopo indicado.
Perfis: ADM = administrador master, GES-A = gestor do departamento do recurso, GES-B = gestor de outro departamento, MEM = membro, PEN = cadastro pendente, ANO = anônimo.

| Ação | ADM | GES-A | GES-B | MEM | PEN | ANO |
|---|---|---|---|---|---|---|
| Ver e editar o próprio perfil | ✔ | ✔ | ✔ | ✔ | ✖ | ✖ |
| Ver contato (telefone, e-mail, endereço) de outro membro | ✔ | ◐ membros do seu departamento | ✖ | ✖ | ✖ | ✖ |
| Ver nome e função de colegas da equipe | ✔ | ✔ | ◐ só se em comum | ◐ equipe própria | ✖ | ✖ |
| Criar ou editar departamento e funções | ✔ | ✖ | ✖ | ✖ | ✖ | ✖ |
| Adicionar ou remover membro do departamento | ✔ | ◐ seu departamento | ✖ | ✖ | ✖ | ✖ |
| Criar, editar ou clonar programa | ✔ | ◐ partes do seu departamento | ✖ | ✖ | ✖ | ✖ |
| Atribuir ou trocar pessoa em slot | ✔ | ◐ seu departamento | ✖ | ✖ | ✖ | ✖ |
| Ver a própria escala | ✔ | ✔ | ✔ | ✔ | ✖ | ✖ |
| Confirmar ou desmarcar a própria escala | ✔ | ✔ | ✔ | ✔ | ✖ | ✖ |
| Desmarcar a escala de outra pessoa | ✔ | ◐ seu departamento | ✖ | ✖ | ✖ | ✖ |
| Informar a própria disponibilidade | ✔ | ✔ | ✔ | ✔ | ✖ | ✖ |
| Aprovar ou rejeitar cadastro | ✔ | ◐ para seu departamento | ✖ | ✖ | ✖ | ✖ |
| Alterar papel ou gestor | ✔ | ✖ | ✖ | ✖ | ✖ | ✖ |
| Alterar o próprio papel | ✖ | ✖ | ✖ | ✖ | ✖ | ✖ |
| Configurar igreja (logo, cores, saudação) | ✔ | ✖ | ✖ | ✖ | ✖ | ✖ |
| Configurar canais de envio e feature flags | ✔ | ✖ | ✖ | ✖ | ✖ | ✖ |
| Importar membros por planilha | ✔ | ✖ | ✖ | ✖ | ✖ | ✖ |
| Exportar dados | ✔ | ✖ | ✖ | ✖ | ✖ | ✖ |
| Ver auditoria | ✔ | ✖ | ✖ | ✖ | ✖ | ✖ |
| Confirmar presença por link com token válido | (ação única, só do alvo do token) | idem | idem | idem | ✖ | ◐ somente com token |
| Ver menu | completo | do gestor | do gestor | do membro | nenhum | nenhum |

## Casos de teste adicionais
- Troca de `departmentId`, `userId`, `assignmentId` e `programId` no corpo e na URL (IDOR): resposta 403/404 sem revelar se o recurso existe.
- Sempre existe pelo menos um ADMIN_MASTER ativo (não é possível remover o último).
- Usuário em dois departamentos: gestor em A e membro em B tem as permissões certas em cada um.
- Token de confirmação expirado, usado ou de outro assignment: negado.
- Usuário INACTIVE: tratado como PEN para todas as ações.
Esta matriz deve virar a tabela de permissões lida pelos testes (skill `testes-matriz-autorizacao`) e ser atualizada junto com cada rota nova.
