# Direção visual

**Produto:** sistema de escalas para igreja (PWA, depois app).
**Quem usa:** voluntários de todas as idades, muitos no celular e com pouca paciência para tecnologia; gestores de departamento que montam a escala; um administrador.
**Trabalho principal da interface:** responder rápido "quando eu sirvo?" e "o que preciso resolver?", e deixar confirmar ou desmarcar em um toque.
**Sensação pedida:** seriedade e confiança, mas atual e jovem.

## Conceito: a programação do culto, atualizada em tempo real

Pense no folheto de programação do culto bem diagramado: horários alinhados, nomes em destaque, tudo no lugar. Levamos essa clareza para o celular. Seriedade vem de estrutura estável, contraste alto e texto direto. Jovialidade vem de tipografia com personalidade, uma cor de destaque viva, fotos das pessoas e linguagem de conversa.

Uma coisa memorável: o **cartão "sua próxima escala"** no topo da tela inicial do membro, escrito como frase ("Você serve no sábado, às 9h, na recepção"). O resto do sistema é quieto e disciplinado.

## Paleta (valores iniciais, cor da igreja substitui o Petróleo)

| Nome | Hex | Papel |
|---|---|---|
| Petróleo | `#0F4C5C` | Cor principal (azul-esverdeado saturado): botões, cabeçalho, links, item ativo. Substituída pela cor da igreja, quando definida |
| Grafite | `#22262B` | Texto principal. Cinza-escuro neutro, sem matiz azul-esverdeado, para não se confundir com o Petróleo |
| Névoa | `#F4F6F7` | Fundo das telas (cinza frio, sem tom creme) |
| Branco | `#FFFFFF` | Superfícies, campos |
| Fio | `#DDE1E5` | Linhas divisórias e bordas leves |
| Mel | `#F2B632` | Advertência e atenção (ver sinalização abaixo) |

Texto secundário `#596068`, borda de campo `#80868D`.

A diferença entre Petróleo e Grafite agora é de matiz e de saturação: um é cor, o outro é neutro. Assim o título em Grafite não "compete" com o botão em Petróleo.

## Cores de sinalização

Quatro estados, cada um com: cor cheia (botões, barras, pontos), fundo suave (avisos e selos), cor de texto/ícone sobre o fundo suave. **Nunca só cor**: sempre ícone + texto. As três cores de sinalização são fixas e **não mudam com a cor da igreja**.

| Estado | Nome no sistema | Cheia | Fundo suave | Texto e ícone | Ícone Phosphor |
|---|---|---|---|---|---|
| Conclusão | Sucesso | Verde `#1B6E45` | `#E4F2EA` | `#14532F` | check-circle (Fill) |
| Crítico | Erro, bloqueio, ação destrutiva | Rubi `#B3261E` | `#FCE8E6` | `#8A1C16` | x-circle / warning-octagon |
| Advertência | Atenção, requer ação | Mel `#F2B632` | `#FFF3D1` | `#6A4700` | warning |
| Informativo | Neutro, sem urgência | Petróleo | `#E3EEF1` | Petróleo | info |

### Onde usar cada uma
| Estado | Exemplos no sistema |
|---|---|
| Conclusão | Presença confirmada, escala salva, substituto aceitou, cadastro aprovado, mensagem enviada |
| Crítico | Conflito de horário bloqueado, erro ao salvar, recusado, exclusão de membro (botão destrutivo), falha no envio |
| Advertência | Vaga aberta, pessoa no limite de 2 escalas no dia, lembrete sem confirmação, número do WhatsApp desconectado |
| Informativo | Pendente de aprovação, dicas, avisos sem urgência |

