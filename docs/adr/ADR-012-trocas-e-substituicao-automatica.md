# ADR-012 — Ciclo de Trocas de Escala (SwapRequest) e Substituição Automática Atômica

## Status
Aceito

## Contexto
No voluntariado eclesiástico, imprevistos de última hora e necessidades de permuta entre membros de ministério são frequentes. Duas necessidades operacionais críticas emergiram:
1. **Substituição automática ao desmarcar:** Quando um voluntário desmarca sua escala (seja pelo app ou pelo link de uso único), a vaga não deve ficar órfã se houver outros membros qualificados disponíveis. Contudo, a substituição não pode sobrecarregar sempre os mesmos voluntários nem violar regras de conflito de horários ou o teto diário de 2 escalas.
2. **Trocas entre voluntários (`SwapRequest`):** Membros precisam solicitar troca diretamente a um colega de ministério ou abrir o pedido para toda a equipe. No entanto, por razões de ordem e liderança pastoral, **nenhuma troca pode entrar em vigor sem a aprovação explícita do gestor do departamento**.

## Decisão
1. **Modelo `SwapRequest` com Máquina de Estados:**
   - Estados: `PENDING_TARGET` → `PENDING_MANAGER` → `APPROVED` (ou `REJECTED` / `CANCELLED`).
   - Pedidos direcionados só podem ser aceitos pelo voluntário alvo indicado (`targetUserId`); pedidos sem alvo podem ser assumidos por qualquer membro qualificado da equipe.
   - Apenas gestores do departamento da escala (ou `ADMIN_MASTER`) têm permissão para aprovar a troca.
2. **Transferência Atômica de Titularidade:**
   - A aprovação da troca executa dentro de `prisma.$transaction`. Atualiza a titularidade do slot de origem para o novo voluntário (`status: 'CONFIRMED'`) e, se for permuta mútua (`targetAssignmentId`), transfere simultaneamente a escala de volta para o solicitante.
3. **Motor de Substituição Automática:**
   - Respeita a `FeatureFlag` (`auto_substitution`).
   - Exclui quem já desmarcou o slot;
   - Aplica os critérios de elegibilidade: status `ACTIVE`, pertencimento ao departamento, posse da função exigida, sem períodos de indisponibilidade, compatibilidade com dias preferidos, sem conflitos de horário e sem exceder 2 escalas no mesmo dia;
   - Ordena pelo motor de ranking oficial (menor número de escalas nos últimos 60 dias, depois maior tempo desde a última escala);
   - Se encontrar candidato: cria novo `Assignment` vinculado (`replacedById`) e registra auditoria `AUTO_SUBSTITUTION_ASSIGNED`;
   - Se não encontrar: gera diagnóstico detalhado em pt-BR e registra auditoria `AUTO_SUBSTITUTION_NO_CANDIDATE`.
4. **Detecção e Alerta de Sobrecarga:**
   - Identifica se o voluntário serviu por $\ge 3$ fins de semana consecutivos ou possui $> 4$ escalas nos últimos 30 dias.
   - Exibe badges visuais nas telas de montagem de escalas e orientações suaves de descanso ao voluntário em `/minha-escala`.

## Consequências
- Zero risco de corridas e escalas fantasmas durante permutas.
- Preservação da integridade histórica e trilha completa de auditoria em `AuditLog`.
- Cuidado pastoral ativo com voluntários, prevenindo fadiga ministerial.
