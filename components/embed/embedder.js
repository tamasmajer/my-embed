// components/embed/embedder.js
// owns: model pool, batch embedding logic, model lifecycle management
// deps: Models

import * as Models from '../../access/embed/models.js'

// Pool state: model name → handle
const pool = {}

/**
 * Get or initialize the handle for a given model.
 * @param {string} modelName
 * @returns {Promise<number>}
 */
async function getHandle(modelName) {
  if (pool[modelName] === undefined) {
    console.log(`[embedder] loading model: ${modelName}`)
    pool[modelName] = await Models.init(modelName)
    console.log(`[embedder] model ready: ${modelName} (handle=${pool[modelName]})`)
  }
  return pool[modelName]
}

/**
 * Embed a batch of texts with a given model.
 * @param {string[]} texts
 * @param {string} modelName
 * @returns {Promise<number[][]>}
 */
export async function embedBatch(texts, modelName) {
  if (!Array.isArray(texts) || texts.length === 0) throw new Error('texts must be a non-empty array')
  const handle = await getHandle(modelName)
  return Models.embed(handle, texts)
}

/**
 * Embed a single text string.
 * @param {string} text
 * @param {string} modelName
 * @returns {Promise<number[]>}
 */
export async function embedOne(text, modelName) {
  const [vec] = await embedBatch([text], modelName)
  return vec
}

/**
 * Preload a model into the pool (warm-up).
 * @param {string} modelName
 * @returns {Promise<void>}
 */
export async function preload(modelName) {
  await getHandle(modelName)
}

/**
 * Return loaded model names.
 * @returns {string[]}
 */
export function loadedModels() {
  return Object.keys(pool)
}

/**
 * Unload a model, freeing its handle.
 * @param {string} modelName
 */
export function unload(modelName) {
  if (pool[modelName] !== undefined) {
    Models.dispose(pool[modelName])
    delete pool[modelName]
  }
}
