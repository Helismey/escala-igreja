# ADR-015: Empacotamento Mobile Nativo com Capacitor e Armazenamento Seguro (Fase 3.5)

**Status:** Aceita | **Data:** 2026-10-01 | **Responsável:** Equipe Escala Igreja

## Contexto
O sistema Escala Igreja foi arquitetado desde o início para operação prioritária em celulares (Regras 04 e 09). Com o PWA já operando com suporte offline (`sw.js`) e notificações Web Push nativas (ADR-010 e ADR-013), a Fase 3.5 do roadmap prevê a capacidade de empacotamento nativo com o **Capacitor** para publicação nas lojas de aplicativos (Google Play Store e Apple App Store), caso haja demanda da liderança da igreja.

As diretrizes do projeto impõem:
- **Compartilhamento de Código (Regra 09)**: Não duplicar lógica de negócio nem criar frontends divergentes; manter uma única base Next.js/React reutilizável.
- **Segurança Mobile e LGPD (Regra 17)**: Proibido embutir segredos no binário do aplicativo; tokens de sessão devem ser persistidos em armazenamento seguro do sistema operacional (KeyStore no Android e Keychain no iOS); conexões estritamente via HTTPS (`cleartext: false`); deep links validados como entrada não confiável.

## Decisão
1. **Ecossistema Oficial do Capacitor:**
   - Adotar os pacotes oficiais sob licença MIT mantidos pela equipe Ionic:
     - `@capacitor/core` e `@capacitor/cli`
     - `@capacitor/android`
     - `@capacitor/preferences` (persistência segura de preferências e tokens de sessão)
     - `@capacitor/app` (escuta de ciclo de vida do app, deep links e botão Voltar nativo do Android)
2. **Configuração de Envelopamento (`capacitor.config.ts`):**
   - Identificador único da aplicação (`appId`): `br.org.escalaigreja.app`.
   - Nome público (`appName`): `Escala Igreja`.
   - Diretório web (`webDir`): `public`.
   - Modo de execução remoto/híbrido com HTTPS estrito (`cleartext: false`), permitindo carregamento contínuo dos Server Components e Server Actions com ponte nativa injetada.
3. **Autenticação e Sessão Segura (Regras 10 e 17):**
   - O aplicativo mobile utiliza o endpoint `/api/auth/token` para emitir o token JWT assinado HMAC-SHA256, gravando-o através de `@capacitor/preferences` com proteção de hardware do dispositivo.
   - Ao fazer logout, o aplicativo remove o token do KeyStore e emite o evento para limpeza do cache local do usuário.
4. **Tratamento de Deep Links e Botão Voltar:**
   - Registro de scheme `escalaigreja://` para links de confirmação e recuperação de senha. Todos os links são tratados como entrada externa e validados pelos schemas Zod existentes.
   - Listener de hardware back button no Android para retornar à tela anterior no Next.js (`window.history.back()`) em vez de encerrar o aplicativo.

## Consequências
- **Positivas:**
  - Suporte completo a distribuição nas lojas Google Play e Apple App Store sem necessidade de reescrever a interface em React Native ou Flutter.
  - Fechamento do último item em aberto no [`docs/security/checklist-pre-release.md`](../security/checklist-pre-release.md) relativo a segurança mobile.
  - Alinhamento total com as Regras 09 e 17 do projeto.
- **Ressalvas:**
  - A publicação real nas lojas requer contas de desenvolvedor (taxa única de $25 na Google Play e $99/ano no Apple Developer Program), a serem providenciadas pela igreja no momento de publicação.
