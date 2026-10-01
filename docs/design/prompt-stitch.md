# Prompt para o Stitch

Use o **prompt mestre** primeiro, para definir o sistema. Depois gere **uma tela por vez** com os prompts por tela, sempre começando por "Mesmo sistema visual do prompt mestre". Se o Stitch ignorar algo (cor, texto em português, ausência de gradiente), repita a instrução naquela tela.

## Prompt mestre
```
Projete o aplicativo web responsivo "Escala Igreja", um sistema de escalas de voluntários para uma igreja (nome fictício para os mockups: "Igreja Esperança"). Todo o texto da interface deve estar em português do Brasil, em caixa de frase (nada de títulos em caixa alta). Use nomes, telefones e e-mails fictícios.

USUÁRIOS E OBJETIVO
Voluntários de todas as idades, muitos no celular e pouco familiarizados com tecnologia, precisam saber "quando eu sirvo?" e confirmar ou desmarcar em um toque. Gestores de departamento montam a escala; um administrador cuida da igreja. A tela precisa ser clara à primeira vista.

SENSAÇÃO
Séria e confiável, mas atual e jovem. Conceito: a programação do culto, bem diagramada, atualizada em tempo real. Horários alinhados em coluna à esquerda, nomes das pessoas em destaque, fotos redondas das pessoas.

CORES (use exatamente estes valores)
Principal Petróleo #0F4C5C (botões, cabeçalho, links, item ativo). Texto Grafite #22262B, texto secundário #596068. Fundo da tela #F4F6F7, superfícies brancas #FFFFFF, linhas divisórias #DDE1E5, borda de campos #80868D.
Sinalização: conclusão/sucesso verde #1B6E45 (fundo suave #E4F2EA, texto #14532F); crítico/erro rubi #B3261E (fundo suave #FCE8E6, texto #8A1C16); advertência mel #F2B632 (fundo suave #FFF3D1, texto #6A4700); informativo com fundo #E3EEF1 e texto Petróleo. Sinalização sempre com ícone e texto, nunca só cor. Mel é usado só como fundo; o texto sobre ele é Grafite.

TIPOGRAFIA
Títulos em Bricolage Grotesque (semibold/bold); texto e interface em Public Sans. Corpo 16 px no celular. Números e horários com algarismos tabulares.

FORMA E ESTRUTURA
Prefira linhas de lista com divisórias (altura 56 a 64 px) em vez de cartões. Cartão só para uma unidade própria (um programa, a "próxima escala"). Raio de 8 px em botões e campos, 14 px em superfícies; círculo só para avatar. Sem sombras nas telas comuns, sem gradientes, sem fundos decorativos, sem vidro fosco. Botão principal em Petróleo, texto branco, altura 48 px no celular, no máximo um por tela. Rótulo de campo sempre visível acima do campo.

ÍCONES
Estilo Phosphor Regular: traço de 1,5 px, extremidades arredondadas, tamanho consistente (16, 20, 24 px), sempre acompanhados de texto nos menus e botões. Ícone preenchido só no item ativo do menu e em estados concluídos. Sem ícone dentro de círculo colorido, sem emoji.

EVITAR (aspecto genérico de IA)
Cartões idênticos em grade com ícone em círculo colorido, gradientes roxo/azul, rótulos pequenos em caixa alta acima dos títulos, destaque de uma única palavra do título em outra cor, setas decorativas nos links, fundo creme com fonte serifada, modo escuro neon, ilustrações 3D genéricas, animações de entrada.

NAVEGAÇÃO
Celular: barra inferior com 4 posições (3 itens + "Mais"), item ativo com ícone preenchido, cor Petróleo e indicador de 2 px; "Mais" abre uma folha inferior em lista. Desktop: barra lateral com grupos "Meu espaço", "Gestão" e "Administração". Menu por perfil:
- Membro: Início, Minha escala, Agenda, Mais.
- Gestor: Início, Minha escala, Escalas, Mais.
- Administrador: Início, Escalas, Membros, Mais.

TELAS A COBRIR (uma por vez)
Membro (celular): login, cadastro, cadastro enviado aguardando aprovação, início, minha escala, desmarcar (folha inferior), agenda, disponibilidade, meu perfil, preferências de notificação.
Gestor (desktop e celular): lista de escalas, escala de um programa, criar programa (com seleção de departamentos e partes com horários, e clonar para outras datas), equipe do departamento, aprovações, alerta de vaga aberta.
Administrador (desktop): painel, membros e ficha completa, importar membros por planilha com prévia, departamentos e funções, configurações da igreja (logo, cor principal com aviso de contraste, saudação das mensagens), canais de envio, auditoria.
Para toda tela: mostrar também estados vazio, carregando e de erro quando fizer sentido.

TEXTO E TOM
Conversa clara, frases curtas, tratamento por "você". Sério, nunca solene demais nem brincalhão. Botões dizem o que acontece ("Confirmar presença", "Desmarcar da escala", "Aprovar cadastro"). Erros explicam o que houve e como resolver. Estados vazios convidam a agir.

ACESSIBILIDADE
Contraste mínimo AA, alvos de toque de 44 a 48 px, foco visível, estados nunca só por cor, texto ampliável até 200%.
```

