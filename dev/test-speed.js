// dev/test-speed.js
// Speed benchmark for fastembed with Snowflake arctic-embed-xs
// Tests: cold start, warm throughput at different batch sizes

import { FlagEmbedding, EmbeddingModel } from 'fastembed'

const MODEL = EmbeddingModel.BGESmallEN
console.log('Using model:', MODEL)

// --- Helpers ---

function randomText(len = 40) {
  const words = ['hello', 'world', 'fast', 'embedding', 'test', 'batch', 'vector', 'cpu', 'node', 'js', 'latency', 'throughput']
  const out = []
  for (let i = 0; i < len / 5; i++) out.push(words[Math.floor(Math.random() * words.length)])
  return out.join(' ')
}

async function runBatch(model, texts, batchSize) {
  const results = []
  for await (const batch of model.embed(texts, batchSize)) {
    for (const vec of batch) results.push(vec)
  }
  return results
}

async function bench(label, fn) {
  const t0 = performance.now()
  const result = await fn()
  const ms = performance.now() - t0
  return { label, ms, result }
}

// --- Init (cold start) ---
console.log('\n[1] Cold start (model init)...')
const { ms: initMs, result: model } = await bench('init', () =>
  FlagEmbedding.init({ model: MODEL })
)
console.log(`  Init time: ${initMs.toFixed(0)}ms`)

// --- Warm-up ---
console.log('\n[2] Warm-up (5 texts)...')
const { ms: warmMs } = await bench('warmup', () => runBatch(model, Array.from({ length: 5 }, () => randomText()), 5))
console.log(`  Warm-up: ${warmMs.toFixed(0)}ms`)

// --- Batch size sweep ---
const TOTAL_TEXTS = 512
const texts = Array.from({ length: TOTAL_TEXTS }, () => randomText())

console.log(`\n[3] Throughput sweep — ${TOTAL_TEXTS} texts, varying batch size`)
console.log('  batchSize | total ms | texts/sec | ms/text')
console.log('  ----------|----------|-----------|--------')

for (const batchSize of [1, 8, 32, 64, 128, 256]) {
  const { ms } = await bench(`batch=${batchSize}`, () => runBatch(model, texts, batchSize))
  const tps = (TOTAL_TEXTS / (ms / 1000)).toFixed(0)
  const msPer = (ms / TOTAL_TEXTS).toFixed(2)
  console.log(`  ${String(batchSize).padEnd(10)}| ${String(ms.toFixed(0)).padEnd(9)}| ${String(tps).padEnd(11)}| ${msPer}`)
}

// --- Single-text latency ---
console.log('\n[4] Single-text latency (20 calls, 1 text each)')
const latencies = []
for (let i = 0; i < 20; i++) {
  const { ms } = await bench('single', () => runBatch(model, [randomText()], 1))
  latencies.push(ms)
}
latencies.sort((a, b) => a - b)
const avg = latencies.reduce((s, x) => s + x, 0) / latencies.length
console.log(`  avg: ${avg.toFixed(1)}ms  p50: ${latencies[10].toFixed(1)}ms  p95: ${latencies[18].toFixed(1)}ms  min: ${latencies[0].toFixed(1)}ms`)

// --- Dims ---
const [sampleVec] = await runBatch(model, ['dim check'], 1)
console.log(`\n[5] Model dimensions: ${sampleVec.length}`)

console.log('\n✓ Benchmark complete')
