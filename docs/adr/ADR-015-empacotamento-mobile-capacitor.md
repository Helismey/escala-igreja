# ADR-015: Empacotamento Mobile Nativo com Capacitor e Armazenamento Seguro (Fase 3.5)

**Status:** Aceita | **Data:** 2026-10-01 | **Responsável:** Equipe Revezo

## Contexto
O sistema Revezo foi arquitetado desde o início para operação prioritária em celulares (Regras 04 e 09). Com o PWA já operando com suporte offline (`sw.js`) e notificações Web Push nativas (ADR-010 e ADR-013), a Fase 3.5 do roadmap prevê a capacidade de empacotamento nativo com o **Capacitor** para publicação nas lojas de aplicativos (Google Play Store e Apple App Store), caso haja demanda da liderança da igreja.

As diretrizes do projeto impõem:
- **Compartilhamento de Código (Regra 09)**: Não duplicar lógica de negócio nem criar frontends divergentes; manter uma única base Next.js/React reutilizável.
- **Segurança Mobile e LGPD (Regra 17)**: Proibido embutir segredos no binário do aplicativo; tokens de sessão devem ser persistidos em armazenamento seguro do sistema operacional (KeyStore no Android e Keychain no iOS); conexões estritamente via HTTPS (`cleartext: false`); deep links validados como entrada não confiável.

## Decisão
1. **Ecossistema Oficial do Capacitor:**
   - Adotar os pacotes oficiais sob licença MIT mantidos pela equipe Ionic:
     - `@capacitor/core` e `@capacitor/cli`
     - `@capacitor/android` e `@capacitor/ios` (plataformas nativas sincronizadas)
     - `@capacitor/preferences` (persistência segura de preferências e tokens de sessão)
     - `@capacitor/app` (escuta de ciclo de vida do app, deep links e botão Voltar nativo do Android)
     - `@capacitor/push-notifications` (recebimento de notificações nativas FCM e APNs)
2. **Configuração de Envelopamento (`capacitor.config.ts`):**
   - Identificador único da aplicação (`appId`): `br.org.revezo.app`.
   - Nome público (`appName`): `Revezo`.
   - Diretório web (`webDir`): `public`.
   - Modo de execução remoto/híbrido com HTTPS estrito (`cleartext: false`, `androidScheme: 'https'`, `iosScheme: 'https'`), permitindo carregamento contínuo dos Server Components e Server Actions com ponte nativa injetada.
3. **Autenticação e Sessão Segura (Regras 10 e 17):**
   - O aplicativo mobile utiliza o endpoint `/api/auth/token` para emitir o token JWT assinado HMAC-SHA256, gravando-o através de `@capacitor/preferences` com proteção de hardware do dispositivo (KeyStore/Keychain).
   - O `getSession` no servidor aceita tanto o cookie seguro de sessão quanto o cabeçalho `Authorization: Bearer <token>` (Regra 09).
   - Ao fazer logout, o aplicativo remove o token do KeyStore/Keychain e limpa o estado.
4. **Push Notifications Nativas e Chaveamento Transparente (Regra 09):**
   - No navegador e PWA desktop, o sistema utiliza Web Push VAPID via Service Worker (`sw.js`).
   - No aplicativo nativo instalado, o componente `PushNotificationManager` detecta o container Capacitor e orquestra `@capacitor/push-notifications` (FCM/APNs), cadastrando o token de dispositivo via `/api/push/subscribe`.
5. **Tratamento de Deep Links e Botão Voltar:**
   - Registro de scheme `revezo://` para links de confirmação e recuperação de senha. Todos os links são tratados como entrada externa e validados pelos schemas Zod existentes.
   - Listener de hardware back button no Android para retornar à tela anterior no Next.js (`window.history.back()`) em vez de encerrar o aplicativo.
6. **Publicação nas Lojas:**
   - Procedimentos detalhados de geração de Keystore, build de release (`.aab` e `.ipa`) e declaração de privacidade documentados em `docs/mobile-store-deployment.md`.

## Consequências
- **Positivas:**
  - Suporte completo a distribuição nas lojas Google Play e Apple App Store sem necessidade de reescrever a interface em React Native ou Flutter.
  - Fechamento do último item em aberto no [`docs/security/checklist-pre-release.md`](../security/checklist-pre-release.md) relativo a segurança mobile.
  - Alinhamento total com as Regras 09 e 17 do projeto.
- **Ressalvas:**
  - A publicação real nas lojas requer contas de desenvolvedor (taxa única de $25 na Google Play e $99/ano no Apple Developer Program), a serem providenciadas pela igreja no momento de publicação.
