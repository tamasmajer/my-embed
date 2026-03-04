// dev/stress-test.js
// Stress test: edge cases, large batches, concurrent calls, API surface

import * as Embed from '../api.js'

const PASS = []
const FAIL = []

async function test(name, fn) {
  try {
    await fn()
    PASS.push(name)
    console.log(`  ok  ${name}`)
  } catch (err) {
    FAIL.push(name)
    console.log(`  FAIL ${name}: ${err.message}`)
  }
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg || 'assertion failed')
}

// ─── Preload ─────────────────────────────────────────────────────────────────
console.log('\n[1] Preload')
await test('preload()', async () => {
  await Embed.preload()
})
await test('preload() idempotent', async () => {
  await Embed.preload() // should not error or reload
})

// ─── Basic embed ─────────────────────────────────────────────────────────────
console.log('\n[2] Basic embed')
await test('single text', async () => {
  const vecs = await Embed.embed(['hello world'])
  assert(vecs.length === 1, `expected 1, got ${vecs.length}`)
  assert(vecs[0].length === 384, `expected 384 dims, got ${vecs[0].length}`)
})

await test('two texts', async () => {
  const vecs = await Embed.embed(['hello', 'world'])
  assert(vecs.length === 2)
  assert(vecs[0].length === 384)
  assert(vecs[1].length === 384)
})

await test('vectors are normalized (unit length)', async () => {
  const [vec] = await Embed.embed(['test normalization'])
  const norm = Math.sqrt(vec.reduce((s, x) => s + x * x, 0))
  assert(Math.abs(norm - 1.0) < 0.01, `norm=${norm}, expected ~1.0`)
})

await test('different texts produce different vectors', async () => {
  const vecs = await Embed.embed(['cat', 'quantum physics'])
  const dot = vecs[0].reduce((s, x, i) => s + x * vecs[1][i], 0)
  assert(dot < 0.95, `dot=${dot}, expected different vectors`)
})

await test('same text produces same vector', async () => {
  const [v1] = await Embed.embed(['deterministic'])
  const [v2] = await Embed.embed(['deterministic'])
  const dot = v1.reduce((s, x, i) => s + x * v2[i], 0)
  assert(dot > 0.999, `dot=${dot}, expected ~1.0`)
})

// ─── Edge cases ──────────────────────────────────────────────────────────────
console.log('\n[3] Edge cases')
await test('empty string', async () => {
  const vecs = await Embed.embed([''])
  assert(vecs.length === 1)
  assert(vecs[0].length === 384)
})

await test('very long text (10k chars)', async () => {
  const long = 'word '.repeat(2000)
  const vecs = await Embed.embed([long])
  assert(vecs.length === 1)
  assert(vecs[0].length === 384)
})

await test('unicode / emoji', async () => {
  const vecs = await Embed.embed(['日本語テスト 🚀'])
  assert(vecs.length === 1)
  assert(vecs[0].length === 384)
})

await test('empty array throws', async () => {
  let threw = false
  try { await Embed.embed([]) } catch { threw = true }
  assert(threw, 'expected error on empty array')
})

// ─── Batch sizes ─────────────────────────────────────────────────────────────
console.log('\n[4] Batch sizes')
for (const n of [10, 50, 100, 256, 512]) {
  await test(`batch of ${n}`, async () => {
    const texts = Array.from({ length: n }, (_, i) => `sentence number ${i}`)
    const t0 = performance.now()
    const vecs = await Embed.embed(texts)
    const ms = performance.now() - t0
    assert(vecs.length === n, `expected ${n}, got ${vecs.length}`)
    assert(vecs[0].length === 384)
    const rate = (n / (ms / 1000)).toFixed(0)
    console.log(`        ${n} texts in ${ms.toFixed(0)}ms (${rate}/s)`)
  })
}

// ─── Concurrent calls ───────────────────────────────────────────────────────
console.log('\n[5] Concurrent calls')
await test('10 concurrent embed calls', async () => {
  const promises = Array.from({ length: 10 }, (_, i) =>
    Embed.embed([`concurrent call ${i}`])
  )
  const results = await Promise.all(promises)
  assert(results.length === 10)
  for (const r of results) {
    assert(r.length === 1)
    assert(r[0].length === 384)
  }
})

// ─── Summary ─────────────────────────────────────────────────────────────────
console.log(`\n${'═'.repeat(50)}`)
console.log(`Passed: ${PASS.length}  Failed: ${FAIL.length}`)
if (FAIL.length > 0) {
  console.log('Failed tests:', FAIL)
  process.exit(1)
}
console.log('All tests passed')
