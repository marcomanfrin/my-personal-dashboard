# Command

Dashboard personale popolata da **agenti AI**. Gli agenti leggono le sorgenti (posta, calendario,
GitHub, Trello, planning aziendale…) e scrivono i dati sul server via API REST; il browser li
mostra in un'unica board e rimanda alle sorgenti le azioni dell'utente (segna come fatto, sposta
una card, ack di una PR…).

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="docs/dashboard-dark.png">
  <img alt="La board di Command con i dati demo: attenzione, KPI, posta e calendario" src="docs/dashboard-light.png">
</picture>

- **Widget**: attenzione (cosa richiede un intervento adesso), KPI, posta, calendario, GitHub (PR e
  issue), promemoria, Kanban Trello, Gantt aziendale, progetti.
- **Live**: ogni scrittura arriva al browser via SSE, senza ricaricare.
- **Azioni reversibili**: aggiornamento ottimistico con Undo; le modifiche finiscono in una coda
  (`actions`) che l'agente della sorgente applica al sistema reale.
- **Preferenze per utente**: layout della board, widget nascosti o compressi e sidebar sono salvati
  sul server e seguono l'utente fra dispositivi.
- Tema chiaro/scuro, layout desktop e mobile.

`demo.html` è il prototipo di riferimento per UX e regole di dominio.

## Come funziona

```
 Agenti AI ──PUT /api/ingest/:resource──►┌──────────────┐◄──GET /api/dashboard──── Browser
           ◄─POST /api/actions/claim─────│ Fastify API  │───SSE /api/stream──────► (React)
                                         │  PostgreSQL  │◄──PATCH /api/<r>/:id────
                                         └──────────────┘
```

1. L'agente invia i record con `PUT /api/ingest/:resource` (upsert per `externalId`).
2. Il browser legge lo snapshot da `GET /api/dashboard` e ricalcola in locale priorità, KPI e stato
   dei progetti.
3. Un'azione dell'utente (`PATCH /api/<resource>/:id`) aggiorna subito il record e accoda una riga
   in `actions`.
4. L'agente prende le azioni in carico (`POST /api/actions/claim`), le esegue sulla sorgente e ne
   riporta l'esito (`PATCH /api/actions/:id`).

## Avvio rapido (Docker)

Serve Docker. Tutto lo stack (PostgreSQL, API, web) parte con compose:

```bash
cp .env.example .env
# imposta JWT_SECRET (almeno 32 caratteri):
#   node -e "console.log(crypto.randomBytes(48).toString('base64url'))"
# e controlla TZ, USER_NAME, USER_GITHUB

docker compose up -d --build
docker compose exec server node dist/scripts/seed.js                       # dati demo (facoltativo)
docker compose exec server node dist/scripts/user.js tu@esempio.it --name "Nome Cognome"
```

Apri <http://localhost:8080> e accedi. Le migrazioni vengono applicate all'avvio del server.

| Servizio | Porta | Note |
|---|---|---|
| `web` | 8080 | nginx: serve il frontend e fa da proxy a `/api` (stessa origine, necessaria per il cookie di refresh) |
| `server` | 3000 | API Fastify, a cui si collegano gli agenti |
| `db` | 5432 | PostgreSQL 16, volume `pgdata` |

In produzione, dietro HTTPS, imposta `COOKIE_SECURE=true`.

## Collegare un agente

