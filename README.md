# API de Agendamentos

 [![Repositório](https://img.shields.io/badge/GitHub-agendamentos--api-181717?logo=github)](https://github.com/gmaaahv88/agendamentos-api) [![Node.js](https://img.shields.io/badge/Node.js-18%2B-339933?logo=nodedotjs)](https://nodejs.org) [![Licença MIT](https://img.shields.io/badge/licen%C3%A7a-MIT-blue)](LICENSE)

Backend em Node.js com autenticação JWT, prevenção de conflito de horário e
processamento assíncrono de notificações via fila (BullMQ + Redis).

Projeto feito como peça de portfólio, mas estruturado como um sistema
real — não um CRUD de exemplo.

## Stack

- **Node.js + Express** — servidor HTTP
- **PostgreSQL + Prisma** — banco de dados e ORM
- **BullMQ + Redis** — fila de processamento em segundo plano
- **JWT** — autenticação (access token + refresh token)
- **Zod** — validação de dados de entrada
- **Swagger (OpenAPI)** — documentação interativa da API
- **Vitest + Supertest** — testes automatizados

## Por que essas escolhas? (resumo das decisões de arquitetura)

- **PostgreSQL em vez de SQLite**: SQLite trava com múltiplas escritas
  simultâneas (comum em produção). Postgres é o padrão que empresas
  esperam ver num backend "sério".
- **Fila (BullMQ) em vez de enviar notificação na hora**: enviar e-mail/WhatsApp
  dentro da mesma requisição deixaria a API lenta e vulnerável a falhas de
  serviços externos. Com fila, a API responde rápido e o processamento
  acontece em segundo plano, num processo separado (o "worker").
- **Access token curto + refresh token longo**: reduz o estrago se um token
  vazar, sem forçar o usuário a logar toda hora.
- **Camadas separadas (routes → controller → service)**: cada uma tem uma
  responsabilidade só. Isso facilita testar o `service` isoladamente (testes
  unitários) sem precisar simular uma requisição HTTP inteira.
- **Prevenção de conflito de horário em duas camadas (aplicação + banco)**:
  a checagem na aplicação (`hasConflict`) cobre o caso comum, mas sozinha
  não impede duas requisições simultâneas de passarem pela checagem ao
  mesmo tempo. Por isso o banco também garante a regra via uma
  `EXCLUDE CONSTRAINT` — ver seção abaixo.

## Prevenção de conflito de horário sob concorrência

A regra "um usuário não pode ter dois agendamentos que se sobrepõem" é
validada de duas formas:

1. **Na aplicação** (`appointments.service.js`, função `hasConflict`): faz um
   `SELECT` antes do `INSERT`, comparando os intervalos de tempo. Rápido e
   cobre o caso comum de uso sequencial.
2. **No banco** (migration `add_no_overlap_constraint`): uma
   `EXCLUDE CONSTRAINT` usando GiST (`btree_gist` + `tstzrange`) garante a
   mesma regra dentro do próprio Postgres.

A segunda camada existe porque a primeira sozinha tem uma condição de
corrida: se duas requisições chegarem quase ao mesmo tempo, as duas podem
fazer o `SELECT` e ver o horário livre *antes* de qualquer uma ter
terminado o `INSERT` — resultando em dois agendamentos conflitantes, mesmo
com testes sequenciais passando. Como o `SELECT` + `INSERT` não roda dentro
de uma transação com lock, é o banco quem garante a integridade final,
rejeitando o segundo `INSERT` com o erro `23P01` (exclusion_violation), que
o `service` traduz para uma resposta `409 Conflict` amigável.

Esse ponto cego foi identificado em uma sugestão do Carlos Moraes nos
comentários do post deste projeto no LinkedIn — crédito a ele pela
observação.

Há um teste dedicado a provar isso na prática, disparando duas criações de
agendamento em paralelo (`Promise.all`, não sequencial) pro mesmo horário:

```bash
npx vitest run tests/integration/race-condition.test.js
```

O teste confirma que só uma das duas requisições é aceita (201) e a outra é
rejeitada (409) — nunca as duas.

## Pré-requisitos

- Node.js 18+ instalado
- Docker e Docker Compose instalados (pra rodar Postgres e Redis sem precisar
  instalar cada um manualmente)

## Passo a passo pra rodar

### 1. Instalar as dependências

```bash
npm install
```

### 2. Subir o banco de dados e o Redis

```bash
docker compose up -d
```

Isso vai deixar rodando: Postgres na porta 5432 e Redis na porta 6379.

### 3. Configurar as variáveis de ambiente

```bash
cp .env.example .env
```

Os valores padrão do `.env.example` já batem com o `docker-compose.yml`,
então normalmente você não precisa mudar nada pra rodar localmente.

### 4. Gerar o client do Prisma e rodar as migrations

```bash
npm run prisma:generate
npm run prisma:migrate
```

O segundo comando vai perguntar um nome pra migration — pode digitar algo
como `init`. Isso cria as tabelas `users` e `appointments` no banco.

### 5. Rodar o servidor

```bash
npm run dev
```

A API vai subir em `http://localhost:3000`. A documentação interativa fica em
`http://localhost:3000/docs` — dá pra testar todos os endpoints direto pelo navegador.

### 6. Rodar o worker (em outro terminal, com o servidor já rodando)

```bash
npm run worker:dev
```

Sem esse comando rodando, os agendamentos são criados normalmente, mas a
notificação fica "presa" na fila (o status nunca vira `CONFIRMED`). É
proposital — mostra bem a separação entre API e processamento em segundo plano.

## Testando manualmente o fluxo completo

1. `POST /auth/register` — crie uma conta
2. Copie o `accessToken` da resposta
3. `POST /appointments` — crie um agendamento, usando o header
   `Authorization: Bearer <accessToken>`
4. Olhe o terminal do worker — em ~1,5s deve aparecer o log da notificação simulada
5. `GET /appointments/:id` — o `status` deve ter virado `CONFIRMED`
6. Tente criar outro agendamento no mesmo horário → deve retornar `409 Conflict`

## Rodando os testes

Os testes de integração usam o banco de verdade (não mockado), então
recomendo criar um banco de teste separado antes:

```bash
# dentro do container do Postgres, ou via psql
CREATE DATABASE agendamentos_test_db;
```

E apontar temporariamente o `DATABASE_URL` do `.env` pra esse banco de teste
antes de rodar `npm run prisma:migrate` nele. Depois:

```bash
npm test
```

Os testes unitários (`tests/unit`) não tocam banco nenhum — usam mocks — então
rodam rápido e não precisam desse setup.

## Estrutura de pastas

```
src/
├── app.js                 # monta o Express (rotas, middlewares) — sem dar listen
├── server.js               # sobe o servidor HTTP de verdade
├── worker.js                # processo separado que consome a fila
├── config/
│   ├── database.js          # instância única do Prisma Client
│   └── redis.js              # conexão com Redis usada pelo BullMQ
├── modules/
│   ├── auth/                 # registro, login, refresh token, middleware de proteção
│   ├── appointments/          # CRUD de agendamentos + regra de conflito de horário
│   └── notifications/          # worker que processa a fila
├── queues/
│   └── notificationQueue.js    # definição da fila BullMQ
├── middlewares/
│   ├── validate.js              # valida req.body contra um schema Zod
│   └── errorHandler.js           # trata erros de forma centralizada
└── docs/
    └── swagger.js                 # gera a documentação OpenAPI a partir dos comentários nas rotas
```

## Próximos passos possíveis (se quiser evoluir o projeto)

- Adicionar WebSocket (Socket.io) pra notificar um dashboard em tempo real
  quando o status de um agendamento muda
- Adicionar retry automático no BullMQ (`attempts` + `backoff`) pra jobs que falham
- Adicionar rate limiting nas rotas de auth (evitar força bruta de login)
- Deploy: API + worker em containers separados, Postgres/Redis gerenciados
  (ex: Railway, Render, Supabase)
