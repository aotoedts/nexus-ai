# Deploy no Render — direto do Acode

Este guia assume o fluxo de editar no Acode, commitar e dar push pelo
terminal integrado. Nada aqui precisa de Docker rodando no celular —
quem builda e roda tudo e o Render (na nuvem).

## Visao geral

O `render.yaml` na raiz do projeto descreve 3 recursos:

1. **`nexus-postgres`** — banco PostgreSQL com pgvector (Render suporta
   nativamente, so precisa habilitar a extensao).
2. **`nexus-backend`** — a API (Fastify), buildada a partir de
   `backend/Dockerfile`.
3. **`nexus-frontend`** — o site (React), build estatico publicado
   direto.

## Passo 1 — colocar o codigo no GitHub

```bash
git init
git add .
git commit -m "Nexus AI - projeto inicial"
git branch -M main
git remote add origin https://github.com/SEU_USUARIO/nexus-ai.git
git push -u origin main
```

## Passo 2 — criar o Blueprint no Render

1. Entre em [render.com](https://render.com) e faca login/cadastro.
2. **New** > **Blueprint**.
3. Conecte sua conta do GitHub e selecione o repositorio `nexus-ai`.
4. O Render le o `render.yaml` e mostra os 3 recursos que vai criar.
   Confirme o nome do Blueprint e clique em **Apply**/**Deploy Blueprint**.
5. Aguarde os 3 recursos ficarem verdes.

> **Nota sobre o plano free:** o banco Postgres free do Render expira
> em 30 dias, e os web services free "dormem" apos 15 minutos sem uso.
> Perfeito para testar; para uso continuo, considere o plano pago.

## Passo 3 — habilitar o pgvector no banco

1. No dashboard do Render, abra o servico **`nexus-postgres`**.
2. Na aba **Info**, copie o **PSQL Command**.
3. Rode esse comando (pelo terminal do Acode, se tiver `psql`
   disponivel, ou pela opcao "Connect" do proprio dashboard).
4. Dentro do `psql`:
   ```sql
   CREATE EXTENSION IF NOT EXISTS vector;
   ```

## Passo 4 — rodar as migrations do Prisma

1. No dashboard, abra o servico **`nexus-backend`**.
2. Va na aba **Shell** (terminal dentro do container, no navegador).
3. Rode:
   ```bash
   npx prisma migrate deploy
   npm run prisma:seed
   ```
4. Isso cria as tabelas e um usuario admin de teste
   (`admin@nexusai.local` / `admin123` — troque a senha depois).

## Passo 5 — ajustar as URLs finais

O Render define a URL de cada servico so depois de criado. Se a URL
gerada for diferente da que esta no `render.yaml`:

1. `nexus-frontend` > **Environment** > corrija `VITE_API_URL` e `VITE_WS_URL`.
2. `nexus-backend` > **Environment** > corrija `CORS_ORIGIN`.

Ambos os servicos refazem o deploy automaticamente ao salvar.

## Passo 6 — testar

Abra a URL do `nexus-frontend` no navegador do celular. Cadastre um
usuario ou entre com `admin@nexusai.local` / `admin123`.

## Passo 7 — gerar o app mobile

Com o backend publicado com HTTPS, siga [`docs/MOBILE.md`](./MOBILE.md)
(app web empacotado) ou [`docs/MOBILE_APP_RN.md`](./MOBILE_APP_RN.md)
(app React Native nativo).

## Atualizando o app depois

```bash
git add .
git commit -m "descricao da mudanca"
git push
```

O Render detecta o push e refaz o deploy automaticamente. Se a mudanca
alterou `schema.prisma`, rode `npx prisma migrate deploy` de novo pelo
**Shell** do `nexus-backend` apos o deploy terminar.