Regras de aplicação:
- **Mel é fundo, nunca texto ou ícone sobre fundo claro** (contraste 1,8:1). Sobre fundo claro, o ícone e o texto de advertência usam `#6A4700`.
- Botão cheio de sucesso ou crítico: texto branco. Botão cheio de advertência: texto Grafite.
- Aviso em linha: fundo suave + barra de 4 px na cor cheia no início + ícone + texto. Sem gradiente.
- Campo com erro: borda Rubi + ícone + mensagem abaixo; sem depender só da cor.
- O dia de "hoje" no calendário é marcado com Petróleo, não com Mel, para o Mel significar sempre advertência.
- Por que são fixas: a igreja pode escolher vermelho como cor principal, e o "crítico" deixaria de parecer crítico.

### Contraste verificado (WCAG)
| Par | Razão |
|---|---|
| Grafite sobre Névoa / Branco | 14,0:1 / 15,2:1 |
| Branco sobre Petróleo | 9,5:1 |
| Mel sobre Petróleo | 5,2:1 |
| Grafite sobre Mel | 8,3:1 |
| Texto secundário sobre Branco / Névoa | 6,4:1 / 5,9:1 |
| Borda de campo sobre Branco | 3,7:1 (mínimo 3:1) |
| Branco sobre Verde / Rubi | 6,2:1 / 6,5:1 |
| Verde sobre fundo suave / texto `#14532F` | 5,4:1 / 7,9:1 |
| Rubi sobre fundo suave / texto `#8A1C16` | 5,6:1 / 7,9:1 |
| Texto `#6A4700` sobre fundo suave de advertência | 7,6:1 |
| Petróleo sobre fundo suave informativo | 8,0:1 |

Qualquer cor da igreja passa pelo verificador (mínimo 4,5:1 para texto, 3:1 para bordas e ícones); se falhar, o sistema avisa e sugere o tom mais próximo que passa.

## Tipografia

Duas famílias claramente distintas, ambas livres (conferir licença e disponibilidade na fonte oficial antes de adotar) e **auto-hospedadas** (mais rápido e sem enviar o IP dos membros a terceiros).

| Papel | Fonte | Uso |
|---|---|---|
| Títulos e cartão principal | Bricolage Grotesque (600 a 700) | Personalidade, traço atual e firme |
| Texto e interface | Public Sans (400, 500, 600) | Neutra, muito legível em tamanho pequeno, sólida em português |

Alternativas se alguma falhar nos testes com acentos ou carregamento: Schibsted Grotesk (títulos) e Source Sans 3 (texto).

Escala: 12, 14, 16, 20, 24, 32, 40 px. Corpo 16 px no celular (evita zoom automático em campos no iPhone). Entrelinha 1,5 no texto e 1,15 nos títulos. Linhas com no máximo ~65 caracteres. Horários e números em `font-variant-numeric: tabular-nums` (conferir suporte na fonte escolhida) para alinhar colunas.

Regras de estilo: caixa de frase em tudo (nada de títulos em maiúsculas), sem rótulo em caixa alta acima de títulos, sem destacar uma única palavra do título em outra cor ou itálico, sem setas ou pontos médios decorativos no texto.

## Forma e estrutura

- **Linhas, não cartões.** Listas de escala são linhas com divisórias (Fio), altura de 56 a 64 px. Cartão só para algo que é uma unidade própria (um programa, a próxima escala).
- **Raios por hierarquia:** 8 px em campos e botões, 14 px em superfícies (cartões, folhas), círculo só em avatar e ponto de status.
- **Sem sombra** nas telas normais; separação por borda e espaço. Uma única elevação para modais e folhas inferiores.
- **Sem gradiente** e sem fundos decorativos.
- **Espaçamento:** base de 4 px; telas respiram, mas com densidade média (cabem 5 a 7 linhas de escala na tela do celular).
- **Fotos das pessoas são protagonistas:** avatar de 40 px nas linhas; sem foto, iniciais em Petróleo translúcido. O nome vem antes da função.
- **Alinhamento:** texto à esquerda em toda parte; horários em coluna à esquerda, como na programação impressa.

## Ícones

Phosphor, detalhes em `icones.md`. Regular para tudo, Fill para o item ativo do menu e para estados concluídos.

