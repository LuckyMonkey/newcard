#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { registerCard, resolveCard } from '../src/core.js';
import { createServer } from '../src/server.js';
import { defaultDataFile, loadRegistry, saveRegistry } from '../src/registry.js';

function parseArgs(argv) {
  const options = { apps: {} };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (!arg.startsWith('--')) throw new Error(`unexpected argument ${arg}`);
    const key = arg.slice(2);
    const value = argv[++index];
    if (!value || value.startsWith('--')) throw new Error(`missing value for --${key}`);
    if (key === 'app') {
      const split = value.indexOf('=');
      if (split < 1) throw new Error('--app must be appId=https://url');
      options.apps[value.slice(0, split)] = value.slice(split + 1);
    } else {
      options[key] = value;
    }
  }
  return options;
}

function help() {
  console.log(`NewCard / ncNFC reference CLI (draft 0.1)

  node bin/newcard.js demo
  node bin/newcard.js serve [--port 8787] [--host 127.0.0.1]
  node bin/newcard.js register --namespace demo.mine --technology iso14443a --uid 04DEADBE --title 'My card' --url https://example.com [--app com.example.app=https://example.com/action]
  node bin/newcard.js lookup --technology iso14443a --uid 04DEADBE [--namespace demo.mine] [--appId com.example.app]

This is a local, unverified registry demo; use your own permitted test cards.`);
}

async function main() {
  const [command = 'help', ...argv] = process.argv.slice(2);
  const flags = parseArgs(argv);
  let registry = await loadRegistry();
  if (command === 'help' || command === '--help') return help();
  if (command === 'demo') {
    const sampleFile = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../examples/demo-cards.json');
    const samples = JSON.parse(await readFile(sampleFile, 'utf8'));
    let inserted = 0;
    for (const entry of samples) {
      if (registry.bindings.some(b => b.namespace === entry.namespace && b.technology === entry.technology && b.uid === entry.uid.replace(/[:\- ]/g, '').toUpperCase())) continue;
      registerCard(registry, entry);
      inserted += 1;
    }
    if (inserted) await saveRegistry(registry);
    console.log(`Demo ready: ${inserted} synthetic test cards added to ${defaultDataFile}`);
    return serve(registry, { port: '8787', host: '127.0.0.1' });
  }
  if (command === 'register') {
    const { object, binding } = registerCard(registry, flags);
    await saveRegistry(registry);
    console.log(JSON.stringify({ object, binding: { namespace: binding.namespace, assurance: binding.assurance } }, null, 2));
    return;
  }
  if (command === 'lookup') {
    const result = resolveCard(registry, flags);
    console.log(JSON.stringify(result, null, 2));
    if (result.status !== 'resolved') process.exitCode = 1;
    return;
  }
  if (command === 'serve') return serve(registry, flags);
  help();
  process.exitCode = 1;
}

function serve(registry, flags) {
  const port = Number(flags.port || process.env.PORT || 8787);
  const host = flags.host || process.env.HOST || '127.0.0.1';
  if (!Number.isInteger(port) || port < 0 || port > 65535) throw new Error('invalid port');
  createServer(registry).listen(port, host, () => {
    console.log(`ncNFC reference resolver listening at http://${host}:${port} (local experimental server)`);
  });
}

main().catch(error => { console.error(error.message); process.exitCode = 1; });
