# Flat JS — my-embed Style Guide

Same rules as the workspace STYLE.md, applied here.

## Folder Structure

```
app/              entry points (cli.js, server.js, server-runner.js, config.js)
components/       feature modules by domain
  embed/          model pool, batching logic
access/           npm/node wrappers — subfolders group by domain
  embed/          embedding backend (models.js)
  http.js         HTTP server wiring
data/             docs, non-code files
api.js            importable API for other projects (no HTTP)
```

## Import Convention

```js
import * as Models from '../../access/models.js'   // namespace, CamelCase
import * as Embedder from '../components/embed/embedder.js'

Models.init(modelName)           // greppable: module always visible
Embedder.embedBatch(texts, model)
```

- **All** local imports use `import * as Name` — never named/destructured
- npm packages only appear inside `access/` files
- `app/` imports from `components/` and `access/` — nothing imports from `app/`
- `components/embed/` imports only from `access/` and its own folder

## Access Module Rules

- Export flat functions only — no classes, no objects with methods
- Opaque handles for stateful external resources (see `access/models.js`)
- No cross-imports between access modules

## State Pattern

Model pool state lives in `components/embed/embedder.js` as a module-level plain object:

```js
const pool = {}   // modelName → model handle (integer)
```

Functions receive/return plain data; callers never touch library objects directly.

## Adding a New Model Provider

1. Create `access/<role>.js` — wrap the npm SDK, export `init`, `embed`, `dispose`
2. Use an opaque integer handle pattern (see `access/models.js`)
3. Update `components/embed/embedder.js` to call the new access module
4. No changes needed in `app/` or `api.js`

## Anti-patterns to Avoid

```js
// BAD — named import, not greppable as Module.func()
import { pipeline } from '@huggingface/transformers'
pipeline(...)   // belongs in access/ only

// BAD — component importing another component
import * as Http from '../../access/../components/other/x.js'

// BAD — method called on returned object outside its module
const model = await Models.init(name)
model.embed(texts)   // model is opaque! use Models.embed(handle, texts)
```
