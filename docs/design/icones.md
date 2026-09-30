# Ícones

**Conjunto escolhido: Phosphor** (pacote React oficial; confirmar licença e versão atuais na página oficial antes de instalar).

## Uso
- **Regular** para tudo. **Fill** para o item ativo do menu e para estados concluídos (ex.: confirmado). **Duotone não usar** (vira decoração).
- Tamanhos: 16 (dentro de texto), 20 (linhas e botões), 24 (menu). Nenhum outro.
- Cor: herda do texto (`currentColor`). Ícone de status segue as cores semânticas dos tokens.
- Traço regular do Phosphor em 24 px fica em ~1,5 px; ícones feitos por nós seguem esse mesmo peso.
- Sempre com texto nos botões e menus. Sozinho só quando universal (fechar, editar, buscar) e com rótulo acessível (`aria-label`).
- Nada de ícone dentro de círculo colorido por card; nada de emoji como ícone de interface.
- Importar ícone por ícone (nunca o pacote inteiro) para não pesar o app.

## Sugestões de mapeamento (conferir nomes na biblioteca)
Início (house), Minha escala (calendar-check), Agenda (calendar), Equipe (users-three), Departamento (squares-four), Confirmado (check-circle, Fill), Pendente (clock), Vaga aberta (warning), Recusado (x-circle), Trocar (arrows-left-right), Avisar/lembrete (bell), WhatsApp (whatsapp-logo), E-mail (envelope-simple), Configurações (gear), Sair (sign-out).
Igreja (church), Cruz (cross) e Oração (hands-praying) parecem existir no conjunto: conferir antes de usar.

## Ícones próprios (SVG no mesmo peso de traço)
Bíblia, pomba, louvor/microfone de culto e quaisquer outros que o conjunto não tiver. Criar em grade de 24 px, traço de ~1,5 px, pontas e cantos como os do Phosphor, e guardar em `apps/web/src/icons/`.
