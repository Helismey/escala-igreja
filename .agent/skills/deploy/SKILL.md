---
name: deploy
description: Use para preparar e executar publicação em preview ou produção com verificações e rollback.
---

# Deploy

1. Aplicar a skill checklist-de-deploy usando `docs/deploy-checklist.md`.
2. Confirmar CI verde, migrations testadas e backup recente.
3. Definir gatilhos de rollback.
4. Publicar em preview, rodar smoke tests, depois produção.
5. Monitorar por 15 minutos e atualizar o changelog.
