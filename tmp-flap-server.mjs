// TEMP verification server: simulates GitHub Pages edge flap around a deploy.
// The first 2 requests for the entry bundle get a 404 with a 10-minute
// cache header (negative caching, like GitHub Pages sends); after that the
// real file is served. Do not commit.
import { createServer } from 'node:http'
import { readFile } from 'node:fs/promises'
import { extname, join } from 'node:path'

const DIST = join(process.cwd(), 'dist')
const BASE = '/ZARA-AI-INTERVIEWER'
const MIME = { '.js': 'text/javascript', '.css': 'text/css', '.html': 'text/html', '.svg': 'image/svg+xml' }

let bundleMisses = 0

createServer(async (req, res) => {
  const path = req.url.split('?')[0]
  let rel = path.startsWith(BASE) ? path.slice(BASE.length) : path
  if (rel.endsWith('/')) rel += 'index.html'
  if (rel.includes('assets/index.js')) {
    bundleMisses += 1
    if (bundleMisses <= 999) {
      res.writeHead(404, { 'Cache-Control': 'max-age=600', 'Content-Type': 'text/html' })
      res.end('simulated edge 404')
      return
    }
  }
  try {
    const file = await readFile(join(DIST, rel))
    res.writeHead(200, { 'Cache-Control': 'max-age=600', 'Content-Type': MIME[extname(rel)] ?? 'application/octet-stream' })
    res.end(file)
  } catch {
    res.writeHead(404, { 'Cache-Control': 'max-age=600' })
    res.end('not found')
  }
}).listen(4999, () => console.log('flap server on :4999'))
