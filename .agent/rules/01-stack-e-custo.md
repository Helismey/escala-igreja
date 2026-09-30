# Stack e custo (sempre ativa)

- Linguagem: TypeScript estrito. Framework: Next.js (App Router). Estilo: Tailwind. ORM: Prisma. Banco: PostgreSQL em plano gratuito (Neon ou Supabase).
- Não adicionar serviço pago ou dependência pesada sem ADR aprovado em `docs/adr/`.
- Preferir soluções self-contained: Web Push (VAPID) em vez de serviço de push pago; e-mail via tier gratuito; jobs via cron gratuito (Vercel Cron ou GitHub Actions).
- Desempenho: consultas paginadas, índices em (userId, startsAt), (departmentId), (programId); evitar N+1 (usar include/select do Prisma); Server Components por padrão; cache com revalidate onde fizer sentido.
- Free tiers têm limites e podem pausar por inatividade: isolar o acesso ao banco e aos canais de envio atrás de interfaces, para trocar de provedor sem reescrever.
- Antes de citar limites de plano gratuito em documentação, conferir os valores atuais na fonte oficial.
