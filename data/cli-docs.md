# my-embed CLI Reference

Local text embedding service. Runs on-device via native ONNX runtime — no API key needed.

## Usage

```
my embed <command> [options]
```

## Commands

### `my embed embed <text...>`

Embed one or more texts and print a vector preview.

```bash
my embed embed "Hello world"
my embed embed "Hello world" "Fast embeddings" --model Xenova/bge-small-en-v1.5
my embed embed "Hello world" --json    # print raw JSON array
```

| Option | Short | Description |
|--------|-------|-------------|
| `--model` | `-m` | Model name (default: `Xenova/bge-small-en-v1.5`) |
| `--json`  | `-j` | Output raw JSON instead of preview |

---

### `my embed serve`

Start the HTTP embedding server (default port **3721**).

```bash
my embed serve
my embed serve --port 4000
my embed serve --port 4000 --model Xenova/bge-small-en-v1.5
```

| Option | Short | Default | Description |
|--------|-------|---------|-------------|
| `--port`  | `-p` | `3721` | Port to listen on |
| `--model` | `-m` | `Xenova/bge-small-en-v1.5` | Model to preload on startup |

**HTTP API:**

```
POST /embed
  Body: { "texts": ["hello", "world"], "model"?: "..." }
  → { "ok": true, "result": [[...], [...]] }

GET /models
  → { "ok": true, "result": ["Xenova/bge-small-en-v1.5"] }

GET /health
  → { "ok": true, "result": { "status": "ok", "models": [...] } }
```

Example with curl:
```bash
curl -s -X POST http://localhost:3721/embed \
  -H "Content-Type: application/json" \
  -d '{"texts": ["Hello world", "Fast embeddings"]}' | jq .
```

---

### `my embed preload [model]`

Download and cache a model to disk so subsequent runs are instant.

```bash
my embed preload
my embed preload Xenova/bge-small-en-v1.5
my embed preload --model Xenova/bge-base-en-v1.5
```

---

### `my embed models`

List models currently loaded in this process.

```bash
my embed models
```

---

## Importing as a Library

Other projects can import the API directly (no HTTP needed):

```js
import * as Embed from '../my-embed/api.js'

// Batch embed
const vecs = await Embed.embed(['Hello world', 'Fast embeddings'])
console.log(vecs[0].length) // 384

// Single text
const vec = await Embed.embedOne('Hello world')

// Optional warm-up
await Embed.preload()
```

## Default Model

`Xenova/bge-small-en-v1.5` — 384 dimensions, fast on CPU (~100 texts/sec native ONNX).

Other available models:
- `Xenova/bge-base-en-v1.5` — 768 dims, higher quality
- `Xenova/all-MiniLM-L6-v2` — 384 dims, sentence-transformers classic
- `Xenova/nomic-embed-text-v1.5` — 768 dims
