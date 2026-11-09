'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { fileURLToPath } = require('node:url');

function listJsonFiles(directory) {
  if (!fs.existsSync(directory)) return [];
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) return listJsonFiles(fullPath);
    return entry.isFile() && entry.name.endsWith('.json') ? [fullPath] : [];
  });
}

function isInside(parent, candidate) {
  const relative = path.relative(parent, candidate);
  return relative !== '' && relative !== '..' && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative);
}

function inspectV8Coverage(coverageDirectory, appDirectory) {
  const rawFiles = listJsonFiles(coverageDirectory);
  const appRoot = path.resolve(appDirectory);
  const appScripts = new Set();
  const executedScripts = new Set();

  for (const rawFile of rawFiles) {
    let coverage;
    try { coverage = JSON.parse(fs.readFileSync(rawFile, 'utf8')); }
    catch { continue; }
    for (const script of coverage.result || []) {
      if (!script.url?.startsWith('file:')) continue;
      let scriptPath;
      try { scriptPath = path.resolve(fileURLToPath(script.url)); }
      catch { continue; }
      if (!isInside(appRoot, scriptPath) || !scriptPath.endsWith('.js')) continue;
      appScripts.add(scriptPath);
      const hasExecution = (script.functions || []).some((fn) =>
        (fn.ranges || []).some((range) => Number(range.count) > 0));
      if (hasExecution) executedScripts.add(scriptPath);
    }
  }

  return { rawFiles: rawFiles.length, appScripts: appScripts.size, executedScripts: executedScripts.size };
}

function main(argv = process.argv.slice(2)) {
  const [coverageDirectory, appDirectory] = argv;
  if (!coverageDirectory || !appDirectory) throw new Error('Usage: validate-v8-coverage <raw-coverage-dir> <app-dir>');
  const result = inspectV8Coverage(coverageDirectory, appDirectory);
  if (!result.rawFiles) throw new Error('V8 coverage produced no raw JSON files; code metrics are unavailable.');
  if (!result.appScripts) throw new Error('V8 coverage contains no scripts from the application directory; code metrics are unavailable.');
  if (!result.executedScripts) throw new Error('V8 coverage contains application files, but none have execution counts; code metrics are unavailable.');
  console.log(`Validated V8 coverage: ${result.executedScripts}/${result.appScripts} application scripts executed (${result.rawFiles} raw files).`);
  return result;
}

if (require.main === module) {
  try { main(); }
  catch (error) { console.error(`[v8-coverage] ${error.message}`); process.exitCode = 1; }
}

module.exports = { inspectV8Coverage, isInside, listJsonFiles, main };
