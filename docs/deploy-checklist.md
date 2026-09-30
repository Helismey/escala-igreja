# Checklist de deploy

**Data:** ____ | **Responsável:** ____ | **Versão:** ____

## Pré-deploy
- [ ] CI verde (lint, typecheck, testes do motor de escala)
- [ ] Código revisado (/revisar)
- [ ] Sem bug crítico conhecido
- [ ] Migrations testadas em cópia do banco
- [ ] Backup recente do banco (pg_dump)
- [ ] Variáveis de ambiente conferidas em relação a `.env.example`
- [ ] Plano de rollback escrito
- [ ] Limites atuais dos planos gratuitos conferidos

## Deploy
- [ ] Preview e smoke tests: login, cadastro pendente, criar programa, escalar, tentar conflito, desmarcar e substituir
- [ ] Teste de envio em número de teste (WhatsApp, e-mail, push)
- [ ] Publicar em produção
- [ ] Monitorar erros e latência por 15 minutos

## Pós-deploy
- [ ] Cron de lembretes executou e não duplicou envios
- [ ] Atualizar changelog
- [ ] Avisar gestores sobre mudanças visíveis

## Gatilhos de rollback
- Login falhando ou erro 5xx acima de 2%
- Escala criada violando conflito ou limite de 2 por dia
- Lembretes duplicados ou não enviados
- Tela principal acima de 4 s em celular
