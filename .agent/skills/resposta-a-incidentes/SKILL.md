---
name: resposta-a-incidentes
description: Use diante de suspeita de vazamento, invasão, segredo exposto ou abuso, e para escrever o relatório pós-incidente.
---

# Resposta a incidentes

Seguir `docs/security/incident-response.md` e a rule 20: conter, preservar evidências, avaliar impacto, corrigir, comunicar, revisar.
Severidade: P1 vazamento ativo de dados de membros (imediato); P2 comprometimento confirmado e contido (1 h); P3 suspeita em investigação (4 h); P4 atividade suspeita de baixo impacto (24 h).
Primeiras ações práticas: revogar sessões e tokens, rotacionar segredos, desligar o canal afetado, pausar cron de envio, exportar logs e auditoria para local seguro.
Comunicação com titulares e ANPD segue a LGPD, no prazo vigente; conferir a regulamentação atual e envolver o responsável da igreja.
