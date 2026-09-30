# Segurança: segredos e configuração (sempre ativa)

- Segredos apenas em variáveis de ambiente do provedor (Vercel, etc.). `.env*` no `.gitignore`; só `.env.example` com placeholders é versionado.
- **Nunca** colocar segredo no código, em teste, em log, em `NEXT_PUBLIC_*` ou no bundle do app mobile. Só o que é público leva o prefixo `NEXT_PUBLIC_`.
- Chaves separadas por ambiente (dev, preview, produção). Rotacionar quando alguém sai da equipe ou houver suspeita.
- Segredos do projeto: `AUTH_SECRET`, `DATABASE_URL`, `DIRECT_URL`, `CRON_SECRET`, `VAPID_PRIVATE_KEY`, chaves de e-mail e WhatsApp, chave de criptografia de campos.
- Rotas de cron e webhooks exigem segredo/assinatura e falham fechadas quando ausente.
- Configuração segura por padrão em produção: `NODE_ENV=production`, debug desligado, mensagens de erro genéricas, CORS restrito.
- Pre-commit e CI executam varredura de segredos (ver rule 15). Achou segredo vazado: considerar comprometido, rotacionar e só depois limpar histórico.
