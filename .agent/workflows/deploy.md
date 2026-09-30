---
description: Preparar e executar publicação
---
1. Aplicar a skill checklist-de-deploy usando `docs/deploy-checklist.md`.
2. Confirmar CI verde, migrations testadas e backup recente.
3. Definir gatilhos de rollback.
4. Publicar em preview, rodar smoke tests, depois produção.
5. Monitorar por 15 minutos e atualizar o changelog.
