# Contexto do projeto (sempre ativa)

- Produto: escalas de departamentos de uma igreja (referência: módulo Escalas do Ministrary).
- Perfis: ADMIN_MASTER, GESTOR (por departamento), MEMBRO. Um usuário pode estar em vários departamentos, com papel diferente em cada um.
- Idioma: interface, mensagens e erros SOMENTE em português do Brasil. Código, nomes de variáveis e commits em inglês.
- Fuso: armazenar em UTC; exibir e agendar em America/Sao_Paulo.
- Telefones: normalizar para E.164 (+55...).
- Regras de negócio invioláveis:
  1. Nenhum usuário com dois Assignments de horários sobrepostos (intervalo semiaberto: inicioA < fimB && inicioB < fimA), em qualquer departamento.
  2. Máximo de 2 escalas por usuário por dia, mesmo com poucos voluntários. Se impedir preencher, deixar o slot ABERTO e alertar o gestor.
  3. Respeitar preferência de dias; desempate por menor carga recente.
  4. Ao desmarcar: atribuir substituto elegível automaticamente e avisar substituto e gestor.
  5. Lembretes 7, 2 e 1 dia antes, só para escalados ativos.
  6. Cadastro por autocadastro fica PENDENTE até aprovação.
