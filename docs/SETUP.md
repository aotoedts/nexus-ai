# Guia de Setup — Nexus AI

## Pre-requisitos

- Node.js 20+
- Docker e Docker Compose (recomendado)
- Um servidor de inferencia compativel com a API OpenAI se for usar um
  modelo real (ex: Ollama, vLLM, LM Studio) — opcional para desenvolvimento,
  ja que o `AI_PROVIDER=mock` funciona sem GPU.

## 1. Variaveis de ambiente

Copie os arquivos de exemplo:

```bash
cp .env.example .env
cp frontend/.env.example frontend/.env
```

### Variaveis principais (`.env` na raiz)

| Variavel | Descricao | Padrao |
|---|---|---|
| `PORT` | Porta do backend | `3333` |
| `DATABASE_URL` | Connection string do Postgres | — |
| `JWT_SECRET` / `REFRESH_TOKEN_SECRET` | Segredos de autenticacao — **troque em producao** | — |
| `AI_PROVIDER` | `qwen` \| `openai_compatible` \| `ollama` \| `mock` | `mock` |
| `AI_BASE_URL` | URL do servidor de inferencia (formato OpenAI) | `http://localhost:11434/v1` |
| `AI_MODEL_NAME` | Nome do modelo no servidor de inferencia | `qwen3:8b` |
| `WEB_SEARCH_PROVIDER` | `mock` \| `tavily` \| `serpapi` | `mock` |
| `UPLOAD_DIR` | Pasta local para arquivos enviados | `./uploads` |

Veja `.env.example` para a lista completa e comentada.

## 2. Subindo com Docker (recomendado)

```bash
docker compose up -d --build
```

Isso inicia os servicos:
- `postgres` — PostgreSQL 16 com a extensao `pgvector` ja habilitada.
- `ollama` + `ollama-pull-model` — modelo Qwen3 8B local (so entra em uso se `AI_PROVIDER=ollama`; veja `docs/LOCAL_MODEL.md`).
- `backend` — API Fastify na porta `3333`.
- `frontend` — build estatico servido via Nginx na porta `5173`.

Depois que os containers estiverem de pe, rode as migrations e o seed:

```bash
docker compose exec backend npx prisma migrate deploy
docker compose exec backend npm run prisma:seed
```

Acesse `http://localhost:5173`. Usuario administrador de demonstracao:
`admin@nexusai.local` / `admin123` (**troque a senha em qualquer ambiente
real**).

Para ver logs em tempo real: `docker compose logs -f`
Para derrubar tudo: `docker compose down` (adicione `-v` para apagar os volumes/dados).

## 3. Desenvolvimento local (sem Docker para o codigo)

Util quando voce quer hot-reload rapido no backend/frontend, mas ainda
quer o Postgres rodando em container:

```bash
npm install
docker compose up -d postgres
npm run prisma:migrate --workspace=backend
npm run prisma:seed --workspace=backend
npm run dev
```

O comando `npm run dev` na raiz sobe backend (`http://localhost:3333`) e
frontend (`http://localhost:5173`) simultaneamente, com reload automatico.

## 4. Conectando um modelo Qwen real

Duas opcoes:

- **API hospedada** (Alibaba Cloud Model Studio, ou qualquer servidor
  compativel com a API OpenAI): configure `AI_PROVIDER=qwen`,
  `AI_BASE_URL` e `AI_API_KEY`.
- **100% local, sem custo por uso** (via Ollama): veja o guia dedicado
  em [`docs/LOCAL_MODEL.md`](./LOCAL_MODEL.md).

Em ambos os casos, nenhuma outra mudanca de codigo e necessaria — veja
`docs/ARCHITECTURE.md` para entender o adaptador plugavel.

## 5. Migrations do banco de dados

```bash
# Criar uma nova migration a partir de mudancas no schema.prisma
npm run prisma:migrate --workspace=backend

# Aplicar migrations existentes (ambiente de producao)
npm run prisma:deploy --workspace=backend

# Abrir o Prisma Studio (explorador visual do banco)
npm run prisma:studio --workspace=backend
```

## 6. Rodando os testes

```bash
npm run test --workspace=backend
npm run test --workspace=frontend
```

## 7. Build de producao

```bash
npm run build
```

Isso compila `packages/shared-types`, `backend` (para `backend/dist`) e
`frontend` (para `frontend/dist`). Em producao com Docker, os Dockerfiles
de `backend/` e `frontend/` ja fazem esse build em multi-stage.

## 8. Deploy

- **Backend**: qualquer ambiente Node 20+ ou o `Dockerfile` fornecido.
  Defina todas as variaveis de `.env.example` como variaveis de ambiente
  reais (nunca comite `.env`). Rode `npx prisma migrate deploy` antes de
  iniciar o servidor. Veja tambem `docs/DEPLOY_RENDER.md` para um passo a
  passo completo no Render (incluindo o `render.yaml` incluso).
- **Frontend**: o `Dockerfile` gera um build estatico servido por Nginx
  (`frontend/nginx.conf`). Tambem pode ser hospedado em qualquer CDN/
  hosting estatico (Vercel, Netlify, S3+CloudFront, ou Render Static
  Site), desde que `VITE_API_URL` e `VITE_WS_URL` apontem para o backend
  em producao (com `https://` e `wss://`).
- **Banco de dados**: qualquer Postgres gerenciado que suporte a extensao
  `pgvector` (ex: Render, Supabase, Neon com pgvector, RDS com a
  extensao habilitada, ou um container `pgvector/pgvector` proprio).

## Solucao de problemas comuns

| Sintoma | Causa provavel |
|---|---|
| `DATABASE_URL invalida` ao iniciar | `.env` nao foi criado ou `DATABASE_URL` esta vazia |
| Erro ao rodar migrations sobre `vector` | Extensao `pgvector` nao habilitada — confira `database/init.sql` |
| WebSocket nao conecta | `VITE_WS_URL` sem o prefixo `/api/v1/ws`, ou token expirado |
| Respostas sempre iguais tipo `[mock] Recebi: ...` | `AI_PROVIDER` continua `mock` — configure `qwen`/`openai_compatible`/`ollama` |
| Upload de PDF falha silenciosamente | Verifique `UPLOAD_DIR` (permissao de escrita) e `MAX_FILE_SIZE_MB` |
