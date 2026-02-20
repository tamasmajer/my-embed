# my-embed

Local text embedding service for Node.js. Runs **on-device**, no API key, no internet required after first model download.

Uses `@huggingface/transformers` with native `onnxruntime-node` bindings — **~100 texts/sec, ~26ms single-text latency** on a modern CPU.

---

## Quick Start

```bash
npm install
my update          # register with the 'my' CLI
my embed serve     # start HTTP server on port 3721
```

Or run directly:

```bash
node app/server.js
```

---

## CLI

```bash
my embed embed "Hello world"                     # embed text, print preview
my embed embed "Hello" "World" --json            # raw JSON output
my embed serve                                   # start HTTP server
my embed serve --port 4000                       # custom port
my embed preload                                 # download/cache the model
my embed models                                  # list loaded models
```

---

## HTTP API

### `POST /embed`

```bash
curl -s -X POST http://localhost:3721/embed \
  -H "Content-Type: application/json" \
  -d '{"texts": ["Hello world", "Fast embeddings"]}' | jq .
```

```json
{
  "ok": true,
  "result": [
    [0.023, -0.041, ...],
    [0.011, -0.038, ...]
  ]
}
```

**Body:**

| Field    | Type       | Default                      | Description            |
|----------|------------|------------------------------|------------------------|
| `texts`  | `string[]` | required                     | Texts to embed         |
| `model`  | `string`   | `Xenova/bge-small-en-v1.5`   | HuggingFace model id   |

### `GET /health`

```json
{ "ok": true, "result": { "status": "ok", "models": ["Xenova/bge-small-en-v1.5"] } }
```

### `GET /models`

```json
{ "ok": true, "result": ["Xenova/bge-small-en-v1.5"] }
```

---

## Library API

Import directly from another Node.js project — no HTTP round-trip:

```js
import * as Embed from '../my-embed/api.js'

// Batch
const vecs = await Embed.embed(['Hello world', 'Fast embeddings'])
console.log(vecs[0].length) // 384

// Single
const vec = await Embed.embedOne('Hello world')

// Optional warm-up (avoids cold start on first call)
await Embed.preload()
```

---

## Performance

Benchmarked on Intel i5, `Xenova/bge-small-en-v1.5` (384 dims):

| Metric             | Result       |
|--------------------|--------------|
| Single text        | ~26ms        |
| 512 texts (batch)  | ~5s (~100/s) |
| Cold start (init)  | ~500ms       |

> The server pre-warms the model on startup, so the HTTP API never pays the cold start cost.

---

## Default Model

`Xenova/bge-small-en-v1.5` — 384 dimensions, ~33MB, English.

Other drop-in options:

| Model                          | Dims | Notes                        |
|-------------------------------|------|------------------------------|
| `Xenova/bge-small-en-v1.5`    | 384  | default, fast                |
| `Xenova/bge-base-en-v1.5`     | 768  | higher quality               |
| `Xenova/all-MiniLM-L6-v2`     | 384  | sentence-transformers classic|
| `Xenova/nomic-embed-text-v1.5`| 768  | long context                 |

---

## Project Structure

```
access/embed/models.js       embedding model backend (init, embed, dispose)
access/http.js               express/cors wrapper
app/cli.js                   'my embed' CLI registration
app/server.js                HTTP server entry point
app/server-runner.js         programmatic server startup
app/config.js                DEFAULT_MODEL, DEFAULT_PORT
components/embed/embedder.js model pool + batch/single embed logic
api.js                       importable library API
data/cli-docs.md             full CLI reference
STYLE.md                     code style guide (Flat JS)
```

---

## Contributing / Code Style

This project follows **Flat JS** — see [`STYLE.md`](./STYLE.md) for the full guide.

### Key rules

**Folder roles**

| Folder | Purpose |
|--------|---------|
| `app/` | Entry points only. Imports from `components/` and `access/`. Nothing imports from here. |
| `components/<domain>/` | Feature logic. Imports only from `access/` and its own folder. Never from other components. |
| `access/<domain>/` | Thin wrappers around npm/Node. One external dependency per file. |
| `dev/` | Scratch scripts, benchmarks, experiments. Not wired into the main graph. |

**Import style**

```js
// Always namespace imports — never named/destructured
import * as Models  from '../access/embed/models.js'
import * as Embedder from '../components/embed/embedder.js'

Models.embed(handle, texts)   // greppable: module is always visible at the call site
```

**Access modules**

- Export flat functions only — no classes, no objects with methods
- Use opaque integer handles for stateful resources:

```js
const handle = await Models.init('Xenova/bge-small-en-v1.5')
const vecs   = await Models.embed(handle, texts)
Models.dispose(handle)
```

**Adding a new model backend**

1. Create `access/embed/<new-backend>.js` — export `init`, `embed`, `dispose`
2. Update `components/embed/embedder.js` to call it
3. Nothing else changes (`api.js`, `app/`, HTTP server stay untouched)

