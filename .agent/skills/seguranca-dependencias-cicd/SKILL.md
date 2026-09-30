---
name: seguranca-dependencias-cicd
description: Use ao adicionar dependências, configurar CI, Dependabot, varredura de segredos, proteção de branch e deploy.
---

# Dependências e CI/CD seguros

Aplicar a rule 15.

- Antes de instalar: nome exato, publicador, downloads, manutenção, licença, scripts de instalação.
- CI (`.github/workflows/ci.yml` e `security.yml`): lint, typecheck, testes, `pnpm audit --audit-level=high`, gitleaks, CodeQL, Dependabot semanal.
- Versões das ações do GitHub: confirmar as atuais e fixar (idealmente por SHA).
- Branch protegida: PR obrigatório, CI verde, sem force-push.
- Deploy: só da branch principal; segredos com escopo mínimo; previews sem dados reais.
- Rotina: revisar alertas do Dependabot toda semana e registrar exceções em `docs/tech-debt.md`.