Crea un agente e il suo token (mostrato una sola volta, in DB ne resta solo l'hash):

```bash
docker compose exec server node dist/scripts/agent-token.js github pulls,issues
# senza risorse = tutte; --rotate emette un nuovo token per un agente esistente
```

Risorse: `emails`, `events`, `pulls`, `issues`, `reminders`, `tasks`, `projects`, `gantt`.
Un agente può scrivere solo sulle risorse del suo scope.

Un ciclo tipico:

```bash
API=http://localhost:3000/api
AUTH="Authorization: Bearer cmd_agent_..."

# 1. apri una run (facoltativo, serve a tracciare esito e statistiche)
curl -X POST $API/agents/runs -H "$AUTH" -H 'content-type: application/json' \
  -d '{ "resource": "reminders" }'

# 2. invia i dati; "replace" cancella i record di questo agente non più presenti
curl -X PUT $API/ingest/reminders -H "$AUTH" -H 'content-type: application/json' -d '{
  "runId": "<id della run>",
  "mode": "replace",
  "items": [
    { "externalId": "todo:42", "title": "Rinnovare certificato", "due": "2026-09-30T09:00:00+02:00", "priority": "high" }
  ]
}'

# 3. applica alla sorgente le azioni fatte dall'utente
curl -X POST $API/actions/claim -H "$AUTH" -H 'content-type: application/json' \
  -d '{ "resource": "reminders", "limit": 10 }'
curl -X PATCH $API/actions/<id> -H "$AUTH" -H 'content-type: application/json' \
  -d '{ "status": "done" }'

# 4. chiudi la run
curl -X PATCH $API/agents/runs/<id> -H "$AUTH" -H 'content-type: application/json' \
  -d '{ "status": "success", "summary": "1 promemoria sincronizzato" }'
```

Regole utili:

- Le date sono sempre ISO 8601 con offset.
- Il formato dei record è definito dagli schemi zod in `packages/shared/src/schemas`
  (`*Input` per l'ingest, `*Patch` per i campi modificabili dall'utente).
- I campi con un'azione utente ancora in coda non vengono sovrascritti dall'ingest: la risposta li
  elenca in `protectedFields`.
- Un'azione presa in carico e non chiusa entro 10 minuti torna disponibile.

L'elenco completo degli endpoint è in [CLAUDE.md](CLAUDE.md#api-prefisso-api).

## Sviluppo

Requisiti: Node.js 22+, Docker per PostgreSQL.

```bash
npm install
cp .env.example .env
docker compose up -d db              # solo il database
npm run db:migrate
npm run db:seed                      # dati demo
npm run user:create -- tu@esempio.it --name "Nome Cognome"
npm run dev                          # API su :3000 (watch) + web su :5173 (proxy /api)
```

| Comando | |
|---|---|
| `npm run dev:api` · `npm run dev:web` | avvia solo una delle due app |
| `npm test` | test unitari (shared), integrazione API su PGlite (senza Docker), frontend su jsdom |
| `npm run typecheck` | controllo dei tipi su tutti i workspace |
| `npm run build` | build di server e web |
| `npm run db:generate` | genera una migrazione dopo aver modificato `apps/server/src/db/schema` |
| `npm run user:reset -- <email>` | nuova password, chiude tutte le sessioni |
| `npm run agent:token -- <nome> [risorse]` | crea un agente e stampa il token |

### Struttura

```
packages/shared   @command/shared  schemi zod (contratto unico) e logica di dominio pura
apps/server       @command/server  Fastify 5, Drizzle, PostgreSQL, auth JWT, SSE
apps/web          @command/web     React 19, Vite, Tailwind v4, TanStack Query
demo.html                          prototipo di riferimento, non modificare
```

Architettura, convenzioni e checklist per aggiungere una risorsa sono in [CLAUDE.md](CLAUDE.md).

## Configurazione

Variabili principali di `.env` (vedi `.env.example`):

| Variabile | Descrizione |
|---|---|
| `JWT_SECRET` | segreto per firmare i token utente, obbligatorio |
| `DATABASE_URL` | connessione PostgreSQL |
| `TZ` | fuso orario dell'owner: definisce "oggi" e "scaduto" |
| `USER_NAME`, `USER_ROLE`, `USER_GITHUB` | owner della dashboard, usato anche per filtrare il Gantt aziendale |
| `CORS_ORIGIN` | origine del frontend in sviluppo |
| `ACCESS_TOKEN_TTL_SECONDS`, `REFRESH_TOKEN_TTL_DAYS` | durata di access token (15 min) e refresh token (7 gg) |
| `LOGIN_RATE_LIMIT` | tentativi di login consentiti per finestra |
| `COOKIE_SECURE` | `true` dietro HTTPS |

## Sicurezza

- Utente: password con scrypt, access token JWT a vita breve tenuto in memoria, refresh token in
  cookie httpOnly ruotato a ogni uso. Il riuso di un refresh già ruotato revoca tutte le sessioni.
- Agenti: token separati con scope per risorsa; un token agente non vale come utente e viceversa.
- Login con rate limit e risposta identica per email inesistente o password errata.
