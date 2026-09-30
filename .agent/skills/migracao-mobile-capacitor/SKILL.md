---
name: migracao-mobile-capacitor
description: Use ao empacotar o PWA como app Android/iOS com Capacitor e publicar nas lojas.
---

# Migração para mobile com Capacitor

1. Confirmar que a mudança respeita a rule 09 (domínio compartilhado, API com token, sem dependência de desktop).
2. Adicionar Capacitor ao `apps/web` (ou criar `apps/mobile`) apontando para o build do site ou para assets locais.
3. Plugins: push nativo, armazenamento seguro, biometria (opcional), compartilhamento.
4. Ícones, splash, nome, identificador do app; permissões mínimas.
5. Autenticação por token (rule 10) e regras da skill seguranca-mobile-capacitor.
6. Gerar builds, testar em dispositivos reais, publicar (contas de desenvolvedor das lojas têm custo; conferir valores atuais antes de decidir).
7. Registrar decisão em ADR (manter só PWA x Capacitor x nativo).
