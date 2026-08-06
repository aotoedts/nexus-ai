# Database - Nexus AI

Usamos **PostgreSQL 16** com a extensao **pgvector** para armazenar embeddings
(memoria de longo prazo e busca semantica de documentos).

## Subir localmente

```bash
docker compose up -d postgres
```

## Migrations

As migrations sao gerenciadas pelo Prisma, dentro de `backend/prisma`.

```bash
npm run prisma:migrate --workspace=backend
```

## Extensoes utilizadas
- `vector` (pgvector) — colunas do tipo `vector(n)` para embeddings.
- `uuid-ossp` — geracao de UUIDs no banco.
