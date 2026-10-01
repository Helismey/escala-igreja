---
name: testes-propriedades-motor
description: Use ao testar o motor de escala (conflito, limite diário, preferência, substituição) com testes de propriedade (fast-check).
---

# Testes de propriedade do motor de escala

Local: `packages/domain/src/scheduling/__tests__/`. Biblioteca: fast-check com Vitest.

## Geradores
Criar geradores de: membros (funções, preferências de dias, indisponibilidades), slots (horários que podem sobrepor, cruzar meia-noite, cair no mesmo dia) e escalas já existentes. Semente fixa registrada no relatório para reproduzir falhas.

## Propriedades obrigatórias
1. **Sem sobreposição**: após qualquer sequência de atribuições e substituições, nenhum usuário tem dois Assignments ativos com horários sobrepostos (`inicioA < fimB && inicioB < fimA`).
2. **Limite diário**: ninguém passa de 2 Assignments ativos no mesmo dia civil (America/Sao_Paulo).
3. **Indisponibilidade e preferência**: ninguém é escalado fora das preferências ou dentro de período indisponível.
4. **Elegibilidade**: só quem pertence ao departamento e tem a função exigida.
5. **Substituição**: o substituto nunca é quem recusou aquele slot, nunca causa violação das propriedades 1 a 4 e, sem candidato, o slot fica ABERTO.
6. **Determinismo**: mesma entrada gera a mesma escala (desempate estável).
7. **Idempotência**: recalcular sem mudanças não altera a escala.
8. **Horários encostados** (fim = início) não conflitam.

## Cuidados
- Também manter testes de exemplo para bordas conhecidas (documentam o comportamento).
- Quando a propriedade falhar, guardar o contraexemplo reduzido como teste fixo.
