# CLAUDE.md

## Cos'è questo progetto

**Command** è una dashboard personale (pannello di controllo) popolata da **agenti AI autonomi**.
Gli agenti esplorano le sorgenti con i loro connettori (Gmail/Outlook, Google/Outlook Calendar,
GitHub, Trello, planning aziendale, …) e **scrivono i dati sul server via API REST**. Il frontend
React legge i dati dal server e li mostra; le azioni dell'utente (segna come fatto, ack, sposta
card…) vengono salvate sul server e messe in coda perché l'agente della sorgente le propaghi
al sistema reale.

`demo.html` è il **riferimento UX/funzionale**: design system, widget, logica di priorità
("attention engine"), KPI. Non va modificato; quando si implementa un widget o una regola di
dominio si parte da lì.

## Architettura

```
 Agenti AI (connettori)                       Browser
   │  PUT /api/ingest/:resource                  ▲  GET /api/dashboard, /api/<resource>
   │  POST/PATCH /api/agents/runs                │  PATCH /api/<resource>/:id  (azioni utente)
   │  POST /api/actions/claim, PATCH /:id        │  GET /api/stream  (SSE: data.changed …)
   ▼                                             │
 ┌──────────────────────── apps/server (Fastify) ────────────────────────┐
 │ routes → service → repository ── Drizzle ──► PostgreSQL                │
 │                 └─► events-bus ──► SSE                                  │
 │ tabella `actions` = outbox delle azioni utente, consumata dagli agenti │
 └────────────────────────────────────────────────────────────────────────┘
          ▲ tipi, schemi zod, logica di dominio: packages/shared
```

Flussi chiave:
- **Ingest agente**: `PUT /api/ingest/:resource` con `{ runId?, mode: 'merge'|'replace', items[] }`.
  Upsert per `externalId`. `replace` cancella i record *di quell'agente* non più presenti.
  I campi con azioni utente ancora `pending`/`claimed` non vengono sovrascritti dall'ingest.
- **Azione utente**: `PATCH /api/<resource>/:id` aggiorna subito il record e crea una riga in
  `actions` (`{ changes, previous }`). Undo = PATCH con i valori precedenti.
- **Consumo azioni**: l'agente fa `POST /api/actions/claim { resource, limit }`, esegue sul
  sistema reale, poi `PATCH /api/actions/:id { status: 'done'|'failed', result }`.
- **Live**: ogni scrittura emette un evento sull'events-bus, inoltrato via SSE; il frontend
  re-fetcha la risorsa indicata.

## API (prefisso `/api`)

| Metodo e path | Auth | Scopo |
|---|---|---|
| `GET /dashboard` | user | snapshot + `attention`, `upcoming`, `kpis`, `projects`, `conflicts`, `sources` |
| `POST /auth/login` | — | `{ email, password }` → `TokenResponse` + cookie refresh (rate limit) |
| `POST /auth/refresh` · `POST /auth/logout` | cookie | ruota il refresh e dà un nuovo JWT · revoca e cancella il cookie |
| `GET /auth/me` | user | account corrente |
| `GET /preferences` · `PATCH /preferences` | user | preferenze dell'utente (`Preferences` in `@command/shared`: layout della board, widget collassati, sidebar); il PATCH sostituisce solo le chiavi inviate |
| `GET /sources` | any | freschezza per risorsa |
| `GET /<resource>`, `GET /<resource>/:id` | any | `emails` (`?category`), `events` (`?from&to`), `pulls`, `issues`, `reminders` (`?done`), `tasks` (`?column&board`), `projects`, `gantt` (`?assignee=me`) |
| `PATCH /<resource>/:id` | user | campi modificabili: vedi `*Patch` in `@command/shared` (`events`, `projects` sono read-only) |
| `POST /reminders`, `DELETE /reminders/:id` | user | promemoria locali (`externalId` = `local:<uuid>`) |
| `POST /gantt/recalc` | user | ripianifica per dipendenze, restituisce `previous` per l'undo |
| `PUT /ingest/:resource` | agent | bulk upsert, `mode: merge\|replace`, `runId` opzionale |
| `POST /agents/runs`, `PATCH /agents/runs/:id` | agent | apertura/chiusura run (stato, summary, errore) |
| `GET /agents/me` · `GET /agents` | agent · user | identità agente · elenco agenti + run recenti |
| `GET /actions` · `POST /actions/claim` · `PATCH /actions/:id` | any · agent · agent | outbox: lista, claim atomico (SKIP LOCKED, claim scaduti dopo 10 min), esito |
| `GET /stream` | user (anche `?access_token=`) | SSE: `ready`, `data.changed`, `agent.run`, `action.updated`, `preferences.changed` |

