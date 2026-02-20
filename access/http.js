// access/http.js
// owns: HTTP server lifecycle (create, route, listen)
// deps: express, cors (npm)

import express from 'express'
import cors from 'cors'

/**
 * Create an express app pre-configured with JSON + CORS.
 * @returns {import('express').Express}
 */
export function createApp() {
  const app = express()
  app.use(cors())
  app.use(express.json({ limit: '10mb' }))
  return app
}

/**
 * Register a POST route on an existing app.
 * @param {import('express').Express} app
 * @param {string} path
 * @param {(body: any) => Promise<any>} handler  - receives req.body, returns response value
 */
export function post(app, path, handler) {
  app.post(path, async (req, res) => {
    try {
      const result = await handler(req.body)
      res.json({ ok: true, result })
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message })
    }
  })
}

/**
 * Register a GET route on an existing app.
 * @param {import('express').Express} app
 * @param {string} path
 * @param {(query: any) => Promise<any>} handler
 */
export function get(app, path, handler) {
  app.get(path, async (req, res) => {
    try {
      const result = await handler(req.query)
      res.json({ ok: true, result })
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message })
    }
  })
}

/**
 * Start listening. Returns a promise that resolves with the port.
 * @param {import('express').Express} app
 * @param {number} port
 * @returns {Promise<number>}
 */
export function listen(app, port) {
  return new Promise((resolve, reject) => {
    const server = app.listen(port, (err) => {
      if (err) reject(err)
      else resolve(/** @type {any} */(server.address()).port)
    })
  })
}
