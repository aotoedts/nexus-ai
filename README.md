# Nexus AI

Assistente de IA pessoal moderno, escalável e modular — chat em tempo real, memória de longo prazo, agentes com ferramentas, leitura de documentos (PDF) e pesquisa na internet, com um backend preparado para plugar qualquer modelo de IA de código aberto (Qwen, Llama, Mistral, etc.) sem reescrever a aplicação.

## Stack

| Camada | Tecnologias |
|---|---|
| Frontend | React + Vite + TypeScript + Tailwind CSS |
| Backend | Node.js + TypeScript + Fastify |
| Banco de dados | PostgreSQL + Prisma + pgvector |
| Infra | Docker + Docker Compose |
| Qualidade | ESLint + Prettier + Vitest |

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
- **Modelo de IA plugável**: troque de provider mudando apenas uma variável de ambiente.
- **App mobile**: instalável como PWA (Android/iOS, hoje); um app web empacotado nativamente via Capacitor; e um **app React Native nativo de verdade** em `mobile/`, com build de `.apk` via EAS Build — veja [`docs/MOBILE.md`](docs/MOBILE.md) e [`docs/MOBILE_APP_RN.md`](docs/MOBILE_APP_RN.md).

## Adaptador de modelo de IA (plugável)

O backend **não implementa nenhum modelo de IA diretamente**. Toda comunicação com um modelo passa pela interface `IModelAdapter` (`backend/src/core/infrastructure/ai/IModelAdapter.ts`):

```ts
interface IModelAdapter {
  readonly providerName: string;
  complete(messages, options?): Promise<CompletionResult>;
  stream(messages, onToken, options?): Promise<CompletionResult>;
  embed(text): Promise<number[]>;
}
```

Implementações disponíveis, selecionadas via `AI_PROVIDER` no `.env`:

- `qwen` — conecta a qualquer servidor de inferência compatível com a API OpenAI rodando um modelo Qwen (ex: vLLM, Ollama, LM Studio, TGI, SGLang). Basta configurar `AI_BASE_URL` e `AI_MODEL_NAME`.
- `openai_compatible` — mesma implementação, para qualquer outro servidor compatível com a API OpenAI.
- `mock` — adaptador simulado, útil para desenvolver e rodar testes sem depender de GPU/infra de modelo.

Para adicionar um novo provider (ex: um modelo proprietário), crie uma nova classe que implemente `IModelAdapter` e registre-a em `ModelAdapterFactory.ts`. Nenhuma outra camada da aplicação precisa mudar.

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

Edite o `.env` na raiz e ajuste `JWT_SECRET`, `REFRESH_TOKEN_SECRET` e, se for usar um modelo real, `AI_PROVIDER=qwen` + `AI_BASE_URL`.

### 2. Subir tudo com Docker (recomendado)

```bash
docker compose up -d --build
```

Isso sobe o Postgres com pgvector, o backend (porta 3333) e o frontend (porta 5173).

Depois de subir, rode as migrations e o seed:

```bash
docker compose exec backend npx prisma migrate deploy
docker compose exec backend npm run prisma:seed
```

Acesse `http://localhost:5173`. Usuário de demonstração: `admin@nexusai.local` / `admin123`.

### 3. Alternativa: desenvolvimento local sem Docker para o banco

```bash
npm install
docker compose up -d postgres
npm run prisma:migrate --workspace=backend
npm run prisma:seed --workspace=backend
npm run dev
```

Isso inicia backend (`http://localhost:3333`) e frontend (`http://localhost:5173`) simultaneamente com hot-reload.

## Scripts principais

| Comando | Descrição |
|---|---|
| `npm run dev` | Backend + frontend em modo desenvolvimento |
| `npm run build` | Build de produção de todos os workspaces |
| `npm test` | Roda os testes automatizados (backend + frontend) |
| `npm run lint` | Lint em todo o monorepo |
| `npm run docker:up` | Sobe toda a stack via Docker Compose |
| `npm run prisma:migrate` | Cria/aplica migrations do Prisma |

## Testes

```bash
npm run test --workspace=backend
npm run test --workspace=frontend
```

Os testes cobrem entidades de domínio, ferramentas (tools), o adaptador mock de IA e um teste de integração da API (`/health`).

## Documentação

- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — Clean Architecture, SOLID e decisões de design.
- [`docs/API.md`](docs/API.md) — referência completa dos endpoints REST e do protocolo WebSocket.
- [`docs/SETUP.md`](docs/SETUP.md) — guia detalhado de instalação, variáveis de ambiente e deploy.
- [`docs/MOBILE.md`](docs/MOBILE.md) — como instalar como PWA ou gerar o app nativo Android/iOS (Capacitor).
- [`docs/DEPLOY_RENDER.md`](docs/DEPLOY_RENDER.md) — deploy no Render direto do celular (sem Docker local), usando o `render.yaml` incluso.
- [`docs/LOCAL_MODEL.md`](docs/LOCAL_MODEL.md) — rodar um Qwen open source localmente via Ollama, sem depender de nenhuma API paga.
- [`docs/MOBILE_APP_RN.md`](docs/MOBILE_APP_RN.md) — app nativo React Native (Expo) em `mobile/`, com build de APK via EAS Build.

## Licença

Projeto de exemplo/base para uso e adaptação livre.
