// access/embed/models.js
// owns: embedding model lifecycle (init, embed, dispose)
// deps: @huggingface/transformers (npm) — native onnxruntime, ~35x faster than WASM

import { pipeline, env } from '@huggingface/transformers'

// Store models in a local_cache dir alongside the project
env.cacheDir = './local_cache'

// Opaque handle map: integer → HF pipeline instance
const models = new Map()
let nextHandle = 0

/**
 * Initialize a model. Returns an opaque integer handle.
 * modelName should be a HuggingFace repo id e.g. 'Xenova/bge-small-en-v1.5'
 * @param {string} modelName
 * @returns {Promise<number>}
 */
export async function init(modelName) {
  const extractor = await pipeline('feature-extraction', modelName, { dtype: 'fp32' })
  const handle = nextHandle++
  models.set(handle, { extractor, modelName })
  return handle
}

/**
 * Embed a batch of texts. Returns a plain number[][] (one vector per text).
 * @param {number} handle
 * @param {string[]} texts
 * @param {number} [batchSize]
 * @returns {Promise<number[][]>}
 */
export async function embed(handle, texts, batchSize = 256) {
  const entry = models.get(handle)
  if (!entry) throw new Error(`models: unknown handle ${handle}`)
  const output = await entry.extractor(texts, { pooling: 'mean', normalize: true, batch_size: batchSize })
  // output is a Tensor with dims [n, dim] — convert to number[][]
  const [n, dim] = output.dims
  const data = output.data
  const results = []
  for (let i = 0; i < n; i++) {
    results.push(Array.from(data.slice(i * dim, (i + 1) * dim)))
  }
  return results
}

/**
 * Free a model handle.
 * @param {number} handle
 */
export function dispose(handle) {
  models.delete(handle)
}

/**
 * List all active handles.
 * @returns {number[]}
 */
export function listHandles() {
  return [...models.keys()]
}