`GET /health` (fuori prefisso) → `{ ok }`, 503 se il DB non risponde. Errori sempre in forma
`ApiError { error, message, issues? }`.

## Struttura (npm workspaces)

```
packages/shared/      @command/shared — contratto unico server/web/agenti
  src/schemas/        schemi zod, uno per entità; i tipi TS sono z.infer
  src/domain/         logica pura (status, attention, kpis, progetti), senza I/O
apps/server/          @command/server — Fastify 5 + Drizzle + PostgreSQL
  src/config/         env validato con zod
  src/db/schema/      una tabella per file
  src/db/migrations/  generate da drizzle-kit (non editare a mano)
  src/plugins/        db, auth, events-bus, error-handler
  src/lib/            utilità condivise (resource-repository generico, validazione, http errors)
  src/modules/<m>/    routes.ts · service.ts · repository.ts
  test/               vitest + app.inject su PGlite (Postgres in-process, niente Docker)
apps/web/             @command/web — React 19 + Vite + Tailwind v4 + TanStack Query
  src/styles/         index.css: token di demo.html → tema Tailwind (bg-surface, text-fg-2, bg-c/12…)
  src/auth/           session.ts (JWT in memoria, refresh single-flight e proattivo), AuthGate
  src/api/            client (Bearer + retry dopo refresh su 401), endpoints, queryClient
  src/hooks/          useDashboard (dati + insight calcolati nel browser), useActions (mutazioni
                      ottimistiche + toast con Undo), useLiveUpdates (SSE), useNow, useTheme
  src/components/     ui/ (Card, Pill, Chip, Segmented, Icon…), feedback/ (Toast, Tooltip)
  src/layout/         Sidebar/BottomNav, Topbar, SearchBox, NotificationsMenu, Greeting, sections
  src/drawer/         DrawerContext, DrawerShell (focus trap, Esc), DrawerHost
  src/features/<w>/   un widget per cartella: attention, kpis, mail, calendar, github,
                      reminders, trello, gantt, projects, profile (card, righe, drawer)
  test/               vitest + jsdom + Testing Library, fetch/EventSource finti
demo.html             riferimento UX, non toccare
```

## Convenzioni

- **Una sola fonte di verità per i tipi**: schemi zod in `@command/shared`. Mai ridefinire una
  forma dati nel server o nel web; importarla. Sul filo le date sono stringhe ISO 8601.
- **Moduli a strati**: `routes` (HTTP, validazione, auth) → `service` (regole, eventi, outbox)
  → `repository` (solo Drizzle). Niente query nelle routes, niente `request`/`reply` nei service.
- **Dominio puro**: le funzioni in `shared/src/domain` ricevono dati + `now` e restituiscono
  valori; niente I/O, niente formattazione testuale (quella è del frontend). Test unitari.
- **Record di sorgente**: ogni tabella di risorsa ha `id` (uuid), `externalId` (unico),
  `agentId`, `syncedAt`, `updatedAt`. I riferimenti fra risorse usano chiavi stabili
  (es. `GanttTask.projectKey` → `Project.key`, `dependsOn` → `GanttTask.key`).
