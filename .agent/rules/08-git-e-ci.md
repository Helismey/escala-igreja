# Git e CI (sempre ativa)

- Conventional Commits. PRs pequenos, um assunto por PR.
- CI obrigatório antes de merge: lint, typecheck, testes, auditoria de dependências e varredura de segredos (ver rule 15).
- Branch principal protegida: sem push direto, revisão obrigatória, histórico linear.
- Nunca commitar `.env`, dumps de banco, planilhas de membros ou fotos reais.
