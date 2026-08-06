# Modelo local (Qwen via Ollama) — Nexus AI

Este guia cobre como rodar um modelo Qwen **open source, 100% local**,
sem depender de nenhuma API paga. Nenhum dado da sua conversa sai da
sua rede.

## Como funciona

O Nexus AI tem um adaptador dedicado, `OllamaAdapter`, que fala com o
[Ollama](https://ollama.com) — um runtime que baixa e executa modelos
open source (incluindo a familia Qwen) na sua propria maquina. O Ollama
expoe uma API compativel com a da OpenAI, entao nenhuma outra parte do
sistema precisa saber que o modelo e local.

## Onde rodar o Ollama: 2 cenarios

### Cenario A — Tudo local (desenvolvimento, no seu computador)

```bash
cp .env.example .env
# edite o .env:
#   AI_PROVIDER=ollama
#   AI_BASE_URL=http://ollama:11434/v1
#   AI_MODEL_NAME=qwen3:8b

docker compose up -d --build
```

Na primeira subida, o servico `ollama-pull-model` baixa o modelo
automaticamente (pode demorar — alguns GB).

**Modelo padrao deste projeto: `qwen3:8b`** — ~5.2GB de download
(quantizacao Q4_K_M), licenca Apache 2.0, contexto de 32K tokens (ate
131K com YaRN). Roda em CPU puro com 16GB de RAM livres (mais lento),
ou com boa velocidade numa GPU com 6-8GB de VRAM.

**Outras opcoes** (ajuste `AI_MODEL_NAME`):
- `qwen3:0.6b` / `qwen3:1.7b` / `qwen3:4b` — mais leves, rodam em
  maquinas mais fracas, com menos qualidade de resposta.
- `qwen3:14b` / `qwen3:32b` — melhor qualidade, exigem mais RAM/VRAM.

Veja os tamanhos disponiveis em [ollama.com/library/qwen3](https://ollama.com/library/qwen3).

### Cenario B — Backend publicado no Render + modelo local na sua maquina

Como o Render nao tem GPU nem RAM suficiente no plano free para rodar
um LLM, uma opcao e manter o Ollama na sua maquina e criar um tunel:

1. No seu computador: `ollama serve` (ou ja roda em background apos instalar)
2. `ollama pull qwen3:8b` e `ollama pull nomic-embed-text`
3. Exponha a porta 11434 com um tunel — [Cloudflare Tunnel](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/) (gratuito) ou `ngrok http 11434`
4. No Render, `nexus-backend` > **Environment**:
   ```
   AI_PROVIDER=ollama
   AI_BASE_URL=https://SEU-TUNEL.trycloudflare.com/v1
   AI_MODEL_NAME=qwen3:8b
   ```
5. O app so responde de verdade enquanto seu computador (com Ollama +
   tunel) estiver ligado. Quando desligar, volte `AI_PROVIDER` para
   `mock` para nao deixar o chat quebrado.

Essa e uma solucao hibrida razoavel para uso pessoal, nao para producao
com varias pessoas usando o app 24/7 (precisaria de um servidor proprio
sempre ligado).

## ⚠️ Importante: dimensao do embedding

O banco de dados ja e criado com colunas `vector(1536)`. Modelos de
embedding do Ollama usam outras dimensoes:

| Modelo Ollama | Dimensao |
|---|---|
| `nomic-embed-text` | 768 |
| `mxbai-embed-large` | 1024 |
| `all-minilm` | 384 |

Se trocar `AI_EMBEDDING_MODEL` para um desses, **precisa alterar a
dimensao das colunas no banco tambem**, ou vai dar erro de "different
vector dimensions".

**Para ajustar (exemplo com `nomic-embed-text`, 768 dimensoes):**

Pelo **Shell** do `nexus-backend` no Render (ou via `psql` local):

```sql
ALTER TABLE memories ALTER COLUMN embedding TYPE vector(768);
ALTER TABLE document_chunks ALTER COLUMN embedding TYPE vector(768);
```

⚠️ Isso apaga o valor das memorias/embeddings ja salvos (viram
incompativeis com a nova dimensao). Depois de rodar, atualize tambem
`AI_EMBEDDING_DIM=768` no `.env`/variaveis do Render por consistencia.

## Testando

Depois de configurar `AI_PROVIDER=ollama` e reiniciar o backend, mande
uma mensagem no chat. Se der erro de conexao, confira:
- O Ollama esta rodando (`ollama list` mostra os modelos baixados)?
- `AI_BASE_URL` esta acessivel a partir de onde o backend roda (dentro
  do docker-compose, use o nome do servico `ollama`, nao `localhost`)?
- O nome em `AI_MODEL_NAME` bate exatamente com o que `ollama list` mostra?
