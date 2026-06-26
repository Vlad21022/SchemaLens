# SchemaLens

A local-first interactive PostgreSQL schema explorer. Connect to any Postgres database and get an instant force-directed graph of your tables, foreign-key relationships, smart insights, and path exploration — all running entirely on your machine.

![SchemaLens screenshot](docs/screenshot.png)

## What it does

- **Instant graph** — connects to Postgres and renders your schema as an interactive force-directed graph in under 10 seconds
- **Visual hierarchy** — tables are classified as Hub, Bridge, Leaf, or Isolated based on their connectivity; each role gets a distinct color, size, and glow
- **Smart insights** — up to 8 human-readable observations about your schema design (orphan tables, overloaded hubs, missing foreign keys, etc.)
- **Node detail panel** — click any table to see its columns, data types, row estimate, in/out degree, and a deterministic summary
- **Path exploration** — select two tables and find the shortest foreign-key path between them, highlighted with animated dashes
- **Insight highlights** — hovering an insight card dims every unrelated table so you can immediately see which nodes it refers to
- **Dark mode only** — designed for developer environments

## Non-goals

This project intentionally has no authentication, no cloud backend, no multi-user support, and no plugin system. It is a local tool.

---

## Tech stack

| Layer | Technology |
|---|---|
| Backend | Python 3.11+, FastAPI, psycopg2-binary, uvicorn |
| Frontend | React 18, TypeScript, Vite, Tailwind CSS |
| Graph | react-force-graph-2d (canvas, d3-force) |
| Animation | Framer Motion |
| Icons | Lucide React |

---

## Getting started

### Prerequisites

- **Python 3.11+**
- **Node.js 18+**
- A running **PostgreSQL** instance you can connect to

### 1. Clone

```bash
git clone https://github.com/Vlad21022/SchemaLens.git
cd SchemaLens
```

### 2. Backend

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate
pip install -r requirements.txt
```

### 3. Frontend

```bash
cd frontend
npm install
```

### 4. Run

From the repo root:

```bash
bash start.sh
```

Or start each server separately:

```bash
# terminal 1 — backend
cd backend && source .venv/bin/activate && uvicorn main:app --reload --port 8000

# terminal 2 — frontend
cd frontend && npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

---

## Connecting to a database

Paste a standard PostgreSQL connection string into the form:

```
postgresql://user:password@localhost:5432/mydb
```

SchemaLens reads from `information_schema` and `pg_stat_user_tables` — read-only, no writes.

### Trying it with a demo database

If you don't have a database handy, you can spin one up with the sample Pagila dataset (a realistic movie rental schema):

```bash
# macOS
brew install postgresql@16
brew services start postgresql@16

createdb pagila
psql pagila < https://raw.githubusercontent.com/devrimgunduz/pagila/master/pagila-schema.sql
psql pagila < https://raw.githubusercontent.com/devrimgunduz/pagila/master/pagila-data.sql
```

Then connect with:
```
postgresql://localhost:5432/pagila
```

---

## Project structure

```
SchemaLens/
├── backend/
│   ├── core/
│   │   ├── extractor.py       # psycopg2 schema extraction (information_schema)
│   │   └── graph.py           # node/edge model, role classification, BFS path finding
│   ├── insights/
│   │   └── engine.py          # schema insight rules (orphans, hubs, missing FKs, etc.)
│   ├── api/
│   │   └── routes.py          # POST /api/connect, POST /api/path, GET /api/health
│   ├── main.py                # FastAPI app entry point, CORS
│   └── requirements.txt
│
├── frontend/
│   └── src/
│       ├── components/
│       │   ├── GraphCanvas.tsx      # Force-directed canvas, hover/selection/path rendering
│       │   ├── InsightPanel.tsx     # Sequential insight reveal, hover highlights
│       │   ├── NodeDetailPanel.tsx  # Per-node detail: columns, role badge, path CTA
│       │   ├── PathExplorer.tsx     # Path result bar (source → hops → destination)
│       │   ├── ConnectionForm.tsx   # DB connection input
│       │   └── StatusBar.tsx        # Top bar: db name, table/edge count, disconnect
│       ├── lib/
│       │   ├── api.ts               # fetch wrappers for backend endpoints
│       │   └── types.ts             # shared TypeScript types
│       └── App.tsx                  # Top-level state machine (idle → loading → connected)
│
└── start.sh                   # Starts both servers
```

---

## API

The backend exposes three endpoints (port 8000):

### `POST /api/connect`

```json
{ "connection_string": "postgresql://user:pass@host:5432/db" }
```

Returns:

```json
{
  "graph": {
    "nodes": [{ "id": "public.users", "name": "users", "schema": "public", "role": "hub", "connectivity": 5, "column_count": 12, "row_estimate": 142000, "summary": "...", "columns": [...] }],
    "edges": [{ "source": "public.orders", "target": "public.users", "label": "user_id" }]
  },
  "insights": [{ "id": "hub_tables", "title": "High-traffic hubs", "body": "...", "affected_tables": ["public.users"] }],
  "table_count": 18,
  "edge_count": 23
}
```

### `POST /api/path`

```json
{ "source_id": "public.orders", "target_id": "public.products" }
```

Returns:

```json
{
  "path": ["public.orders", "public.order_items", "public.products"],
  "description": "...",
  "hop_count": 2
}
```

### `GET /api/health`

Returns `{ "status": "ok" }`.

---

## Node roles

| Role | Color | Meaning |
|---|---|---|
| Hub | Fuchsia | Top 25% by connectivity — central tables most others depend on |
| Bridge | Amber | Connected but not dominant — junction and linking tables |
| Leaf | Blue | Single connection — narrow-purpose or lookup tables |
| Isolated | Grey | No foreign key relationships — audit logs, config tables, etc. |

---

## Contributing

Issues and pull requests are welcome. The codebase is intentionally small — the backend is ~300 lines and the frontend is ~700 lines across all components.

When adding features, the guiding constraint is: **does this help someone understand their schema faster?** If not, it probably doesn't belong here.

---

## License

MIT
