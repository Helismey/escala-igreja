# Preparado para mobile (sempre ativa)

- Lógica de negócio somente em `packages/domain`, sem `window`, `document`, `next/*` nem acesso a banco.
- API consumível por cliente não-web: autenticação por token além de cookie (ver rule 10 e 17).
- UI mobile first; nada que dependa de hover; alvos de toque de 44px.
- Push e armazenamento local isolados atrás de interfaces para trocar Web Push por push nativo (Capacitor).
- Não usar APIs exclusivas de navegador desktop sem alternativa.
