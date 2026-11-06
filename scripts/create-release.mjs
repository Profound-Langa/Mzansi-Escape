import { cp, mkdir, rm, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const releaseDir = path.join(projectRoot, 'release')

await rm(releaseDir, { recursive: true, force: true })
await mkdir(releaseDir, { recursive: true })
await cp(path.join(projectRoot, 'dist'), releaseDir, { recursive: true })
await cp(path.join(projectRoot, 'scripts', 'release-server.mjs'), path.join(releaseDir, 'release-server.mjs'))
await writeFile(
  path.join(releaseDir, 'Run Mzansi Escape.bat'),
  '@echo off\r\ncd /d "%~dp0"\r\nnode release-server.mjs\r\nif errorlevel 1 pause\r\n',
  'utf8',
)

console.log(`Release created at ${releaseDir}`)
