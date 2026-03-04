// api.js
// owns: public library API — embed texts locally, no HTTP needed
// deps: Embedder, Config
//
// Usage:
//   import * as Embed from 'my-embed/api.js'
//   const vecs = await Embed.embed(['hello world', 'fast embeddings'])

import * as Embedder from './components/embed/embedder.js'
import * as Config from './app/config.js'

/**
 * Embed a batch of texts. Lazy-loads the model on first call.
 * @param {string[]} texts
 * @returns {Promise<number[][]>}
 */
export async function embed(texts) {
  return Embedder.embedBatch(texts, Config.DEFAULT_MODEL)
}

/**
 * Preload the model (optional warm-up, avoids cold start on first embed call).
 * @returns {Promise<void>}
 */
export async function preload() {
  return Embedder.preload(Config.DEFAULT_MODEL)
}
