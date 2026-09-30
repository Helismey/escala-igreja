# Datas e fuso (sempre ativa)

- Banco em UTC. Exibição e agendamento em America/Sao_Paulo. Uma única biblioteca de datas no projeto.
- "Dia" da escala (limite de 2 por dia) = dia civil em America/Sao_Paulo, nunca UTC.
- Testar virada de dia, horário de verão histórico e slots que cruzam meia-noite.
- Horários encostados (fim de um = início de outro) não conflitam.
