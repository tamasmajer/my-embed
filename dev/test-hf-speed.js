// dev/test-hf-speed.js
// Compare @huggingface/transformers (native ONNX) vs fastembed (WASM?)
// Uses same BGE-small model family for a fair comparison

import { pipeline, env } from '@huggingface/transformers'
import { FlagEmbedding, EmbeddingModel } from 'fastembed'

// Keep HF models in local cache alongside fastembed's
env.cacheDir = './local_cache'

const TEXTS_512 = Array.from({ length: 512 }, (_, i) =>
  `This is test sentence number ${i} about embeddings and vector search`
)
const TEXTS_SINGLE = ['Hello world, this is a single text embedding test']

async function bench(label, fn) {
  const t0 = performance.now()
  const result = await fn()
  const ms = performance.now() - t0
  return { label, ms, result }
}

// ─── fastembed (baseline) ─────────────────────────────────────────────────
console.log('════ fastembed (current) ════')
const feModel = await FlagEmbedding.init({ model: EmbeddingModel.BGESmallEN })

// single text
{
  const runs = []
  for (let i = 0; i < 5; i++) {
    const { ms } = await bench('single', async () => {
      const r = []
      for await (const b of feModel.embed(TEXTS_SINGLE, 1)) for (const v of b) r.push(v)
      return r
    })
    runs.push(ms)
  }
  const avg = runs.reduce((s, x) => s + x, 0) / runs.length
  console.log(`  single (avg 5): ${avg.toFixed(0)}ms`)
}

// batch 512
{
  const { ms } = await bench('batch512', async () => {
    const r = []
    for await (const b of feModel.embed(TEXTS_512, 256)) for (const v of b) r.push(v)
    return r
  })
  console.log(`  512 texts:      ${ms.toFixed(0)}ms  →  ${(512 / (ms / 1000)).toFixed(0)} texts/sec`)
}

// ─── @huggingface/transformers (native ONNX) ────────────────────────────
console.log('\n════ @huggingface/transformers (native ONNX) ════')
console.log('  Loading pipeline (downloads model on first run)...')
const extractor = await pipeline('feature-extraction', 'Xenova/bge-small-en-v1.5', {
  dtype: 'fp32',
})
console.log('  Pipeline ready.')

// single text
{
  const runs = []
  for (let i = 0; i < 5; i++) {
    const { ms } = await bench('single', () =>
      extractor(TEXTS_SINGLE, { pooling: 'mean', normalize: true })
    )
    runs.push(ms)
  }
  const avg = runs.reduce((s, x) => s + x, 0) / runs.length
  console.log(`  single (avg 5): ${avg.toFixed(0)}ms`)
}

// batch 512
{
  const { ms, result } = await bench('batch512', () =>
    extractor(TEXTS_512, { pooling: 'mean', normalize: true, batch_size: 256 })
  )
  const dim = result.dims[result.dims.length - 1]
  console.log(`  512 texts:      ${ms.toFixed(0)}ms  →  ${(512 / (ms / 1000)).toFixed(0)} texts/sec  dim=${dim}`)
}

console.log('\n✓ Done — compare the two blocks above for speedup factor')
