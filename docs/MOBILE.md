# App Mobile (PWA + Capacitor) — Nexus AI

O frontend web do Nexus AI tem **dois caminhos** para virar um app no
celular sem sair do `frontend/`:

1. **PWA** (Progressive Web App) — funciona hoje, sem instalar nada alem
   do que ja existe no projeto.
2. **App web empacotado nativamente** via **Capacitor** — gera um `.apk`
   Android real a partir do mesmo codigo React, sem reescrever nada.

> Se voce quer um app **React Native de verdade** (nao o site
> empacotado), veja [`docs/MOBILE_APP_RN.md`](./MOBILE_APP_RN.md) —
> existe um segundo app em `mobile/`, construido do zero em React
> Native + Expo.

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
   Inicio".

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

### Passo 2 — liberar a origem do app no CORS do backend

No `.env` do backend (producao), garanta que `CORS_ORIGIN` inclua a
origem usada pela WebView do Capacitor:

```
CORS_ORIGIN=https://seu-frontend-web.com,https://localhost
```

### Passo 3 — gerar o APK automaticamente (sem Android Studio)

Basta dar `git push` para a branch `main` (mudando algo em `frontend/`)
ou disparar manualmente na aba **Actions** do GitHub > workflow **"Build
Android APK"** > **Run workflow**. Baixe o artefato
**`nexus-ai-android-debug`** ao final.

### Passo 4 (opcional) — rodar localmente

```bash
cd frontend
npm install && npm run build
npx cap add android      # so na primeira vez
npx cap sync android
npx cap open android      # abre no Android Studio
```

## Caminho 3 — iOS

Gerar um `.ipa` exige um Mac com Xcode. Sem Mac, o PWA (Caminho 1) e a
melhor opcao para usuarios iOS.

## Resumo rapido

| Quero... | Faca isso |
|---|---|
| Testar agora, sem build nenhum | PWA — "Adicionar a tela inicial" |
| Um `.apk` do site empacotado | Capacitor + GitHub Actions |
| Um app React Native de verdade | Veja `docs/MOBILE_APP_RN.md` |
| Um app iOS | Precisa de um Mac com Xcode (ou fique com o PWA) |
