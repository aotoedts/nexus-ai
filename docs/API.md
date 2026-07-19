# API — Nexus AI

Base URL: `http://localhost:3333/api/v1` (configuravel via `API_PREFIX` e `PORT`).

Todas as rotas autenticadas exigem o header:

```
Authorization: Bearer <token>
```

Erros seguem sempre o formato:

```json
{ "error": { "code": "NOT_FOUND", "message": "Conversa nao encontrado(a)" } }
```

---

## Autenticacao

### `POST /auth/register`
Cria um novo usuario.

**Body:** `{ "name": string, "email": string, "password": string (min 6) }`
**Resposta 201:** `{ "user": {...}, "token": string }`

### `POST /auth/login`
**Body:** `{ "email": string, "password": string }`
**Resposta 200:** `{ "user": {...}, "token": string, "refreshToken": string }`

### `POST /auth/refresh`
**Body:** `{ "refreshToken": string }`
**Resposta 200:** `{ "token": string }`

### `GET /auth/me` 🔒
Retorna o usuario autenticado.

---

## Conversas

### `GET /conversations` 🔒
Lista as conversas do usuario autenticado.

### `GET /conversations/:id/messages` 🔒
Retorna o historico de mensagens da conversa.

### `PATCH /conversations/:id` 🔒
Renomeia a conversa. **Body:** `{ "title": string }`

### `DELETE /conversations/:id` 🔒
Remove a conversa e seu historico.

---

## Chat

### `POST /chat/messages` 🔒
Envia uma mensagem (request/response tradicional).

**Body:**
```json
{ "conversationId": "uuid (opcional — omitido cria uma nova conversa)", "content": "string" }
```

**Resposta 200:**
```json
{
  "conversationId": "uuid",
  "userMessage": { "id": "...", "role": "USER", "content": "..." },
  "assistantMessage": { "id": "...", "role": "ASSISTANT", "content": "..." }
}
```

### `WS /ws/chat?token=<jwt>` 🔒 — Chat em tempo real

Conexao WebSocket autenticada via query string (navegadores nao permitem
headers customizados no handshake do WebSocket).

**Cliente → servidor** (mensagem JSON):
```json
{ "conversationId": "uuid (opcional)", "content": "string" }
```

**Servidor → cliente** (eventos, um ou mais por mensagem enviada):
```json
{ "type": "token", "token": "peda" }
{ "type": "token", "token": "co " }
{ "type": "done", "conversationId": "uuid", "message": "resposta completa" }
{ "type": "error", "message": "descricao do erro" }
```

---

## Memoria de longo prazo

### `GET /memory` 🔒
Lista todas as memorias do usuario.

### `POST /memory` 🔒
Cria uma memoria manualmente.
**Body:** `{ "content": string, "kind"?: "fact"|"preference"|"event"|"summary", "importance"?: 1-5 }`

### `POST /memory/search` 🔒
Busca semantica por similaridade (pgvector).
**Body:** `{ "query": string, "topK"?: number }`

### `DELETE /memory/:id` 🔒
Remove uma memoria.

---

## Documentos (upload, leitura de PDF, RAG)

### `GET /documents` 🔒
Lista os documentos do usuario.

### `POST /documents/upload` 🔒
Upload via `multipart/form-data` (campo de arquivo). Aceita PDF ou texto.
O processamento (extracao de texto, chunking, embeddings) acontece de
forma assincrona; consulte `GET /documents` para ver o `status`
(`PENDING` → `PROCESSING` → `READY`/`FAILED`).

### `POST /documents/query` 🔒
Busca semantica (RAG) no conteudo dos documentos processados.
**Body:** `{ "query": string, "topK"?: number }`

---

## Agentes (tarefas em multiplas etapas)

### `POST /agents/run` 🔒
Executa uma tarefa usando o loop de agente (raciocinio + ferramentas).
**Body:** `{ "conversationId": "uuid", "goal": "string" }`
**Resposta:** `{ "runId": "uuid", "steps": [...], "finalAnswer": "string", "status": "completed"|"failed" }`

### `GET /agents/tools` 🔒
Lista as ferramentas disponiveis para os agentes.

---

## Painel administrativo (requer role `ADMIN`)

### `GET /admin/stats` 🔒👑
Metricas gerais: total de usuarios, conversas, mensagens, documentos, memorias.

### `GET /admin/users?page=&pageSize=` 🔒👑
Lista usuarios paginada.

### `PATCH /admin/users/:id/role` 🔒👑
Altera o papel de um usuario. **Body:** `{ "role": "USER"|"ADMIN" }`

### `GET /admin/logs?page=&pageSize=&level=` 🔒👑
Lista os logs de auditoria.

### `GET /admin/agent-runs` 🔒👑
Lista as ultimas execucoes de agentes.

---

## Saude do sistema

### `GET /health`
Liveness check simples.

### `GET /health/deep`
Verifica tambem a conexao com o banco de dados.
