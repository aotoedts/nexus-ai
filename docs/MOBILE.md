# App Mobile — Nexus AI

O Nexus AI tem **dois caminhos** para virar um app no celular, e voce pode
usar os dois ao mesmo tempo:

1. **PWA** (Progressive Web App) — funciona hoje, sem instalar nada alem
   do que ja existe no projeto. Zero ferramentas nativas.
2. **App nativo** via **Capacitor** — gera um `.apk` Android real (e um
   projeto iOS), instalavel fora da Play Store, sem precisar reescrever
   nenhuma linha do React que ja existe.

Dado que voce edita pelo Acode no Android e so tem acesso a computador
ocasionalmente, o fluxo recomendado abaixo usa o **GitHub Actions** para
fazer o build do APK na nuvem — o mesmo tipo de automacao que voce ja usa
para o deploy no Render, so que aqui o "deploy" gera um arquivo `.apk`
para baixar.

---

## Caminho 1 — PWA (instalar agora, sem build nenhum)

Ja esta tudo pronto no projeto: `frontend/public/manifest.webmanifest`,
`frontend/public/sw.js` (service worker) e os icones em
`frontend/public/icons/`.

1. Publique o frontend normalmente (Render, Vercel, Netlify, etc. —
   precisa ser servido via **HTTPS**, exigido para service workers).
2. No celular, abra o site publicado no Chrome (Android) ou Safari (iOS).
3. **Android/Chrome**: vai aparecer um banner "Instalar Nexus AI" (o
   componente `InstallAppBanner.tsx` cuida disso), ou use o menu ⋮ >
   "Adicionar a tela inicial".
4. **iOS/Safari**: toque em Compartilhar (□↑) > "Adicionar a Tela de
   Inicio". O iOS nao dispara o banner automatico, mas o resultado final
   e o mesmo: um icone que abre o app em tela cheia, sem a barra do
   navegador.

Isso ja entrega experiencia de "app" (icone proprio, tela cheia, splash),
com o app shell em cache para abrir rapido mesmo com conexao ruim. As
chamadas de API e o WebSocket nunca sao cacheados — sempre buscam dados
atuais.

---

## Caminho 2 — App nativo Android (.apk) via Capacitor

### O que ja esta pronto no projeto
- `frontend/capacitor.config.ts` — configuracao do app nativo.
- Dependencias do Capacitor ja declaradas em `frontend/package.json`.
- `frontend/src/native.ts` — ajustes de status bar/splash quando roda
  dentro do app nativo (sem efeito nenhum no navegador/PWA).
- `.github/workflows/build-android.yml` — builda o `.apk` automaticamente.

### Passo 1 — apontar o app para o backend publicado

Apps nativos **nao enxergam `localhost` do seu computador**. Antes de
gerar o app, o backend precisa estar publicado (ex: Render) e acessivel
via HTTPS/WSS.

No GitHub do repositorio, va em **Settings > Secrets and variables >
Actions > Variables** e crie:

```
VITE_API_URL = https://sua-api-nexus.onrender.com/api/v1
VITE_WS_URL  = wss://sua-api-nexus.onrender.com/api/v1/ws
```

(Isso e usado pelo workflow `build-android.yml`. Para builds locais, use
`frontend/.env.production.example` como base para um `.env.production`.)

### Passo 2 — liberar a origem do app no CORS do backend

No `.env` do backend (producao), garanta que `CORS_ORIGIN` inclua a
origem usada pela WebView do Capacitor:

```
CORS_ORIGIN=https://seu-frontend-web.com,https://localhost
```

(`https://localhost` e a origem padrao da WebView Android/iOS quando
`androidScheme`/`iosScheme` sao `'https'`, como configurado em
`capacitor.config.ts`.)

### Passo 3 — gerar o APK automaticamente (sem Android Studio)

Basta dar `git push` para a branch `main` (mudando algo em `frontend/`)
ou disparar manualmente:

1. No GitHub, aba **Actions** > workflow **"Build Android APK"** >
   **Run workflow**.
2. Aguarde o build terminar (alguns minutos).
3. Baixe o artefato **`nexus-ai-android-debug`** — dentro dele esta o
   `app-debug.apk`.
4. Transfira o `.apk` para o celular (Google Drive, Telegram para si
   mesmo, etc.) e instale (o Android vai pedir para permitir "instalar
   de fontes desconhecidas" na primeira vez).

Esse APK e assinado com uma chave de debug automatica — perfeito para
testar no seu proprio aparelho. Para publicar na Play Store, veja a
secao "Assinatura para producao" abaixo.

### Passo 4 (opcional) — rodar localmente quando tiver acesso a um computador

```bash
cd frontend
npm install
npm run build
npx cap add android      # so na primeira vez
npx cap sync android
npx cap open android      # abre no Android Studio
```

A partir do Android Studio: `Run` para instalar direto no celular
conectado por USB, ou `Build > Build Bundle(s)/APK(s) > Build APK(s)`.

---

## Caminho 3 — iOS

Diferente do Android, gerar um `.ipa` **exige um Mac com Xcode** (a Apple
nao permite build de iOS em outro sistema, nem mesmo via GitHub Actions
sem um runner macOS + certificados de desenvolvedor Apple pagos). Se
voce tiver acesso ocasional a um Mac:

```bash
cd frontend
npm install
npm run build
npx cap add ios      # so na primeira vez
npx cap sync ios
npx cap open ios      # abre no Xcode
```

Sem Mac, o **Caminho 1 (PWA)** e a melhor opcao para usuarios iOS: aberto
via Safari > "Adicionar a Tela de Inicio", o resultado visual e quase
identico a um app nativo.

---

## Assinatura para producao (Play Store)

O `.apk` gerado pelo workflow e assinado com uma chave de **debug**,
valida apenas para testes no seu proprio aparelho. Para publicar na Play
Store, e necessario gerar uma chave de release e configurar o
`android/app/build.gradle` com ela — isso requer rodar `npx cap add
android` localmente pelo menos uma vez (para ter a pasta `android/`
versionada) e seguir a documentacao oficial do Capacitor sobre
["Deploying to Google Play"](https://capacitorjs.com/docs/android/deploying-to-google-play).
Esse passo fica fora do escopo deste scaffold inicial, mas toda a base
(config, dependencias, workflow de CI) ja esta pronta para evoluir nessa
direcao quando fizer sentido.

---

## Resumo rapido

| Quero... | Faca isso |
|---|---|
| Testar agora, sem build nenhum | PWA — abrir o site publicado e "Adicionar a tela inicial" |
| Um `.apk` para instalar no meu Android | Push no GitHub → aba Actions → baixar `nexus-ai-android-debug` |
| Editar/rodar o projeto Android localmente | `npx cap open android` (precisa de Android Studio) |
| Um app iOS | Precisa de um Mac com Xcode (ou fique com o PWA) |
