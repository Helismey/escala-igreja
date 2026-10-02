# UX e textos (sempre ativa)

- Mobile first; funcionar bem em celular simples e em desktop.
- Tema configurável (logo e cores da igreja) via design tokens CSS; nunca cores fixas em componentes.
- Acessibilidade: contraste mínimo AA, foco visível, alvos de toque de 44px, rótulos em todos os campos.
- Tipografia oficial:
  - Títulos e cabeçalhos (`font-display`): `Bricolage Grotesque` (pesos 600, 700).
  - Corpo da interface (`font-body`): `Public Sans` (pesos 400, 500, 600).
  - Horários, contadores, datas e dígitos: aplicar sempre a classe `.tabular-nums` para garantir alinhamento monospaçado de números.
- Raios padronizados:
  - Controles, botões, inputs e badges: `rounded-control` (8px).
  - Cartões, painéis, modais e containers de seção: `rounded-surface` (14px).
- Textos em pt-BR, tom acolhedor e direto. Botões começam com verbo ("Confirmar presença", "Salvar alterações").
- Erros: o que houve + por quê + como resolver. Estados vazios: o que é + por que está vazio + como começar.
- Termos padronizados: "escala", "departamento", "programa", "equipe", "gestor", "membro". Não misturar sinônimos.
