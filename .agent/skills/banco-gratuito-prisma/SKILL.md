---
name: banco-gratuito-prisma
description: Use ao modelar tabelas, escrever migrations, consultas Prisma e lidar com limites de banco gratuito.
---

# Banco gratuito com Prisma

- PostgreSQL em plano gratuito (Neon ou Supabase). Usar a URL com pool de conexões para o app e a URL direta para migrations.
- Índices: Assignment(userId, startsAt), Assignment(slotId), ProgramSlot(programId, startsAt), DepartmentMember(departmentId), NotificationLog(assignmentId, kind).
- Evitar N+1 com `include`/`select`; paginar listas; buscar só colunas necessárias.
- Restrição de integridade: única (slotId, userId) em Assignment ativo; a regra de sobreposição é validada no domínio dentro de uma transação, com bloqueio para evitar corrida entre duas atribuições simultâneas.
- Free tiers podem pausar por inatividade e ter limites de armazenamento: o job diário de lembretes serve também como "ping"; fotos vão para armazenamento de arquivos, não para o banco.
- Backup periódico exportável (pg_dump agendado) e teste de restauração.