## Movimento

- Sem entradas animadas de seção e sem efeito de hover em todo cartão.
- Movimento responde a uma ação: confirmar presença troca o estado com um check; quando um substituto assume, a linha destaca em fundo suave de sucesso por ~1 s uma vez.
- Respeitar `prefers-reduced-motion`.

## Componentes-chave

| Componente | Decisão |
|---|---|
| Botão principal | Petróleo cheio, texto branco, 48 px de altura no celular, um por tela |
| Botão secundário | Contorno Petróleo; terciário só texto; perigo em Rubi |
| Campos | Rótulo sempre visível acima, borda de campo a 3,5:1, erro com texto e ícone |
| Status | Sempre ícone + texto + cor, seguindo a tabela de sinalização: Confirmado (verde), Pendente (informativo), Vaga aberta (advertência), Recusado (crítico) |
| Calendário | No celular, faixa semanal rolável com dia de hoje sublinhado em Petróleo; mês completo no desktop |
| Menu do app | Barra inferior no celular com 4 itens (Início, Minha escala, Agenda, Mais); barra lateral no desktop |
| Avisos | Faixa no topo da lista, nunca modal para o que não bloqueia |

## Esboços

Início do membro (celular)
```
┌────────────────────────────┐
│ [logo]  Igreja X       (foto)│
├────────────────────────────┤
│ Você serve no sábado,      │
│ às 9h, na recepção.        │   <- Petróleo, texto branco, título em Bricolage
│ [Confirmar presença]       │
│ Não posso ir               │
├────────────────────────────┤
│ Próximas                    │
│ 09:00  (foto) Ana · Som      │
│ 11:00  (foto) Você · Recepção│
│ ...                         │
├────────────────────────────┤
│ Início  Escala  Agenda  Mais│
└────────────────────────────┘
```

Escala de um programa (gestor, desktop)
```
┌──────────┬───────────────────────────────────────────┐
│ Início   │ Culto de sábado · 4 out      [Clonar] [Salvar]│
│ Agenda   ├───────────────────────────────────────────┤
│ Escalas  │ 09:00  Recepção      (foto) Ana   Confirmado │
│ Membros  │ 09:00  Som           [ vaga aberta ]  advertência    │
│ Config.  │ 10:30  Louvor        (foto) Davi  Pendente   │
└──────────┴───────────────────────────────────────────┘
```

Desmarcar (folha inferior no celular)
```
Não vai poder servir?
Vamos avisar quem assumirá seu lugar.
[Desmarcar]   [Manter escala]
```

## Voz e textos

Conversa clara, frase curta, "você". Sério, nunca solene demais nem brincalhão. Botão diz o que acontece ("Confirmar presença"). Erro explica o que houve e como resolver, sem pedir desculpas. Estado vazio convida a agir. Mais detalhes na skill `ux-copy-ptbr` e em `docs/ux-copy.md`. A saudação das mensagens ("Paz do Senhor" etc.) deve ser **configurável** nas configurações da igreja.

## O que descartei ao revisar o plano
| Primeiro instinto | Por que saiu | Escolha final |
|---|---|---|
| Azul royal + âmbar, fonte Inter, cartões arredondados iguais | É o kit genérico de sistema de gestão | Petróleo + Grafite neutro, sinalização fixa, Bricolage + Public Sans, linhas com divisórias |
| Fundo creme com serifa e acento terracota | Visual muito comum em páginas geradas por IA | Névoa fria, sem serifa, sem terracota |
| Modo escuro com acento neon | Jovem, mas perde a seriedade | Claro por padrão; escuro fica para depois, com os mesmos tokens |
| Gradiente no cartão principal | Decoração sem função | Cor chapada e texto grande |

## Fora do escopo desta direção
Identidade da igreja (logo, nome, cores oficiais): entra pela pasta `referencias/identidade-igreja/` e pelas configurações do sistema. Ilustrações e fotos institucionais: decidir depois das referências reunidas.
