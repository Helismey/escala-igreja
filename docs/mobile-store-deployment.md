# Guia de Publicação Mobile nas Lojas (Google Play Store e Apple App Store)

Este manual operacional orienta a preparação, assinatura de segurança, geração de pacotes e publicação do aplicativo **Revezo** empacotado via **Capacitor** para as lojas de aplicativos da Google e da Apple.

---

## 📱 Dados de Identificação do Aplicativo

* **Identificador de Pacote (Bundle ID / Application ID):** `br.org.revezo.app`
* **Nome do Aplicativo:** `Revezo`
* **Esquema de Deep Linking (URL Scheme):** `revezo://`
* **Tecnologia:** Next.js 15 (React 19) + Capacitor 8
* **Permissões Nativas:**
  * Internet (`android.permission.INTERNET`)
  * Notificações Push (`android.permission.POST_NOTIFICATIONS` no Android 13+ / APNs no iOS)

---

## 🤖 1. Publicação no Google Play (Android)

### 1.1 Pré-requisitos
* Java Development Kit (JDK 17 ou 21).
* Android Studio com Android SDK instalado.
* Conta de Desenvolvedor no [Google Play Console](https://play.google.com/console) (taxa única de $25).

### 1.2 Geração da Keystore de Produção
No terminal da sua máquina segura (fora do repositório público), gere a chave privada de assinatura:

```bash
keytool -genkey -v -keystore revezo-release.keystore -alias revezo -keyalg RSA -keysize 2048 -validity 10000
```
> [!CAUTION]
> Guarde o arquivo `revezo-release.keystore` e as senhas em cofre seguro. **Nunca envie o arquivo `.keystore` para o Git**.

### 1.3 Configuração de Assinatura no Gradle
No arquivo `apps/web/android/app/build.gradle`, configure as variáveis de ambiente ou o arquivo `key.properties`:

```groovy
android {
    ...
    signingConfigs {
        release {
            storeFile file(System.getenv("KEYSTORE_FILE") ?: "revezo-release.keystore")
            storePassword System.getenv("KEYSTORE_PASSWORD")
            keyAlias System.getenv("KEY_ALIAS") ?: "revezo"
            keyPassword System.getenv("KEY_PASSWORD")
        }
    }
    buildTypes {
        release {
            signingConfig signingConfigs.release
            minifyEnabled false
            proguardFiles getDefaultProguardFile('proguard-android.txt'), 'proguard-rules.pro'
        }
    }
}
```

### 1.4 Geração do Pacote de Publicação (AAB - Android App Bundle)
1. Certifique-se de sincronizar o build web com o projeto nativo:
   ```bash
   pnpm --filter @revezo/web build
   pnpm --filter @revezo/web cap:sync
   ```
2. Gere o pacote otimizado para o Google Play:
   ```bash
   cd apps/web/android
   ./gradlew bundleRelease
   ```
   * O arquivo gerado estará em: `apps/web/android/app/build/outputs/bundle/release/app-release.aab`.

3. *(Opcional)* Para gerar APK de testes manuais em dispositivos:
   ```bash
   ./gradlew assembleRelease
   ```
   * O APK estará em: `apps/web/android/app/build/outputs/apk/release/app-release.apk`.

### 1.5 Checklist de Privacidade do Google Play (LGPD / Data Safety)
* **Coleta de Dados:** O app coleta Nome, E-mail, Telefone e Registros de Escala unicamente para a funcionalidade do serviço ministerial da igreja.
* **Compartilhamento com Terceiros:** Não compartilha dados pessoais com corretores de dados nem para redes de anúncios.
* **Criptografia em Trânsito:** Todo o tráfego utiliza HTTPS estrito (`cleartext: false`).
* **Direito de Exclusão:** O aplicativo dispõe de funcionalidade de exclusão voluntária de conta diretamente no painel do usuário (`/perfil`).

---

## 🍏 2. Publicação na Apple App Store (iOS)

### 2.1 Pré-requisitos
* Computador com macOS e Xcode 15+.
* Inscrição ativa no [Apple Developer Program](https://developer.apple.com/programs/) ($99/ano).

### 2.2 Abertura do Projeto no Xcode
A partir da raiz do monorepo, execute:
```bash
pnpm --filter @revezo/web build
pnpm --filter @revezo/web cap:sync
pnpm --filter @revezo/web cap:open:ios
```

### 2.3 Configuração de Signing & Capabilities no Xcode
1. Selecione o target `App` no navegador do projeto.
2. Acesse a aba **Signing & Capabilities**:
   * Marque **Automatically manage signing**.
   * Selecione a equipe da igreja (**Team**).
   * Confirme o **Bundle Identifier**: `br.org.revezo.app`.
3. Verifique as capacidades adicionadas:
   * **Push Notifications** (para recebimento de notificações remotas).
   * **Background Modes** > marque **Remote notifications**.
4. Na aba **Info** > **URL Types**, confirme o identificador `br.org.revezo.app` com o scheme `revezo`.

### 2.4 Geração do Archive e Submissão
1. No menu superior do Xcode, selecione o dispositivo de destino como **Any iOS Device (arm64)**.
2. Acesse o menu **Product** > **Archive**.
3. Ao concluir a compilação, a janela **Organizer** será aberta.
4. Clique em **Distribute App** > **App Store Connect** > **Upload**.
5. O binário será processado e disponibilizado para testes internos no **TestFlight** e subsequente envio para revisão da App Store.

### 2.5 Declaração de Privacidade da App Store (App Privacy Nutrition Labels)
* **Data Used to Track You:** None (Sem rastreamento).
* **Data Linked to You:**
  * Contact Info (Name, Email, Phone Number) — para autenticação e gestão de escalas.
  * User Content — notas e justificativas de substituição.
* **Data Not Linked to You:** Diagnostics (logs técnicos sem PII para monitoramento de estabilidade).

---

## 🔔 3. Configuração de Push Notifications em Nuvem (FCM & APNs)

1. **Android (Firebase Cloud Messaging):**
   * Crie o projeto no [Firebase Console](https://console.firebase.google.com).
   * Registre o aplicativo Android com pacote `br.org.revezo.app`.
   * Baixe o arquivo `google-services.json` e coloque-o em `apps/web/android/app/google-services.json`.
   * O build do Gradle detectará o arquivo automaticamente e ativará o plugin do Google Services.
2. **iOS (Apple Push Notification service):**
   * Gere uma chave de autenticação APNs (`.p8`) no Apple Developer Portal com o serviço de Push Notifications ativado.
   * Carregue a chave no console do Firebase (ou no seu despachante APNs de produção).

---

## 🛠️ 4. Comandos Úteis do Fluxo de Trabalho

| Ação | Comando |
|---|---|
| Compilar projeto web | `pnpm --filter @revezo/web build` |
| Sincronizar assets e plugins no Android e iOS | `pnpm --filter @revezo/web cap:sync` |
| Abrir projeto Android no Android Studio | `pnpm --filter @revezo/web cap:open:android` |
| Abrir projeto iOS no Xcode (macOS) | `pnpm --filter @revezo/web cap:open:ios` |
| Checagem de tipagem completa | `pnpm typecheck` |
| Testes unitários do canal mobile | `pnpm test apps/web/test/capacitor-push.test.ts` |
