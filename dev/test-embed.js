// dev/test-embed.js
// Quick smoke test for the models access layer and embedder component

import * as Models from '../access/embed/models.js'
import * as Embedder from '../components/embed/embedder.js'

const MODEL = 'Xenova/bge-small-en-v1.5'

console.log('--- access/models.js ---')
console.log('Initializing model via Models.init()...')
const handle = await Models.init(MODEL)
console.log('Handle:', handle)

const vecs = await Models.embed(handle, ['Hello world', 'Fast on CPU'])
console.log(`Vectors: ${vecs.length}, dim: ${vecs[0].length}`)
console.log('vec[0] preview:', vecs[0].slice(0, 5))
Models.dispose(handle)
console.log('Disposed. Active handles:', Models.listHandles())

console.log('\n--- components/embed/embedder.js ---')
const batch = await Embedder.embedBatch(['Query: hello', 'passage: world'], MODEL)
console.log(`Batch: ${batch.length} vectors, dim: ${batch[0].length}`)

const one = await Embedder.embedOne('single text', MODEL)
console.log(`Single: dim=${one.length}`)

console.log('Loaded models:', Embedder.loadedModels())
console.log('\n✓ All tests passed')
