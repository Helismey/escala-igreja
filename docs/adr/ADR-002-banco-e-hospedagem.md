# ADR-002: Banco e hospedagem gratuitos

**Status:** Proposta | **Data:** 2026-09-29

## Contexto
Meta de custo zero ou muito baixo sem prejudicar desempenho.

## Decisão
Banco: PostgreSQL gratuito (Neon ou Supabase) acessado só via Prisma. Hospedagem: Vercel ou similar em plano gratuito, com cron para os lembretes.

## Riscos e pontos a confirmar antes de publicar
- Limites de armazenamento, conexões e pausa por inatividade dos planos gratuitos.
- Termos do plano gratuito da hospedagem quanto a uso não comercial (igreja costuma ser sem fins lucrativos, mas confirmar).
- Frequência mínima permitida do cron gratuito (o design exige apenas 1 execução por dia).

## Plano de saída
Prisma + Postgres padrão permitem migrar para outro provedor ou VPS própria trocando a URL e o deploy. Manter backup periódico com pg_dump.

## Consequências
Custo mensal zero no início. Revisar limites a cada trimestre.
