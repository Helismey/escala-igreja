# Resposta a incidentes

## Severidade
| Nível | Descrição | Resposta |
|---|---|---|
| P1 | Vazamento ativo de dados de membros ou invasão de admin | Imediata |
| P2 | Comprometimento confirmado e contido | Até 1 hora |
| P3 | Suspeita em investigação | Até 4 horas |
| P4 | Atividade suspeita de baixo impacto | Até 24 horas |

## Fases
1. **Detectar e classificar**: registrar horário, origem do alerta, severidade e quem lidera.
2. **Conter**: revogar sessões e refresh tokens; desativar conta ou canal comprometido; rotacionar segredos expostos (banco, `AUTH_SECRET`, chaves de e-mail/WhatsApp/VAPID); pausar cron de envio; bloquear IPs abusivos.
3. **Preservar evidências**: exportar logs e `AuditLog` para local seguro antes de limpar qualquer coisa.
4. **Erradicar**: causa raiz, correção, teste que reproduz, revisão de outras ocorrências.
5. **Recuperar**: restaurar de backup limpo se necessário; monitoramento reforçado.
6. **Comunicar**: responsável da igreja de imediato; titulares afetados e ANPD conforme a LGPD, no prazo vigente (conferir a regulamentação atual da ANPD antes de decidir; este documento não substitui orientação jurídica).
7. **Pós-incidente**: relatório com linha do tempo, causa raiz, impacto, ações e atualização das regras.

## Cenários específicos
- **Segredo vazado no Git**: considerar comprometido, rotacionar, só depois limpar histórico.
- **Número de WhatsApp bloqueado**: acionar fallback e-mail/push, avaliar API oficial.
- **Conta admin invadida**: revogar tudo, forçar troca de senha e MFA, auditar ações recentes.
- **Agente executou algo suspeito**: parar, listar o que foi lido/executado, revogar credenciais que possa ter tocado, seguir as fases acima.

## Modelo de relatório
Resumo | Linha do tempo | Dados e titulares afetados | Causa raiz | Ações de contenção e correção | Comunicações feitas | Lições aprendidas | Responsáveis e prazos
