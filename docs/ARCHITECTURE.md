# Arquitetura — Nexus AI

## Visao geral

O backend do Nexus AI segue **Clean Architecture** combinada com os principios
**SOLID**. O objetivo e manter as regras de negocio isoladas de detalhes de
infraestrutura (banco de dados, framework HTTP, provedor de IA), para que
qualquer uma dessas pecas possa ser trocada sem reescrever o restante do
sistema.

```
src/
├── core/
│   ├── domain/            (1) Entidades e contratos — nao depende de nada
│   │   ├── entities/
│   │   └── repositories/  (interfaces — "portas")
│   │
│   ├── application/       (2) Use-cases — orquestram o dominio
│   │   └── use-cases/
│   │
│   └── infrastructure/    (3) Implementacoes concretas — "adaptadores"
│       ├── database/prisma/
│       ├── repositories/  (implementam as interfaces do dominio)
│       ├── ai/            (adaptador plugavel de modelo de IA)
│       ├── tools/         (sistema de ferramentas/plugins)
│       └── agents/        (executor de agentes multi-etapa)
│
├── interfaces/http/       (4) Camada de entrega — Fastify
│   ├── routes/
│   ├── plugins/
│   └── middlewares/
│
├── config/                 Variaveis de ambiente e logger
└── shared/                 Erros e utilitarios cross-cutting
```

## Regra de dependencia

As setas de dependencia sempre apontam para dentro:

```
interfaces/http  →  application (use-cases)  →  domain (entities/interfaces)
                                     ↑
                          infrastructure (implementa as interfaces)
```

- `domain/` nao importa nada de `infrastructure/` ou `interfaces/`. E o
  nucleo puro: entidades (`User`, `Message`, `Memory`, ...) e contratos
  (`IUserRepository`, `IModelAdapter`, ...).
- `application/` (use-cases) depende apenas de `domain/` — nunca importa
  Prisma, Fastify ou qualquer biblioteca de infraestrutura diretamente.
  Um use-case como `SendMessageUseCase` recebe suas dependencias
  (repositorios, adaptador de IA) via **injecao de dependencia** no
  construtor, sempre atraves das interfaces do dominio.
- `infrastructure/` implementa as interfaces do dominio usando tecnologias
  concretas: `PrismaUserRepository implements IUserRepository`,
  `QwenAdapter implements IModelAdapter`, etc.
- `interfaces/http/` (rotas Fastify) e a camada mais externa: converte
  requisicoes HTTP em chamadas a use-cases e serializa o resultado de volta
  em JSON. Nao contem regra de negocio.

## Principios SOLID aplicados

- **S — Single Responsibility**: cada use-case faz uma unica coisa
  (`RegisterUserUseCase`, `SendMessageUseCase`, `UploadDocumentUseCase`...).
  Entidades de dominio validam apenas suas proprias invariantes.
- **O — Open/Closed**: novos providers de IA (`IModelAdapter`) ou novas
  ferramentas (`ITool`) podem ser adicionados sem modificar o codigo
  existente — apenas implementando a interface e registrando na factory
  ou no `ToolRegistry`.
- **L — Liskov Substitution**: qualquer implementacao de `IModelAdapter`
  (`QwenAdapter`, `MockAdapter`, `OpenAICompatibleAdapter`) e
  intercambiavel; o restante do sistema so conhece a interface.
- **I — Interface Segregation**: as interfaces de repositorio expoem
  apenas os metodos que cada agregados precisa (`IMemoryRepository` nao
  tem metodos de `IDocumentRepository`, por exemplo).
- **D — Dependency Inversion**: use-cases dependem de abstracoes
  (`IUserRepository`, `IModelAdapter`), nunca de implementacoes concretas.
  As implementacoes concretas sao "injetadas" na montagem da aplicacao
  (`app.ts`), nao dentro dos proprios use-cases.

## O adaptador de IA plugavel

O ponto central da arquitetura para a integracao de modelos de IA e a
interface `IModelAdapter`:

```ts
interface IModelAdapter {
  readonly providerName: string;
  complete(messages, options?): Promise<CompletionResult>;
  stream(messages, onToken, options?): Promise<CompletionResult>;
  embed(text): Promise<number[]>;
}
```

Todo o sistema (chat, memoria, RAG, agentes) conversa exclusivamente com
essa interface. A escolha de qual implementacao usar acontece em um unico
lugar, `ModelAdapterFactory.ts`, com base na variavel `AI_PROVIDER`. Isso
significa que trocar de Qwen para outro modelo (ou para um servico
proprietario no futuro) exige apenas:

1. Criar uma nova classe que implemente `IModelAdapter`.
2. Adicionar um `case` na factory.

Nenhuma rota, use-case ou componente de UI precisa ser alterado.

## Sistema de ferramentas (Tools) e plugins

Ferramentas implementam `ITool` e se registram no `ToolRegistry` (em
`app.ts`, na inicializacao). O `AgentExecutor` consulta o registro para
saber quais ferramentas oferecer ao modelo via function-calling, e para
executar a ferramenta escolhida pelo modelo durante o loop de raciocinio.
Adicionar uma nova ferramenta (ex: envio de email, consulta a uma API
externa) nao exige alterar o executor de agentes — apenas implementar
`ITool` e registrar a instancia.

## Sistema de agentes (tarefas em multiplas etapas)

O `AgentExecutor` implementa um loop **ReAct** simplificado
(Reason → Act → Observe):

1. O modelo recebe o objetivo e as ferramentas disponiveis.
2. Se o modelo decide chamar uma ferramenta, o executor invoca a
   implementacao correspondente e devolve o resultado ao modelo como
   nova mensagem de contexto.
3. O loop se repete ate o modelo responder com uma resposta final ou
   ate atingir o limite de iteracoes (protecao contra loops infinitos).
4. Cada execucao e persistida (`AgentRun`) para auditoria no painel
   administrativo.

## Memoria de longo prazo e RAG

- **Memoria**: cada interacao relevante e resumida e transformada em
  embedding (via `IModelAdapter.embed`), armazenada na tabela `memories`
  (coluna `vector(1536)`, pgvector). Ao iniciar uma nova mensagem, o
  sistema busca as memorias mais similares semanticamente (`<=>`,
  distancia de cosseno) e injeta esse contexto no prompt do modelo.
- **Documentos (RAG)**: PDFs e arquivos de texto sao divididos em
  "chunks", cada um com seu proprio embedding, permitindo buscas
  semanticas dentro do conteudo dos documentos do usuario.

## Tratamento de erros

Toda a aplicacao usa uma hierarquia de erros de negocio (`AppError` e
subclasses: `NotFoundError`, `UnauthorizedError`, `ForbiddenError`,
`ConflictError`, `ValidationError`). O plugin `error-handler.plugin.ts`
centraliza a conversao desses erros em respostas HTTP consistentes,
evitando `try/catch` repetido nas rotas e impedindo vazamento de detalhes
internos em erros inesperados (500).
