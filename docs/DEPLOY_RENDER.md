# Deploy no Render — direto do Acode

Este guia assume o seu fluxo de sempre: **editar no Acode, commitar e
dar push pelo terminal integrado**. Nada aqui precisa de Docker rodando
no celular — quem builda e roda tudo e o Render (na nuvem), do mesmo
jeito que ja acontece com o Aotoedts Studio.

## Visao geral

O `render.yaml` na raiz do projeto descreve 3 recursos:

1. **`nexus-postgres`** — banco PostgreSQL com pgvector (Render suporta
   nativamente, so precisa habilitar a extensao).
2. **`nexus-backend`** — a API (Fastify), buildada a partir de
   `backend/Dockerfile`.
3. **`nexus-frontend`** — o site (React), build estatico publicado
   direto.

## Passo 1 — colocar o codigo no GitHub

Pelo terminal do Acode, dentro da pasta do projeto:

```bash
git init
git add .
git commit -m "Nexus AI - projeto inicial"
git branch -M main
git remote add origin https://github.com/SEU_USUARIO/nexus-ai.git
git push -u origin main
```

(crie o repositorio vazio antes, em github.com, pelo navegador do
celular — nome sugerido: `nexus-ai`)

## Passo 2 — criar o Blueprint no Render

Tudo pelo navegador do celular, sem terminal:

1. Entre em [render.com](https://render.com) e faca login/cadastro.
2. **New** (canto superior) > **Blueprint**.
3. Conecte sua conta do GitHub (se ainda nao tiver conectado) e
   selecione o repositorio `nexus-ai`.
4. O Render le o `render.yaml` e mostra os 3 recursos que vai criar:
   `nexus-postgres`, `nexus-backend`, `nexus-frontend`. Confirme o nome
   do Blueprint e clique em **Apply**/**Deploy Blueprint**.
5. Aguarde os 3 recursos ficarem verdes (banco primeiro, depois
   backend, depois frontend). O primeiro build do backend demora mais
   (esta compilando o TypeScript dentro do Docker).

> **Nota sobre o plano free:** o banco Postgres free do Render expira
> em 30 dias (voce recebe aviso por email para recriar/fazer upgrade), e
> os web services free "dormem" apos 15 minutos sem uso, acordando na
> proxima requisicao (alguns segundos de atraso). Perfeito para testar;
> para uso continuo, considere o plano pago quando fizer sentido.

## Passo 3 — habilitar o pgvector no banco

O Render suporta a extensao `vector`, mas ela precisa ser habilitada uma
vez, com um comando SQL:

1. No dashboard do Render, abra o servico **`nexus-postgres`**.
2. Na aba **Info**, copie o **PSQL Command** (algo como
   `psql postgresql://nexus:...@...render.com/nexus_ai`).
3. Pelo terminal do Acode, rode esse comando (o Acode geralmente ja tem
   `psql` disponivel no ambiente do terminal integrado; se nao tiver,
   use a opcao "Connect" > "External Connection" do proprio dashboard do
   Render, que abre um terminal web).
4. Dentro do `psql`, rode:
   ```sql
   CREATE EXTENSION IF NOT EXISTS vector;
   ```

## Passo 4 — rodar as migrations do Prisma

Isso cria as tabelas (users, conversations, messages, memories, etc.) no
banco recem-criado. Use o **Shell** do proprio backend no Render (nao
precisa do seu celular ter as ferramentas instaladas):

1. No dashboard, abra o servico **`nexus-backend`**.
2. Va na aba **Shell** (abre um terminal dentro do container, direto no
   navegador).
3. Rode:
   ```bash
   npx prisma migrate deploy
   npm run prisma:seed
   ```
4. Isso cria as tabelas e um usuario admin de teste
   (`admin@nexusai.local` / `admin123` — troque a senha depois).

## Passo 5 — ajustar as URLs finais

O Render define a URL de cada servico so depois de criado (formato
`https://nexus-backend-XXXX.onrender.com`). Se a URL gerada for
diferente da que esta no `render.yaml`:

1. Abra **`nexus-frontend`** > **Environment** e corrija `VITE_API_URL`
   e `VITE_WS_URL` com a URL real do backend.
2. Abra **`nexus-backend`** > **Environment** e corrija `CORS_ORIGIN`
   com a URL real do frontend.
3. Ambos os servicos re-fazem o deploy automaticamente ao salvar uma
   variavel de ambiente.

## Passo 6 — testar

Abra a URL do `nexus-frontend` no navegador do celular. Cadastre um
usuario ou entre com `admin@nexusai.local` / `admin123`.

## Passo 7 — gerar o app mobile (Capacitor)

Agora que o backend esta publicado com HTTPS, siga
[`docs/MOBILE.md`](MOBILE.md) para gerar o `.apk` — o workflow de CI
(`build-android.yml`) ja usa `VITE_API_URL`/`VITE_WS_URL` configuradas
como *variables* do repositorio no GitHub, entao aponte-as para a URL
real do `nexus-backend` do Render.

## Atualizando o app depois

De agora em diante, seu fluxo passa a ser exatamente igual ao do
Aotoedts Studio:

```bash
# edite o codigo no Acode, depois:
git add .
git commit -m "descricao da mudanca"
git push
```

O Render detecta o push e refaz o deploy automaticamente do servico que
mudou (backend e/ou frontend). Se a mudanca alterou `schema.prisma`,
lembre de rodar `npx prisma migrate deploy` de novo pelo **Shell** do
`nexus-backend` apos o deploy terminar.
