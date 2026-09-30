---
name: testes-de-concorrencia
description: Use ao testar atribuições simultâneas, corridas entre gestores e substituições ao mesmo tempo.
---

# Testes de concorrência

Cenários obrigatórios (ADR-004):
- Dois gestores escalam a mesma pessoa em horários sobrepostos ao mesmo tempo: só um sucede.
- Duas atribuições simultâneas levariam a 3 escalas no dia: a terceira falha.
- Duas desmarcações causam a mesma busca de substituto: um substituto não é escolhido duas vezes.
- Cron de lembretes rodando duas vezes não duplica envios (idempotência).
Técnica: transações com bloqueio por usuário (advisory lock ou SELECT FOR UPDATE), repetindo a checagem dentro da transação; testes que disparam N chamadas em paralelo.
