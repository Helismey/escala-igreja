---
name: feature-flags-simples
description: Use para ligar/desligar recursos (WhatsApp, substituição automática, SMS) sem novo deploy.
---

# Feature flags simples

- Tabela `FeatureFlag` (chave, ligado, atualizado por) ou variáveis de ambiente; leitura com cache curto.
- Flags iniciais: `whatsapp_enabled`, `auto_substitution`, `sms_enabled`, `signup_open`.
- Somente ADMIN altera, com registro em `AuditLog`. Padrão seguro: desligado se a flag não existir.
- Remover flags antigas (dívida técnica).
