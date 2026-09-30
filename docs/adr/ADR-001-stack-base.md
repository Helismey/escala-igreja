# ADR-001: Stack base (Next.js + PostgreSQL + Prisma, PWA)

**Status:** Proposta | **Data:** 2026-09-29

## Contexto
Sistema web/mobile de baixo custo, uma base de código para celular e desktop, mantido por poucas pessoas.

## Decisão
Next.js + TypeScript + Tailwind, PostgreSQL gratuito com Prisma, entregue como PWA.

## Opções
| Opção | Complexidade | Custo | Observação |
|---|---|---|---|
| Next.js PWA | Média | Baixo/zero | Uma base de código, instalável, push nativo |
| App nativo (React Native/Flutter) | Alta | Publicação em lojas | Duas bases ou mais esforço |
| Laravel/Django + templates | Média | Baixo | Bom, mas foge da stack já dominada |

## Consequências
Fácil: uma entrega para todos os dispositivos. Difícil: push em iOS exige app instalado na tela inicial. Revisar: app nativo só se houver demanda real.

## Ações
Criar projeto, configurar Prisma, PWA manifest, CI.
