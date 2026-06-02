#!/usr/bin/env node

const { execSync, spawn } = require('child_process')
const { existsSync } = require('fs')
const { join } = require('path')

const root = join(__dirname, '..')
const args = process.argv.slice(2)

// Install dependencies on first run (node_modules not included in npm package)
if (!existsSync(join(root, 'node_modules', 'next'))) {
  console.log('📦 Installing dependencies (first run, this takes ~30s)...')
  execSync('npm install', { cwd: root, stdio: 'inherit' })
}

console.log('🚀 Starting Claude Token Dashboard → http://localhost:3000\n')

const nextBin = join(root, 'node_modules', '.bin', 'next')
const child = spawn(process.execPath, [nextBin, 'dev', ...args], {
  cwd: root,
  stdio: 'inherit',
})

child.on('exit', (code) => process.exit(code ?? 0))
process.on('SIGINT', () => child.kill('SIGINT'))
process.on('SIGTERM', () => child.kill('SIGTERM'))
