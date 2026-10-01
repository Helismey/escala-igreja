# Jornadas E2E

| # | Jornada | Perfil e dispositivo | Resultado esperado |
|---|---|---|---|
| 1 | Autocadastro, pendência e aprovação | Visitante, celular; depois admin, desktop | Cadastro fica pendente e sem acesso; após aprovação, login funciona |
| 2 | Login, sessão e logout | Membro, celular | Sessão expira por inatividade; logout invalida |
| 3 | Criar programa com partes e departamentos, e escalar | Gestor, desktop | Slots criados; atribuição aparece para o membro |
| 4 | Conflito e limite diário | Gestor, desktop | Horário sobreposto e terceira escala no dia são bloqueados com mensagem clara |
| 5 | Desmarcar com substituição automática | Membro, celular | Substituto atribuído, aviso registrado no canal falso; gestor notificado; sem candidato, vaga aberta com alerta |
| 6 | Clonar programa para outra data | Gestor, desktop | Escala regenerada respeitando preferências e regras |
| 7 | Confirmar presença por link | Membro, celular | Token de uso único; segundo uso e token expirado são negados |
| 8 | Lembretes D-7, D-2 e D-1 | Sistema, relógio avançado | Um aviso por escala e tipo, sem duplicar, respeitando opt-out |
| 9 | Menu por perfil | Membro, gestor e admin | Itens exatos de `docs/design/menus.md`; rota de item escondido responde 403 |
| 10 | Tema da igreja | Admin, desktop | Cor com contraste insuficiente é avisada; logo aplicado |

Todas rodam também com verificação de acessibilidade (axe) nas telas principais.
