# Modelo local (Qwen via Ollama) — Nexus AI

Este guia cobre como rodar um modelo Qwen **open source, 100% local**,
sem depender de nenhuma API paga (Alibaba Cloud, OpenAI, etc.). Nenhum
dado da sua conversa sai da sua rede.

## Como funciona

O Nexus AI já tem um adaptador dedicado, `OllamaAdapter`, que fala com o
[Ollama](https://ollama.com) — um runtime que baixa e executa modelos
open source (incluindo a família Qwen) na sua própria máquina. O Ollama
expõe uma API compatível com a da OpenAI, então nenhuma outra parte do
sistema precisa saber que o modelo é local.

## Onde rodar o Ollama: 2 cenários

### Cenário A — Tudo local (desenvolvimento, no seu computador)

Quando você tiver acesso a um computador (não dá para rodar um modelo
de linguagem de verdade só no celular), use o `docker-compose.yml` —
ele já inclui um serviço `ollama` pronto:

```bash
cp .env.example .env
# edite o .env:
#   AI_PROVIDER=ollama
#   AI_BASE_URL=http://ollama:11434/v1
#   AI_MODEL_NAME=qwen3:8b

docker compose up -d --build
```

Na primeira subida, o serviço `ollama-pull-model` baixa o modelo
automaticamente (pode demorar — modelos têm alguns GB). Depois disso,
tudo roda local: banco, backend, frontend e o modelo de IA.

**Modelo padrão deste projeto: `qwen3:8b`** — ~5.2GB de download (quantização
Q4_K_M), Apache 2.0, contexto de 32K tokens (até 131K com YaRN). Roda em
CPU puro com 16GB de RAM livres (mais lento), ou com boa velocidade numa
GPU com 6-8GB de VRAM.

**Outras opções** (ajuste `AI_MODEL_NAME` se quiser trocar):
- `qwen3:0.6b` / `qwen3:1.7b` / `qwen3:4b` — mais leves, rodam em máquinas
  mais fracas, com menos qualidade de resposta.
- `qwen3:14b` / `qwen3:32b` — melhor qualidade, exigem mais RAM/VRAM
  (aprox. 9GB e 20GB de download, respectivamente).

Veja os tamanhos disponíveis em [ollama.com/library/qwen3](https://ollama.com/library/qwen3).

### Cenário B — Backend publicado no Render + modelo local na sua máquina

Como o backend já está rodando no Render, e o Render **não tem GPU nem
RAM suficiente no plano free** para rodar um LLM, uma opção é manter o
Ollama na sua máquina (ligado só quando você for usar) e criar um túnel
até ele:

1. No seu computador: `ollama serve` (ou já roda em background após instalar)
2. Baixe o modelo: `ollama pull qwen3:8b` e o de embeddings: `ollama pull nomic-embed-text`
3. Exponha a porta 11434 publicamente com um túnel, por exemplo
   [Cloudflare Tunnel](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/) (gratuito) ou `ngrok http 11434`
4. No Render, no serviço `nexus-backend` → **Environment**, configure:
   ```
   AI_PROVIDER=ollama
   AI_BASE_URL=https://SEU-TUNEL.trycloudflare.com/v1
   AI_MODEL_NAME=qwen3:8b
   ```
5. O app só vai responder de verdade enquanto seu computador (com o
   Ollama e o túnel) estiver ligado. Quando desligar, volte
   `AI_PROVIDER` para `mock` no Render para não deixar o chat quebrado.

Essa é uma solução "híbrida" razoável para uso pessoal, mas não serve
para produção com outras pessoas usando o app 24/7 — para isso, seria
necessário um servidor próprio (VPS com GPU) sempre ligado rodando o
Ollama.

## ⚠️ Importante: dimensão do embedding

O banco de dados já está criado com colunas `vector(1536)` (dimensão
usada pelos embeddings padrão). Modelos de embedding do Ollama usam
**outras dimensões**:

| Modelo Ollama | Dimensão |
|---|---|
| `nomic-embed-text` | 768 |
| `mxbai-embed-large` | 1024 |
| `all-minilm` | 384 |

Se você trocar `AI_EMBEDDING_MODEL` para um desses, **precisa alterar a
dimensão das colunas no banco também**, ou vai dar erro de "different
vector dimensions" ao salvar memórias/documentos.

**Para ajustar (exemplo com `nomic-embed-text`, 768 dimensões):**

Pelo **Shell** do `nexus-backend` no Render (ou via `psql` local):

```sql
ALTER TABLE memories ALTER COLUMN embedding TYPE vector(768);
ALTER TABLE document_chunks ALTER COLUMN embedding TYPE vector(768);
```

⚠️ Isso **apaga o valor das memórias/embeddings já salvos** (viram
incompatíveis com a nova dimensão) — tudo bem se você ainda está
testando, mas tenha isso em mente. Depois de rodar o `ALTER TABLE`,
atualize também `AI_EMBEDDING_DIM=768` no `.env`/variáveis do Render
por consistência (informativo — não é lido pelo código diretamente,
mas mantém tudo documentado igual).

## Testando

Depois de configurar `AI_PROVIDER=ollama` e reiniciar o backend, mande
uma mensagem no chat. Se aparecer erro de conexão, confira:
- O Ollama está rodando (`ollama list` mostra os modelos baixados)?
- `AI_BASE_URL` está acessível a partir de onde o backend roda (dentro
  do docker-compose, use o nome do serviço `ollama`, não `localhost`)?
- O nome em `AI_MODEL_NAME` bate exatamente com o que `ollama list` mostra?
