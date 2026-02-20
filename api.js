// api.js
// owns: importable API for other projects — embed texts without HTTP
// deps: Embedder, Config
//
// Usage from another project:
//   import * as Embed from '../my-embed/api.js'
//   const vecs = await Embed.embed(['hello world'])
//   const vec  = await Embed.embedOne('hello world')

import * as Embedder from './components/embed/embedder.js'
import * as Config from './app/config.js'

/**
 * Embed a batch of texts. Lazy-loads the model on first call.
 * @param {string[]} texts
 * @param {string} [model]
 * @returns {Promise<number[][]>}
 */
export async function embed(texts, model = Config.DEFAULT_MODEL) {
  return Embedder.embedBatch(texts, model)
}

/**
 * Embed a single text string.
 * @param {string} text
 * @param {string} [model]
 * @returns {Promise<number[]>}
 */
export async function embedOne(text, model = Config.DEFAULT_MODEL) {
  return Embedder.embedOne(text, model)
}

/**
 * Preload a model into the pool (optional warm-up).
 * @param {string} [model]
 * @returns {Promise<void>}
 */
export async function preload(model = Config.DEFAULT_MODEL) {
  return Embedder.preload(model)
}

/**
 * List currently loaded model names.
 * @returns {string[]}
 */
export function loadedModels() {
  return Embedder.loadedModels()
}

export { Config }
