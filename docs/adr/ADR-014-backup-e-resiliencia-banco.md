# ADR-014: Backup Criptografado Automatizado e Prevenção de Hibernação de Banco Gratuito

**Status:** Aceita | **Data:** 2026-10-01 | **Responsável:** Equipe Escala Igreja

## Contexto
O projeto Escala Igreja prioriza custo zero ou muito baixo (Regra 01), utilizando planos gratuitos de PostgreSQL (como Neon, Supabase ou Render). 

Esses planos possuem particularidades operacionais críticas mapeadas no item 2 da dívida técnica (`docs/tech-debt.md`):
1. **Hibernação por inatividade**: Provedores gratuitos suspendem instâncias que ficam sem conexões ativas por alguns dias (ex.: entre segunda e quinta-feira, quando a igreja não tem atividades e escalas montadas). O primeiro acesso de um voluntário pode sofrer atraso de até 60 segundos ou erro de timeout (cold start).
2. **Risco de perda de dados e conformidade LGPD (Regras 13 e 16)**: Backups devem ser periódicos, automatizados, criptografados em repouso e com testes comprovados de restauração. Dumps de produção jamais podem ficar desprotegidos ou conter dados acessíveis em texto claro fora do ambiente seguro.

## Decisão
1. **Heartbeat / Ping Anti-Hibernação:**
   - Criação da rota `/api/cron/keepalive` e padronização de `/api/v1/health`.
   - O endpoint executa uma consulta ultraleve de checagem (`SELECT 1`) no PostgreSQL através do Prisma.
   - O job agendado no GitHub Actions executa chamadas periódicas à aplicação com o segredo `CRON_SECRET`, mantendo a instância acordada e pronta para o uso no fim de semana.
2. **Rotina Agendada de Backup (`database-backup.yml`):**
   - Execução diária automatizada via GitHub Actions com `cron: '0 3 * * *'` (00:00 BRT) e disparo manual (`workflow_dispatch`).
   - Uso obrigatório de `DIRECT_URL` (conexão direta da porta 5432, contornando o pooler de transações para suportar o `pg_dump`).
   - Geração do dump com parâmetros de integridade: `--clean --if-exists --no-owner --no-privileges`.
   - Compactação (`gzip`) seguida de **criptografia simétrica AES-256-CBC via OpenSSL com derivação de chave PBKDF2 e 100.000 iterações**, utilizando o segredo seguro `BACKUP_ENCRYPTION_KEY`.
   - Armazenamento do arquivo criptografado com carimbo de data/hora nos artefatos do GitHub com política de retenção definida (30 dias).
3. **Procedimento e Scripts de Teste de Restauração:**
   - Disponibilização dos scripts `scripts/backup/test-restore.sh` e `scripts/backup/test-restore.ps1`.
   - Permite que o administrador teste a descriptografia da chave e verifique a integridade sintática e de tabelas do arquivo de dump sem alterar o banco de produção.

## Consequências
- **Positivas:**
  - Resolução da dívida técnica nº 2 de infraestrutura.
  - O banco não hiberna durante a semana, garantindo carregamento instantâneo no domingo de manhã.
  - Dados históricos da igreja e voluntários preservados contra desastres ou incidentes, com criptografia forte ponta a ponta.
- **Ressalvas:**
  - O repositório deve ter os segredos `DIRECT_URL`, `CRON_SECRET` e `BACKUP_ENCRYPTION_KEY` configurados nos Secrets do GitHub Actions.
