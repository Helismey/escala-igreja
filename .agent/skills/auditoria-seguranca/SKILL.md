---
name: auditoria-seguranca
description: Use para realizar auditoria de segurança ao fim de cada fase ou antes de publicar uma versão.
---

# Auditoria de segurança

1. Percorrer `docs/security/checklist-pre-release.md` item por item, com evidência.
2. Rodar `pnpm audit`, varredura de segredos e análise estática.
3. Revisar o modelo de ameaças (skill modelagem-de-ameacas) para o que mudou.
4. Testar a matriz de autorização (skill seguranca-autorizacao-rbac) e os cenários de concorrência.
5. Confirmar cabeçalhos, cookies, rate limit, logs sem dados pessoais e backups.
6. Entregar relatório: achados por severidade, correção proposta, responsável. Registrar pendências em `docs/tech-debt.md`.
