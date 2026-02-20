#!/usr/bin/env node
// app/server.js
// owns: HTTP server entry point, route wiring
// deps: Embedder, Http, Config

import * as Embedder from '../components/embed/embedder.js'
import * as Http from '../access/http.js'
import * as Config from './config.js'

const app = Http.createApp()

// POST /embed
// Body: { texts: string[], model?: string }
// Returns: { result: number[][] }
Http.post(app, '/embed', async (body) => {
  const texts = body.texts
  const model = body.model || Config.DEFAULT_MODEL
  if (!Array.isArray(texts) || texts.length === 0) throw new Error('texts must be a non-empty array')
  return Embedder.embedBatch(texts, model)
})

// GET /models
// Returns: { result: string[] }
Http.get(app, '/models', async () => {
  return Embedder.loadedModels()
})

// GET /health
Http.get(app, '/health', async () => {
  return { status: 'ok', models: Embedder.loadedModels() }
})

// Preload default model(s) then start listening
for (const model of Config.PRELOAD_MODELS) {
  await Embedder.preload(model)
}

const port = await Http.listen(app, Config.DEFAULT_PORT)
console.log(`[my-embed] server listening on http://localhost:${port}`)
console.log(`[my-embed] loaded models: ${Embedder.loadedModels().join(', ')}`)
