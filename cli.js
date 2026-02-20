// cli.js
// owns: 'my' CLI integration — registers this project with the 'my' CLI ecosystem
// deps: Embedder, Config
//
// This file is OPTIONAL. The project works fully without it:
//   - As an HTTP server:  node app/server.js
//   - As a library:       import * as Embed from './api.js'
//
// This file is only needed if you use the 'my' CLI:
//   my update           -- register this project
//   my embed serve      -- start the HTTP server
//   my embed embed "…"  -- embed text from the terminal

import * as Embedder from './components/embed/embedder.js'
import * as Config from './app/config.js'

// ---------------------------------------------------------------------------
// 'my' registration object — tells 'my' the name, description, and commands
// ---------------------------------------------------------------------------

export const cli = {
  name: 'embed',
  description: 'Local text embedding service (on-device, no API key needed)',
  commands: {
    embed: {
      description: 'Embed one or more texts and print vectors',
      args: ['texts...'],
      options: {
        model: { alias: 'm', type: 'string', description: `Model to use (default: ${Config.DEFAULT_MODEL})` },
        json: { alias: 'j', type: 'boolean', description: 'Output raw JSON array' },
      },
    },
    serve: {
      description: 'Start the HTTP embedding server',
      options: {
        port: { alias: 'p', type: 'number', description: `Port to listen on (default: ${Config.DEFAULT_PORT})` },
        model: { alias: 'm', type: 'string', description: `Model to preload (default: ${Config.DEFAULT_MODEL})` },
      },
    },
    models: {
      description: 'List currently loaded models',
    },
    preload: {
      description: 'Download and cache a model',
      args: ['model?'],
      options: {
        model: { alias: 'm', type: 'string', description: 'Model name to preload' },
      },
    },
  },
}

// ---------------------------------------------------------------------------
// Command implementations
// ---------------------------------------------------------------------------

export async function embed(texts, opts = {}) {
  const model = opts.model || Config.DEFAULT_MODEL
  if (!texts || texts.length === 0) {
    console.error('Usage: my embed embed <text> [more texts...] [--model <model>]')
    return
  }
  const vecs = await Embedder.embedBatch(texts, model)
  if (opts.json) return vecs
  for (let i = 0; i < vecs.length; i++) {
    const v = vecs[i]
    const preview = v.slice(0, 6).map(x => x.toFixed(4)).join(', ')
    console.log(`[${i}] dim=${v.length}  [${preview} ...]`)
  }
  return vecs
}

export async function serve(opts = {}) {
  const port = opts.port || Config.DEFAULT_PORT
  const model = opts.model || Config.DEFAULT_MODEL
  const { default: startServer } = await import('./app/server-runner.js')
  await startServer({ port, model })
}

export async function models() {
  const loaded = Embedder.loadedModels()
  if (loaded.length === 0) console.log('(no models loaded in this process)')
  else for (const m of loaded) console.log(m)
  return loaded
}

export async function preload(model, opts = {}) {
  const modelName = model || opts.model || Config.DEFAULT_MODEL
  console.log(`Preloading: ${modelName}`)
  await Embedder.preload(modelName)
  console.log(`Done: ${modelName}`)
  return { model: modelName }
}
