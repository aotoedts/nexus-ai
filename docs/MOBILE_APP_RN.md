# App Mobile Nativo (React Native + Expo) — Nexus AI

Este é um app **React Native de verdade** (não é o site empacotado) que
mora em `mobile/`, separado do `frontend/` web. Ele se conecta
diretamente à API já publicada no Render — mesma arquitetura de sempre,
um novo cliente.

## O que tem pronto

- **Login / Cadastro** (`LoginScreen`) — mesmo fluxo de autenticação JWT do backend.
- **Chat em tempo real** (`ChatScreen`) — WebSocket com streaming token a token, com fallback automático para HTTP se a conexão cair.
- **Histórico** (`ConversationsScreen`) — lista de conversas, puxa para atualizar.
- **Configurações** (`SettingsScreen`) — troca o servidor (API/WebSocket) sem precisar gerar um novo build, útil se você migrar de provedor no futuro.
- Sessão salva no **Keystore nativo do Android** (via `expo-secure-store`), mais seguro que armazenamento simples.
- Visual alinhado com o app web (mesma paleta de cores).

## Build do APK — 100% na nuvem, sem Android Studio

O [EAS Build](https://docs.expo.dev/build/introduction/) da Expo funciona
igual ao GitHub Actions que você já usa: você dispara o build pelo
terminal do Acode, ele roda nos servidores da Expo, e você baixa o
`.apk` pronto pelo navegador.

### Passo 1 — instalar Node.js no terminal do Acode (se ainda não tiver)

```bash
apk add nodejs npm
```

### Passo 2 — criar conta gratuita na Expo

Pelo navegador do celular: [expo.dev/signup](https://expo.dev/signup)

### Passo 3 — entrar pelo terminal

```bash
cd mobile
npx eas-cli@latest login
```

Vai pedir seu email/senha da Expo.

### Passo 4 — vincular o projeto (só na primeira vez)

```bash
npx eas-cli@latest init
```

Isso cria o projeto na sua conta Expo e preenche automaticamente o
`projectId` dentro de `app.json` (campo `extra.eas.projectId`). Se ele
pedir para confirmar o `slug`, aceite `nexus-ai`.

### Passo 5 — gerar o APK

```bash
npx eas-cli@latest build --platform android --profile preview
```

O CLI empacota o código-fonte e envia para os servidores da Expo — o
build roda lá (uns 10-20 minutos na fila + build). Quando terminar,
aparece um link direto no terminal, e você também recebe por email.

### Passo 6 — baixar e instalar

Abra o link (ou [expo.dev](https://expo.dev) → seu projeto → **Builds**)
pelo navegador do celular, baixe o `.apk` e instale (o Android vai pedir
permissão para "instalar de fontes desconhecidas" na primeira vez).

## Atualizando o app depois

Sempre que mudar algo em `mobile/`, gere um novo build:

```bash
cd mobile
npx eas-cli@latest build --platform android --profile preview
```

Cada build gera um novo `.apk` — instale por cima do anterior (mesmo
`package` em `app.json`, então o Android atualiza em vez de duplicar).

## Trocando o servidor sem gerar novo build

Se o backend mudar de URL (por exemplo, se você recriar o serviço no
Render), **não precisa gerar um novo APK**: abra o app → aba
**Configurações** → **Editar** → coloque a nova URL da API e do
WebSocket → **Salvar**. O app usa esse valor imediatamente.

## Build para a Play Store (opcional, futuro)

O profile `production` no `eas.json` já está configurado para gerar um
`.aab` (formato exigido pela Play Store) em vez de `.apk`:

```bash
npx eas-cli@latest build --platform android --profile production
```

Publicar de fato na Play Store exige uma conta de desenvolvedor Google
(paga, taxa única) e não está no escopo deste guia — mas a base já está
pronta para esse passo quando fizer sentido.
