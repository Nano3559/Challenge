'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { execFileSync, spawnSync } = require('node:child_process');
const MAX_RETRIES = 3;

const ROOT = path.resolve(__dirname, '../../..');

function parseArgs(args) {
  const options = { testFiles: [], publish: false };
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === '--publish') { options.publish = true; continue; }
    if (arg === '--test-file') { options.testFiles.push(args[++index]); continue; }
    if (!arg.startsWith('--') || !args[index + 1]) throw new Error(`Invalid argument: ${arg}`);
    options[arg.slice(2).replace(/-([a-z])/g, (_, letter) => letter.toUpperCase())] = args[++index];
  }
  if (!options.branch || !options.specFile) throw new Error('Required: --branch and --spec-file.');
  if (!/^[A-Za-z0-9._/-]+$/.test(options.branch)) throw new Error('Branch name contains unsupported characters.');
  if (!/^docs\/[A-Za-z0-9_./-]+\.md$/.test(options.specFile)) throw new Error('Feature specification must be a plain Markdown path under docs/.');
  if (options.testFiles.some((file) => !/^tests\/[A-Za-z0-9_./-]+\.spec\.ts$/.test(file))) throw new Error('Test file arguments must be repository spec files.');
  return options;
}

function git(args) {
  return execFileSync('git', args, { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
}

function run(command, args) {
  console.log(`$ ${command} ${args.join(' ')}`);
  const result = spawnSync(command, args, { cwd: ROOT, stdio: 'inherit', shell: process.platform === 'win32' });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`${command} exited with status ${result.status}.`);
}

function finish(options) {
  if (git(['branch', '--show-current']) !== options.branch) throw new Error(`Current branch must be ${options.branch}; refusing to push elsewhere.`);
  const changed = [...new Set([
    ...git(['diff', '--name-only', 'HEAD']).split(/\r?\n/),
    ...git(['ls-files', '--others', '--exclude-standard']).split(/\r?\n/),
  ].filter(Boolean).map((file) => file.replace(/\\/g, '/')))];
  if (changed.some((file) => !/^[A-Za-z0-9_./-]+$/.test(file))) throw new Error('Changed paths must not contain shell metacharacters.');
  const forbidden = changed.filter((file) => !file.startsWith('src/') && !file.startsWith('docs/') && file !== '.agents/day4/attempt-state.json');
  if (forbidden.length) throw new Error(`Feature agent may only change first-party src/ and docs/; blocked: ${forbidden.join(', ')}`);
  if (!changed.includes(options.specFile)) throw new Error(`Feature specification was not updated: ${options.specFile}`);
  if (!changed.some((file) => file.startsWith('src/'))) throw new Error('No first-party source implementation change was found.');
  for (const file of options.testFiles) if (!fs.existsSync(path.join(ROOT, file))) throw new Error(`Test file not found: ${file}`);

  run('npm', ['run', 'ci:check']);
  if (options.testFiles.length) run('npx', ['playwright', 'test', '--reporter=list', ...options.testFiles]);
  if (!options.publish) {
    console.log('Validation completed. Pass --publish to commit and push the feature to the same PR branch.');
    return;
  }
  const statePath = path.join(ROOT, '.agents/day4/attempt-state.json');
  let state = {};
  try { state = JSON.parse(fs.readFileSync(statePath, 'utf8')); } catch { /* start a clean task counter */ }
  const taskId = options.specFile;
  if (state.taskId !== taskId) state = { taskId, completedAttempts: 0, maxRetries: MAX_RETRIES, lastCoverageRun: null };
  fs.mkdirSync(path.dirname(statePath), { recursive: true });
  fs.writeFileSync(statePath, `${JSON.stringify(state, null, 2)}\n`);
  run('git', ['add', '--', ...new Set([...changed, '.agents/day4/attempt-state.json'])]);
  const featureName = path.basename(options.specFile, '.md').replace(/[^A-Za-z0-9._-]/g, '-');
  run('git', ['commit', '-m', `feat(agent-1): ${featureName}`]);
  run('git', ['push', 'origin', options.branch]);
}

if (require.main === module) {
  try { finish(parseArgs(process.argv.slice(2))); }
  catch (error) { console.error(`[agent-1] ${error.message}`); process.exitCode = 1; }
}

module.exports = { finish, parseArgs };
