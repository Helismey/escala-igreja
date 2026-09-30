---
name: motor-de-escala
description: Use ao implementar ou alterar geração de escala, detecção de conflito, limite diário, preferência de dias, slot aberto ou substituição automática.
---

# Motor de escala

Código em `packages/domain/src/scheduling/`. Funções puras, sem acesso a banco.

## Elegibilidade de um candidato para um slot
Um usuário é elegível se TODAS as condições forem verdadeiras:
1. Status ACTIVE e membro do departamento do slot, com a função exigida.
2. Sem indisponibilidade cobrindo o horário do slot.
3. Dia do slot dentro das preferências (ou sem preferência cadastrada).
4. Sem conflito: nenhum Assignment ativo dele com `inicioA < fimB && inicioB < fimA` (qualquer departamento).
5. Menos de 2 Assignments ativos no mesmo dia (fuso America/Sao_Paulo).

## Escolha do melhor candidato
Ordenar por: menor número de escalas nos últimos 60 dias, depois maior tempo desde a última escala, depois id (estável). Escolher o primeiro.

## Substituição ao desmarcar
1. Marcar o Assignment como DECLINED/SUBSTITUTED e registrar o motivo.
2. Rodar elegibilidade excluindo quem já recusou esse slot.
3. Se houver candidato: criar Assignment PENDING, notificar substituto e gestor.
4. Se não houver: manter slot ABERTO e alertar o gestor com o motivo (limite diário, indisponibilidade, sem membros na função).

## Casos de teste obrigatórios
- Sobreposição parcial e total; horários encostados (fim = início) NÃO conflitam.
- Terceira escala no mesmo dia é bloqueada.
- Usuário em dois departamentos não pode ser escalado em horários sobrepostos.
- Desmarcar sem substituto deixa slot aberto.
- Clonar programa regenera escala respeitando as mesmas regras.
