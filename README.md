# my-embed

Local text embedding service for Node.js. Runs **on-device**, no API key, no internet required after first model download.

Uses `@huggingface/transformers` with native `onnxruntime-node` bindings — **~800 texts/sec, ~7ms single-text latency** on a modern CPU.

**Two ways to use it:** Node.js library · HTTP server

---

## Quick Start

```bash
npm install
```

### As a library

```js
import * as Embed from 'my-embed/api.js'

await Embed.preload()                              // optional warm-up
const vecs = await Embed.embed(['Hello world'])    // number[][]
console.log(vecs[0].length)                        // 384
```

### As an HTTP server

```bash
node app/server.js     # starts on port 3721
```

---

## Library API

Import directly from another Node.js project — no HTTP round-trip.

```js
import * as Embed from 'my-embed/api.js'

const vecs = await Embed.embed(['Hello world', 'Fast embeddings'])
console.log(vecs[0].length) // 384
```

### `embed(texts)` → `Promise<number[][]>`

Embed a batch of texts. Lazy-loads the model on first call.

### `preload()` → `Promise<void>`

Pre-warm the model so the first `embed()` call doesn't pay the ~500ms init cost.

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
| `model`  | `string`   | `Xenova/multilingual-e5-small` | HuggingFace model id   |

### `GET /health`

```json
{ "ok": true, "result": { "status": "ok", "models": ["Xenova/multilingual-e5-small"] } }
```

### `GET /models`

```json
{ "ok": true, "result": ["Xenova/multilingual-e5-small"] }
```

---

## Performance

Benchmarked on Intel i5, `Xenova/multilingual-e5-small` (384 dims):

| Metric             | Result         |
|--------------------|----------------|
| Single text        | ~7ms           |
| 100 texts (batch)  | ~120ms (812/s) |
| 512 texts (batch)  | ~665ms (770/s) |
| 1024 texts (batch) | ~1.4s (726/s)  |
| Cold start (init)  | ~500ms         |

> The server pre-warms the model on startup, so the HTTP API never pays the cold start cost.

### Stress test

`dev/stress-test.js` — 17 tests:

- **Basics**: single/batch embed, normalization, determinism
- **Edge cases**: empty string, 10k-char text, unicode/emoji, empty array rejection
- **Batch sizes**: 10, 50, 100, 256, 512 texts
- **Concurrency**: 10 simultaneous `embed()` calls

`Xenova/multilingual-e5-small` was also tested (23 tests) with cross-language retrieval — Hungarian queries correctly matched English documents in 4/5 cases, with similarity scores 0.80–0.87 across 10 languages.

```bash
node dev/stress-test.js
```

---

## Default Model

`Xenova/multilingual-e5-small` — 384 dimensions, ~118MB, 100+ languages.

Other drop-in options:

| Model                          | Dims | Notes                              |
|-------------------------------|------|------------------------------------|
| `Xenova/multilingual-e5-small`| 384  | default, 100+ languages            |
| `Xenova/bge-small-en-v1.5`    | 384  | fast, English-only                 |
| `Xenova/bge-base-en-v1.5`     | 768  | higher quality, English            |
| `Xenova/all-MiniLM-L6-v2`     | 384  | sentence-transformers classic      |
| `Xenova/nomic-embed-text-v1.5`| 768  | long context                       |

---

## Project Structure

```
api.js                               public library API (embed, preload)
access/embed/models.js               embedding model backend (init, embed, dispose)
access/http.js                       express/cors wrapper
app/server.js                        HTTP server entry point
app/config.js                        DEFAULT_MODEL, DEFAULT_PORT
components/embed/embedder.js         model pool + batch/single embed logic
STYLE.md                             code style guide (Static JS Refs)
dev/                                 scratch scripts, benchmarks (not part of main graph)
```

---

## Contributing / Code Style

This project follows **Static JS Refs** — see [`STYLE.md`](./STYLE.md) for the full guide.

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