## Prompts por tela
Cada um começa com: "Mesmo sistema visual do prompt mestre. Tela: ..."

1. **Início do membro (celular)**: no topo, cartão Petróleo com a frase "Você serve no sábado, às 9h, na recepção.", botão "Confirmar presença" e link "Não posso ir". Abaixo, lista "Próximas" em linhas com horário à esquerda, foto redonda, nome e função, selo de status (confirmado, pendente, vaga aberta). Barra inferior com Início ativo.
2. **Minha escala (celular)**: lista agrupada por data (sábado 4 de outubro, domingo 5...), cada linha com horário, parte do programa, função e selo de status. Um aviso de advertência no topo: "Você ainda não confirmou 1 escala."
3. **Desmarcar (folha inferior, celular)**: título "Não vai poder servir?", texto "Vamos avisar quem assumirá seu lugar.", campo opcional "Motivo", botões "Desmarcar" e "Manter escala".
4. **Login e cadastro (celular)**: login com e-mail e senha, link "Esqueci minha senha"; cadastro com nome, e-mail, telefone/WhatsApp, data de nascimento, foto, aceite dos termos; após enviar, tela "Cadastro enviado" explicando que um responsável vai aprovar.
5. **Disponibilidade (celular)**: escolha dos dias da semana preferidos (seleção em fileira de dias) e lista de períodos indisponíveis com botão "Adicionar período".
6. **Escala de um programa (desktop)**: cabeçalho "Culto de sábado, 4 de outubro" com botões "Clonar" e "Salvar"; tabela de slots com horário, parte do programa, departamento, função, pessoa (foto e nome) e status; uma linha com "Vaga aberta" em advertência e botão "Escalar alguém"; aviso crítico de conflito em uma atribuição tentada: "Ana já tem uma escala nesse horário."
7. **Criar programa (desktop)**: passos: dados do programa, departamentos envolvidos (seleção múltipla), partes com horário (linhas editáveis), opção "Clonar para outras datas" com calendário.
8. **Aprovações (desktop)**: lista de cadastros pendentes com foto, nome, contatos, departamento desejado e botões "Aprovar cadastro" e "Rejeitar".
9. **Painel do administrador (desktop)**: indicadores simples (vagas abertas, aprovações pendentes, escalas sem confirmação) em linhas, não em cartões idênticos; lista de próximos programas; gráfico simples de carga por pessoa.
10. **Membros e ficha completa (desktop)**: tabela com busca e filtro por departamento; ficha com foto, telefones, e-mail, endereço, aniversário, contato de emergência, departamentos e funções.
11. **Importar membros (desktop)**: envio de arquivo, prévia com linhas válidas e inválidas destacadas (sucesso e crítico), botão "Importar membros".
12. **Configurações da igreja (desktop)**: nome, logo, seletor de cor principal com verificador de contraste ("Esta cor não tem contraste suficiente. Use #...") e saudação das mensagens; canais de envio com liga/desliga por canal.
13. **Prévia da mensagem de lembrete**: bolha de WhatsApp fictícia: "Paz do Senhor, Ana! Você serve no sábado, 4 de outubro, às 9h, na recepção. Confirme: [link]".