- **Auth**, due identità distinte (`plugins/auth.ts`: `app.auth.user | agent | any | stream`):
  - *Utente*: login email+password (scrypt) → **access token JWT** HS256 (15 min, `iss=command`,
    `aud=command-dashboard`) nel body, da inviare come `Authorization: Bearer`; **refresh token**
    opaco (7 gg) solo in cookie `cmd_refresh` httpOnly, SameSite=Strict, path `/api/auth`, salvato
    come sha256 e **ruotato** a ogni refresh. Riuso di un token già ruotato (oltre 30 s di grazia)
    = furto → revoca di tutte le sessioni dell'utente. Cambio password → revoca tutte le sessioni.
    Login rate-limited, stessa risposta per email inesistente e password errata.
  - *Agente*: token `cmd_agent_…` (in DB solo sha256) con `scopes` sulle risorse. Un JWT utente non
    vale come agente e viceversa; le GET di lettura accettano entrambi.
  - SSE: `EventSource` non manda header, quindi `/api/stream` accetta anche `?access_token=<jwt>`.
- **Frontend**: un solo fetch (`GET /api/dashboard`); attention/KPI/progetti sono ricalcolati nel
  browser con `buildInsights` di `@command/shared`, così aggiornamenti ottimistici e scorrere del
  tempo si vedono subito. SSE → invalidate della query (debounce 300 ms). Ogni azione utente passa
  da `useActions` (patch ottimistica, rollback su errore, Undo = PATCH coi valori precedenti).
  Componenti di presentazione piccoli, stato UI locale al widget; testi in inglese come la demo.
- **Stile**: Tailwind v4 con i token CSS della demo (tema chiaro/scuro via variabili, niente `dark:`).
  Colore di segnale per elemento con `--c`: classi `lvl-*`, `st-*`, `cat-*`, `lbl-*` + `text-c`,
  `bg-c/12`. Le classi costruite a runtime vanno aggiunte al safelist `@source inline(...)` in
  `index.css`. CSS custom solo dove Tailwind non basta (select, switch, checkbox, clip del Gantt).
- **Nuova risorsa**: schema in `shared/src/schemas` + voce in `RESOURCE_SCHEMAS`, tabella in
  `db/schema` + `RESOURCE_TABLES`, modulo `modules/<r>/` (repository su `createResourceRepository`,
  service su `createResourceService`), voce in `modules/registry.ts` e `modules/resources.ts`,
  route in `API_MODULES` (`app.ts`), poi `npm run db:generate`.
- Il fuso orario del server (`TZ`) definisce "oggi"/"scaduto": deve essere quello dell'owner.
- Codice, identificatori e commenti in inglese; documentazione di progetto in italiano.

## Comandi

Stack completo in Docker (db + server + web), da `.env` con `JWT_SECRET` impostato:

```bash
docker compose up -d --build         # web http://localhost:8080 · API per gli agenti http://localhost:3000
docker compose exec server node dist/scripts/seed.js          # dati demo (una volta)
docker compose exec server node dist/scripts/user.js <email> --name "Nome"
docker compose exec server node dist/scripts/agent-token.js <nome> [risorse]
docker compose logs -f server
```

Il server applica le migrazioni all'avvio. `web` è nginx: serve la build e fa da proxy a
`/api` (SSE senza buffering), così browser e API sono sulla stessa origine e il cookie di refresh
funziona. Immagini in `apps/server/Dockerfile`, `apps/web/Dockerfile` (+ `nginx.conf`), contesto di
build = root del repo. Per sviluppare con hot reload si usa `npm run dev` sull'host (solo `db` in Docker:
`docker compose up -d db`).

```bash
npm install
docker compose up -d db              # solo PostgreSQL 16 su localhost:5432
cp .env.example .env
npm run db:migrate                   # applica le migrazioni
npm run db:seed                      # carica i dati mock della demo
npm run user:create -- <email> --name "Nome"  # crea l'utente (password chiesta a terminale)
npm run user:reset -- <email>        # nuova password, chiude tutte le sessioni
npm run dev                          # API (:3000, watch) + web (:5173, proxy /api) insieme
npm run dev:api | npm run dev:web    # uno solo dei due
npm run agent:token -- <nome> [risorse,...]   # crea un agente e stampa il token
npm run db:generate                  # dopo aver modificato src/db/schema/*
npm test                             # unit (shared) + integrazione (server, PGlite)
npm run typecheck
```
