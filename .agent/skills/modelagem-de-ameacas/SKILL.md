---
name: modelagem-de-ameacas
description: Use para criar ou atualizar o modelo de ameaças (STRIDE) ao adicionar módulo, integração, perfil ou fluxo com dados sensíveis.
---

# Modelagem de ameaças (STRIDE)

1. Definir escopo, ativos (dados de membros, contas, escala, chaves), fronteiras de confiança e fluxo de dados.
2. Aplicar STRIDE a cada elemento: Spoofing (autenticação), Tampering (integridade), Repudiation (auditoria), Information disclosure (confidencialidade), Denial of service (disponibilidade), Elevation of privilege (autorização).
3. Pontuar risco (probabilidade x impacto), priorizar e definir mitigação com responsável.
4. Registrar em `docs/security/threat-model.md` e criar testes ou tarefas para cada mitigação.
5. Reavaliar a cada nova integração (WhatsApp, e-mail, push, app mobile) e antes de cada fase.
