# Menus

## Princípios
- **Uma única fonte de verdade**: a lista de itens fica em dados (`packages/domain/src/navigation/menu.ts`), não espalhada em componentes. Web e app mobile leem a mesma lista.
- **O menu reflete as permissões, mas não é a proteção.** Um item só aparece se `can(user, ver, recurso)` permitir; mesmo assim, toda rota e ação é verificada de novo no servidor (rule 11).
- **Menu por perfil**, sem configuração pelo administrador no MVP (ver "Decisão em aberto").
- Rótulos curtos (até ~12 caracteres), sempre visíveis junto ao ícone Phosphor, mesmo nome em todo o sistema, em caixa de frase.

## Formato de um item
```ts
type MenuItem = {
  id: string;                    // 'minha-escala'
  label: string;                 // pt-BR: 'Minha escala'
  icon: PhosphorIconName;        // ex.: 'CalendarCheck'
  href: string;                  // '/minha-escala'
  requires: Permission;          // ex.: 'assignment:view:own'
  placement: 'primary' | 'more'; // barra principal ou "Mais"
  priority: number;              // define a ordem e quem entra na barra inferior
  group: 'meu-espaco' | 'gestao' | 'administracao'; // agrupamento na barra lateral
  badge?: 'pending-approvals' | 'open-slots' | 'unconfirmed';
  flag?: FeatureFlagKey;         // esconde o item se o recurso estiver desligado
};
```

## Como aparece em cada perfil

Celular: barra inferior com 4 posições (3 principais + "Mais"). "Mais" abre uma folha inferior com o restante, em lista simples, sem submenus.

| Perfil | Barra inferior | Dentro de "Mais" |
|---|---|---|
| Membro | Início, Minha escala, Agenda, Mais | Disponibilidade, Meu perfil, Notificações, Sair |
| Gestor | Início, Minha escala, Escalas, Mais | Equipe, Agenda, Programas, Aprovações, Disponibilidade, Meu perfil, Sair |
| Administrador | Início, Escalas, Membros, Mais | Minha escala, Agenda, Programas, Departamentos, Aprovações, Configurações da igreja, Canais de envio, Auditoria, Meu perfil, Sair |

Desktop: barra lateral com todos os itens, em três grupos com título em caixa de frase:

| Grupo | Itens |
|---|---|
| Meu espaço | Início, Minha escala, Disponibilidade, Meu perfil |
| Gestão | Agenda, Escalas, Programas, Equipe/Membros, Aprovações, Departamentos (gestor vê só os seus) |
| Administração | Configurações da igreja, Canais de envio, Auditoria (só administrador) |

## Ícones sugeridos (Phosphor, conferir nomes na biblioteca)
Início (House), Minha escala (CalendarCheck), Agenda (CalendarBlank), Escalas (ListChecks), Programas (ListBullets), Equipe/Membros (UsersThree), Departamentos (SquaresFour), Aprovações (UserCheck), Disponibilidade (CalendarX), Notificações (Bell), Configurações (Gear), Canais de envio (PaperPlaneTilt), Auditoria (ClipboardText), Meu perfil (UserCircle), Sair (SignOut).

## Selos (badges)
- Aprovações pendentes: número, estilo informativo.
- Vagas abertas: número, estilo de advertência (Mel com texto Grafite).
- Sem confirmação: número, estilo de advertência.
- O selo de "Mais" mostra a soma dos selos dos itens escondidos nele. Sempre com `aria-label` ("3 aprovações pendentes").

## Estados e comportamento
- Item ativo: ícone Fill, cor Petróleo e indicador de 2 px; `aria-current="page"`.
- Alvos de toque de 48 px; `nav` com rótulo acessível; ordem de foco igual à visual; sem menu que dependa de hover.
- Usuário com vários departamentos: o **seletor de departamento** fica no cabeçalho das telas de Escalas e Equipe (filtro), não no menu.
- Sem aninhamento além de um nível.
- Itens de recursos desligados por feature flag somem do menu (ex.: lembretes por WhatsApp desligado esconde só as opções dependentes).

## Testes do menu
- Teste por perfil: a lista de itens visíveis é exatamente a da tabela acima.
- Nenhum item visível sem a permissão correspondente; nenhuma rota de item escondido acessível pela URL (deve retornar 403).
- PENDENTE e INACTIVE não veem menu.
- Selos calculam só o que o perfil pode ver (gestor não conta aprovações de outro departamento).

## Decisão em aberto
Permitir que a igreja renomeie ou reordene itens? Recomendo **não** no MVP: aumenta testes e quebra a consistência do guia de textos. Se precisar, limitar a ocultar módulos inteiros que a igreja não usa.
