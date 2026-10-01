# ADR-010: Arquitetura PWA Offline-First e Preparação para Capacitor

## Status
Aceito (30/09/2026)

## Contexto
O Escala Igreja é primariamente utilizado pelos membros e voluntários em celulares (Rule 09). Muitos voluntários consultam sua escala aos domingos na chegada à igreja ou em áreas com sinal de internet fraco ou intermitente. Além disso, no futuro, pode haver demanda para distribuição via lojas de aplicativos (Google Play e Apple App Store) através de envelopamento com Capacitor.

## Decisão
1. **PWA Completo com Service Worker Seguro**:
   - Implementar Service Worker customizado (`sw.js`) com estratégia *Network First com Cache Fallback* para páginas de visualização do voluntário (`/minha-escala`, `/perfil`).
   - Respeitar a **Regra 17 (Segurança Mobile e LGPD)**: jamais armazenar dados offline de terceiros (membros de outros departamentos). O cache local guarda estritamente a visão pessoal do membro autenticado.
   - Fornecer página de fallback acolhedora em pt-BR (`/offline`) quando não houver conexão e o recurso não estiver no cache.
   - Limpeza do cache do usuário orientada por evento no momento do logout.
2. **Web Push & Eventos de Notificação**:
   - Estruturar handlers no Service Worker para eventos de `push` e `notificationclick`, direcionando o toque para a rota `/minha-escala`.
3. **Autenticação Desacoplada de Navegador (Mobile Ready)**:
   - Manter autenticação web transparente via cookies HttpOnly/SameSite/Secure para o PWA no navegador.
   - Adicionar o endpoint `/api/auth/token` que emite o token assinado HMAC-SHA256 (`SessionData`) no corpo JSON, permitindo que clientes Capacitor/mobile persistam a sessão no Keychain/Keystore do dispositivo.
4. **Instalação Suave**:
   - Banner responsivo e discreto que respeita o fluxo nativo `beforeinstallprompt` no Android/Chrome e exibe instruções sucintas do botão de compartilhamento no iOS Safari.

## Consequências
- Os membros podem verificar seus horários e funções de culto mesmo sem conexão de dados ativa no templo.
- Transição futura para Capacitor viável sem refatoração de backend nem quebra de contratos de API.
- Custo zero mantido sem dependência de serviços pagos de empacotamento ou push proprietário.
