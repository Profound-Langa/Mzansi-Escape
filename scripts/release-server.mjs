import { createServer } from 'node:http'
import { readFile, stat } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawn } from 'node:child_process'

const root = path.dirname(fileURLToPath(import.meta.url))
const host = '127.0.0.1'
const port = 4173
const mimeTypes = {
  '.css': 'text/css; charset=utf-8',
  '.glb': 'model/gltf-binary',
  '.gltf': 'model/gltf+json',
  '.html': 'text/html; charset=utf-8',
  '.jpeg': 'image/jpeg',
  '.jpg': 'image/jpeg',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.mp3': 'audio/mpeg',
  '.mp4': 'video/mp4',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.woff2': 'font/woff2',
}

const server = createServer(async (request, response) => {
  try {
    const urlPath = decodeURIComponent(new URL(request.url, `http://${host}:${port}`).pathname)
    let filePath = path.resolve(root, `.${urlPath}`)
    if (!filePath.startsWith(`${root}${path.sep}`) && filePath !== root) {
      response.writeHead(403).end('Forbidden')
      return
    }

    try {
      if ((await stat(filePath)).isDirectory()) filePath = path.join(filePath, 'index.html')
    } catch {
      filePath = path.join(root, 'index.html')
    }

    const body = await readFile(filePath)
    response.writeHead(200, { 'Content-Type': mimeTypes[path.extname(filePath).toLowerCase()] ?? 'application/octet-stream' })
    response.end(body)
  } catch {
    response.writeHead(404).end('Not found')
  }
})

server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`Port ${port} is already in use. Close the other game window and try again.`)
  } else {
    console.error(error.message)
  }
  process.exit(1)
})

server.listen(port, host, () => {
  const url = `http://${host}:${port}`
  console.log(`Mzansi Escape is running at ${url}`)
  const opener = process.platform === 'win32' ? 'cmd' : process.platform === 'darwin' ? 'open' : 'xdg-open'
  const args = process.platform === 'win32' ? ['/c', 'start', '', url] : [url]
  const child = spawn(opener, args, { detached: true, stdio: 'ignore' })
  child.unref()
  console.log('Keep this window open while you play. Press Ctrl+C to stop the game.')
})
