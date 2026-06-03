#!/usr/bin/env node

/**
 * npx インストールパスの構造:
 *   ~/.npm/_npx/<hash>/node_modules/@notenkidev/claude-token-dashboard/  ← root (__dirname/..)
 *   ~/.npm/_npx/<hash>/node_modules/.bin/next                            ← flat install (2 levels up)
 *
 * ローカル開発 / npm install の場合:
 *   <project>/node_modules/.bin/next                                     ← nested install
 */

const { execSync, spawn } = require('child_process')
const { existsSync } = require('fs')
const { join } = require('path')

const root = join(__dirname, '..')
const args = process.argv.slice(2)

function findNext () {
  return [
    // npx flat install (scoped packages live 2 dirs deep inside node_modules)
    join(root, '..', '..', '.bin', 'next'),
    // local nested install (git clone → npm install)
    join(root, 'node_modules', '.bin', 'next'),
  ].find(existsSync) ?? null
}

let nextBin = findNext()

// Fallback: run npm install locally (e.g. running directly from a git clone
// without having done npm install first)
if (!nextBin) {
  console.log('📦 Installing dependencies (~30s)...')
  execSync('npm install --prefer-offline', { cwd: root, stdio: 'inherit' })
  nextBin = findNext()
}

if (!nextBin) {
  console.error('❌  Could not locate the next binary. Run `npm install` in the project directory.')
  process.exit(1)
}

console.log('🚀 Starting Claude Token Dashboard → http://localhost:3000\n')

const child = spawn(process.execPath, [nextBin, 'dev', ...args], {
  cwd: root,
  stdio: 'inherit',
})

child.on('exit', (code) => process.exit(code ?? 0))
process.on('SIGINT', () => child.kill('SIGINT'))
process.on('SIGTERM', () => child.kill('SIGTERM'))
