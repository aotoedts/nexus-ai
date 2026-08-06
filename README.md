# Nexus AI

Assistente de IA pessoal moderno, escalável e modular — full-stack,
com arquitetura pronta para trocar de modelo de IA sem reescrever nada.

## Estrutura do projeto

```
nexus-ai/
├── frontend/          # React + Vite + TS + Tailwind
├── backend/            # Node.js + Fastify + Clean Architecture
│   └── src/
│       ├── core/
│       │   ├── domain/           # Entidades e interfaces (regras de negocio puras)
│       │   ├── application/      # Use-cases (orquestracao das regras de negocio)
│       │   └── infrastructure/   # Prisma, adaptadores de IA, tools, agentes
│       ├── interfaces/http/      # Rotas, plugins e middlewares Fastify
│       ├── config/                # Env e logger
│       └── shared/                # Erros e utilitarios compartilhados
├── database/           # init.sql (pgvector) + docs do banco
├── packages/
│   └── shared-types/    # DTOs TypeScript compartilhados entre front e back
├── mobile/              # App nativo Android/iOS (React Native + Expo)
└── docs/                # Documentacao detalhada (arquitetura, API, setup)
```

Veja `docs/ARCHITECTURE.md` para o detalhamento da Clean Architecture e `docs/API.md` para a referência completa da API REST.

## Funcionalidades

- **Chat em tempo real** via WebSocket com streaming token a token (fallback automático para HTTP).
- **Histórico de conversas** completo, por usuário.
- **Memória de longo prazo** com busca semântica via pgvector (embeddings).
- **Sistema de agentes** com execução de tarefas em múltiplas etapas (loop ReAct: raciocínio → ação → observação).
- **Sistema de ferramentas (Tools)** extensível: calculadora, pesquisa na internet, leitor de PDF — novas tools se registram em `ToolRegistry` sem alterar o executor de agentes.
- **Upload e gestão de documentos**, com extração de texto, chunking e embeddings para RAG (Retrieval-Augmented Generation).
- **Autenticação** via JWT + refresh tokens.
- **Painel administrativo**: métricas, usuários e logs de auditoria.
- **Logs estruturados** (pino) e tratamento de erros centralizado.
- **Modelo de IA plugável**: troque de provider (API paga ou Qwen local via Ollama) mudando apenas uma variável de ambiente.
- **App mobile**: instalável como PWA (Android/iOS, hoje); um app web empacotado nativamente via Capacitor; e um **app React Native nativo de verdade** em `mobile/`, com build de `.apk` via EAS Build — veja [`docs/MOBILE.md`](docs/MOBILE.md) e [`docs/MOBILE_APP_RN.md`](docs/MOBILE_APP_RN.md).

## Instalação rápida

> **Codando pelo celular (Acode) e sem Docker local?** Pule direto para
> [`docs/DEPLOY_RENDER.md`](docs/DEPLOY_RENDER.md) — deploy 100% na nuvem
> com um `render.yaml` pronto, sem precisar rodar nada pesado no aparelho.

### Pré-requisitos
- Node.js 20+
- Docker e Docker Compose

### 1. Clonar e configurar variáveis de ambiente

```bash
cp .env.example .env
cp frontend/.env.example frontend/.env
```

### 2. Subir com Docker

```bash
docker compose up -d --build
docker compose exec backend npx prisma migrate deploy
docker compose exec backend npm run prisma:seed
```

Acesse `http://localhost:5173`. Login demo: `admin@nexusai.local` / `admin123`.

Guia completo, incluindo desenvolvimento sem Docker, deploy em produção e solução de problemas: [`docs/SETUP.md`](docs/SETUP.md).

## Modelo de IA

Por padrão o backend roda em modo `mock` (respostas simuladas, sem custo). Para ligar um modelo de verdade:

- **API hospedada** (Alibaba Cloud Model Studio ou qualquer servidor compatível com a API OpenAI) — configure `AI_PROVIDER`, `AI_BASE_URL` e `AI_API_KEY`.
- **100% local e gratuito**, via Ollama rodando Qwen3 8B — veja [`docs/LOCAL_MODEL.md`](docs/LOCAL_MODEL.md).

## Documentação

- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — Clean Architecture, SOLID, e como o adaptador de IA plugável funciona.
- [`docs/API.md`](docs/API.md) — referência completa da API REST + WebSocket.
- [`docs/SETUP.md`](docs/SETUP.md) — guia detalhado de instalação, variáveis de ambiente e deploy.
- [`docs/DEPLOY_RENDER.md`](docs/DEPLOY_RENDER.md) — deploy no Render direto do celular (sem Docker local), usando o `render.yaml` incluso.
- [`docs/LOCAL_MODEL.md`](docs/LOCAL_MODEL.md) — rodar um Qwen open source localmente via Ollama, sem depender de nenhuma API paga.
- [`docs/MOBILE.md`](docs/MOBILE.md) — como instalar como PWA ou gerar o app nativo Android/iOS (Capacitor).
- [`docs/MOBILE_APP_RN.md`](docs/MOBILE_APP_RN.md) — app nativo React Native (Expo) em `mobile/`, com build de APK via EAS Build.

## Testes

```bash
npm run test --workspace=backend
npm run test --workspace=frontend
```

## Licença

Projeto de uso pessoal/educacional. Ajuste conforme necessário antes de distribuir.
