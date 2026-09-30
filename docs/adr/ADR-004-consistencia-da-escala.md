# ADR-004: Consistência de conflito e limite diário

**Status:** Proposta | **Data:** 2026-09-29

## Contexto
Dois gestores podem escalar a mesma pessoa ao mesmo tempo, quebrando as regras de sobreposição e do limite de 2 por dia.

## Decisão
Validar elegibilidade no domínio e gravar dentro de transação com bloqueio por usuário (advisory lock por userId ou SELECT FOR UPDATE), repetindo a checagem dentro da transação.

## Consequências
Garante as regras invioláveis mesmo com concorrência, com custo pequeno de latência. Revisar se a carga aumentar muito.
