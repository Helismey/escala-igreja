---
name: exportar-calendario
description: Use para gerar arquivo .ics e link de assinatura da escala do membro.
---

# Exportar para calendário

- `.ics` com os eventos da escala do próprio usuário (título, início, fim, local, função), fuso America/Sao_Paulo.
- Link de assinatura: URL com token aleatório de escopo restrito (somente leitura da própria escala), revogável e regenerável; nunca expor dados de terceiros nem identificadores previsíveis.
- Escapar campos conforme a especificação do iCalendar e limitar tamanho.
- Atualizações da escala refletem na assinatura; substituição remove o evento de quem saiu.
