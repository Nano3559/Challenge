'use strict';

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const DEFAULT_OUT = path.join('reports', 'coverage', 'requests');

/**
 * Ejecuta Playwright con la grabación de solicitudes activada.
 * Cualquier argumento no reconocido se pasa tal cual a `playwright test`.
 *
 * Uso:
 *   node tools/coverage/bin/record-tests.js -- --project=api
 *   npm run coverage:record -- --project=api
 */
function main(argv) {
  const { outputDir, keep, forwarded } = parseArgs(argv);
  const absoluteOut = path.resolve(outputDir);

  if (!keep) {
    fs.rmSync(absoluteOut, { recursive: true, force: true });
  }
  fs.mkdirSync(absoluteOut, { recursive: true });

  console.log(`[coverage] Grabando solicitudes en: ${absoluteOut}`);
  console.log(`[coverage] Playwright args: ${forwarded.join(' ') || '(ninguno)'}`);

  const command = ['npx playwright test', ...forwarded.map(quoteForShell)].join(' ');
  const result = spawnSync(command, {
    stdio: 'inherit',
    shell: true,
    env: {
      ...process.env,
      COVERAGE_REQUESTS: 'true',
      COVERAGE_REQUESTS_DIR: absoluteOut,
    },
  });

  const files = listRequestFiles(absoluteOut);
  const requests = files.reduce((total, file) => total + countLines(file), 0);
  console.log(`[coverage] Archivos de solicitudes: ${files.length}`);
  console.log(`[coverage] Solicitudes grabadas: ${requests}`);

  if (result.error) {
    console.error(`[coverage] No se pudo ejecutar Playwright: ${result.error.message}`);
    return 2;
  }
  return result.status === null ? 1 : result.status;
}

function parseArgs(argv) {
  let outputDir = DEFAULT_OUT;
  let keep = false;
  const forwarded = [];

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--') {
      forwarded.push(...argv.slice(index + 1));
      break;
    }
    if (arg === '--out') {
      const value = argv[index + 1];
      if (!value) throw new Error('--out requiere un directorio.');
      outputDir = value;
      index += 1;
      continue;
    }
    if (arg.startsWith('--out=')) {
      outputDir = arg.slice('--out='.length);
      continue;
    }
    if (arg === '--keep') {
      keep = true;
      continue;
    }
    forwarded.push(arg);
  }
  return { outputDir, keep, forwarded };
}

function listRequestFiles(directory) {
  if (!fs.existsSync(directory)) return [];
  const files = [];
  const walk = (current) => {
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.isFile() && /\.(jsonl|ndjson)$/i.test(entry.name)) files.push(full);
    }
  };
  walk(directory);
  return files;
}

function countLines(file) {
  return fs
    .readFileSync(file, 'utf8')
    .split(/\r?\n/)
    .filter((line) => line.trim()).length;
}

function quoteForShell(value) {
  return /[\s"]/g.test(value) ? JSON.stringify(value) : value;
}

if (require.main === module) {
  try {
    process.exitCode = main(process.argv.slice(2));
  } catch (error) {
    console.error(`[coverage] ERROR: ${error.message}`);
    process.exitCode = 2;
  }
}

module.exports = { main, parseArgs };
