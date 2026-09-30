# Design system

## Tokens
| Categoria | Tokens |
|---|---|
| Cor | `--color-primary`, `--color-secondary` (configuráveis), `--color-surface`, `--color-text`, `--color-success`, `--color-warning`, `--color-danger` |
| Tipografia | Fonte do sistema; escala 12, 14, 16, 20, 24, 32 |
| Espaçamento | Múltiplos de 4px |
| Bordas | Raio 8px; largura 1px |
| Sombra | 2 níveis |
| Movimento | 150 a 200ms, ease-out |

Regra: cores da igreja passam por verificação de contraste AA; se falhar, avisar e sugerir ajuste.

## Componentes iniciais
| Componente | Variantes | Estados | Acessibilidade |
|---|---|---|---|
| Button | primário, secundário, fantasma, perigo | padrão, hover, foco, desabilitado, carregando | role button, Enter/Espaço |
| Input | texto, telefone, e-mail, data | padrão, foco, erro, desabilitado | label associado, mensagem de erro anunciada |
| Badge de status | Pendente, Confirmado, Aberto, Recusado | fixo | texto além da cor |
| Card de escala | compacto, detalhado | padrão, aberto, conflito | ordem de leitura lógica |
| Modal de confirmação | padrão, destrutivo | aberto | foco preso, Esc fecha |
| Calendário | mês, semana, lista | dia com escala, dia com slot aberto | navegação por teclado |
| Toast | sucesso, aviso, erro | visível | aria-live polite |
| Empty state | por tela | fixo | texto claro com ação |

## Auditoria (checklist)
- [ ] Nenhuma cor, espaçamento ou fonte hardcoded
- [ ] Todos os componentes com estados e foco visível
- [ ] Alvos de toque de 44px
- [ ] Nomes consistentes entre componentes
