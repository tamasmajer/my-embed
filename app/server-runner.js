// app/server-runner.js
// owns: programmatic server startup (used by CLI serve command)
// deps: Embedder, Http, Config

import * as Embedder from '../components/embed/embedder.js'
import * as Http from '../access/http.js'
import * as Config from './config.js'

export default async function startServer({ port = Config.DEFAULT_PORT, model = Config.DEFAULT_MODEL } = {}) {
  const app = Http.createApp()

  Http.post(app, '/embed', async (body) => {
    const texts = body.texts
    const m = body.model || model
    if (!Array.isArray(texts) || texts.length === 0) throw new Error('texts must be a non-empty array')
    return Embedder.embedBatch(texts, m)
  })

  Http.get(app, '/models', async () => Embedder.loadedModels())
  Http.get(app, '/health', async () => ({ status: 'ok', models: Embedder.loadedModels() }))

  await Embedder.preload(model)
  const actualPort = await Http.listen(app, port)
  console.log(`[my-embed] server listening on http://localhost:${actualPort}`)
  console.log(`[my-embed] loaded models: ${Embedder.loadedModels().join(', ')}`)
}
