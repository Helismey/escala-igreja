# ADR-003: WhatsApp por adaptador plugável

**Status:** Proposta | **Data:** 2026-09-29

## Contexto
Não existe envio de WhatsApp gratuito e oficial. O usuário quer serviço gratuito; o número dedicado será providenciado.

## Opções
| Opção | Custo | Risco |
|---|---|---|
| Evolution API/Baileys (não oficial, self-hosted) | Servidor pequeno | Possível bloqueio do número; viola termos do WhatsApp |
| API oficial da Meta | Pago por conversa; exige templates aprovados | Baixo |
| Apenas e-mail e push | Zero | Menor alcance |

## Decisão
Implementar `NotificationChannel` com adaptador não oficial (número dedicado) e manter e-mail e push como canais gratuitos de fallback. Estrutura pronta para trocar pela API oficial.

## Consequências
Fácil: trocar de canal. Difícil: manter servidor do adaptador. Mitigar: envio com pausas, volume baixo, número dedicado e fallback automático. Confirmar preços e regras atuais da API oficial antes de decidir a migração.
