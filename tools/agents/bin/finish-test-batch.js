'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { execFileSync, spawnSync } = require('node:child_process');
const ts = require('typescript');

const ROOT = path.resolve(__dirname, '../../..');
const MAX_RETRIES = 3;
const ALLOWED = (file) => file.startsWith('tests/api/')
  || file.startsWith('src/sut/api/')
  || file.startsWith('src/sut/data/')
  || file.startsWith('src/sut/schemas/')
  || file.startsWith('src/sut/fixtures/')
  || file.startsWith('docs/')
  || file === '.agents/day4/attempt-state.json';

function git(args, options = {}) {
  return execFileSync('git', args, { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], ...options }).trim();
}

function parseArgs(args) {
  const options = { testFiles: [], publish: false };
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === '--publish') { options.publish = true; continue; }
    if (arg === '--test-file') { options.testFiles.push(args[++index]); continue; }
    if (!arg.startsWith('--') || !args[index + 1]) throw new Error(`Invalid argument: ${arg}`);
    options[arg.slice(2)] = args[++index];
  }
  for (const key of ['handoff', 'branch']) if (!options[key]) throw new Error(`Missing --${key}.`);
  if (!options.testFiles.length) throw new Error('Pass at least one changed or relevant API test with --test-file.');
  options.testFiles = [...new Set(options.testFiles.map((file) => file.replace(/\\/g, '/')))];
  if (!/^[A-Za-z0-9._/-]+$/.test(options.branch)) throw new Error('Branch name contains unsupported characters.');
  if (options.testFiles.some((file) => !/^tests\/api\/[A-Za-z0-9_./-]+\.spec\.ts$/.test(file))) {
    throw new Error('Test file arguments must be plain tests/api/*.spec.ts paths.');
  }
  return options;
}

function listTestFiles() {
  const results = [];
  const visit = (directory) => {
    if (!fs.existsSync(directory)) return;
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const absolute = path.join(directory, entry.name);
      if (entry.isDirectory()) visit(absolute);
      else if (entry.isFile() && entry.name.endsWith('.spec.ts')) results.push(absolute);
    }
  };
  visit(path.join(ROOT, 'tests/api'));
  return results;
}

function testCases(sourceText, fileName) {
  const source = ts.createSourceFile(fileName, sourceText, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const cases = [];
  const literal = (node) => ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node) ? node.text : null;
  const callName = (expression) => expression.getText(source);
  const isTestCase = (node) => ts.isCallExpression(node) && (callName(node.expression) === 'test'
    || ['test.skip', 'test.only', 'test.fixme'].includes(callName(node.expression)));
  const isDescribe = (node) => ts.isCallExpression(node) && ['test.describe', 'test.describe.serial', 'test.describe.parallel'].includes(callName(node.expression));
  const countAssertions = (node) => {
    let count = 0;
    const scan = (child) => {
      if (ts.isCallExpression(child) && ['expect', 'expectSchema'].includes(callName(child.expression))) count += 1;
      ts.forEachChild(child, scan);
    };
    scan(node);
    return count;
  };
  const visit = (node, describePath = []) => {
    if (isDescribe(node)) {
      const title = literal(node.arguments[0]);
      const callback = node.arguments.find((argument) => ts.isArrowFunction(argument) || ts.isFunctionExpression(argument));
      if (title !== null && callback?.body) { visit(callback.body, [...describePath, title]); return; }
    }
    if (isTestCase(node)) {
      const title = literal(node.arguments[0]);
      const callback = node.arguments.find((argument) => ts.isArrowFunction(argument) || ts.isFunctionExpression(argument));
      if (title !== null && callback?.body) cases.push({ title: [...describePath, title].join(' › '), assertions: countAssertions(callback.body), fileName });
      return;
    }
    ts.forEachChild(node, (child) => visit(child, describePath));
  };
  visit(source);
  return cases;
}

function changedPaths() {
  const tracked = git(['diff', '--name-only', 'HEAD']).split(/\r?\n/).filter(Boolean);
  const untracked = git(['ls-files', '--others', '--exclude-standard']).split(/\r?\n/).filter(Boolean);
  return [...new Set([...tracked, ...untracked].map((file) => file.replace(/\\/g, '/')))];
}

function validateScopeAndTests({ handoff, branch, testFiles }) {
  if (git(['branch', '--show-current']) !== branch) throw new Error(`Current branch must be ${branch}; refusing to push to another branch.`);
  if (handoff.task?.branch && handoff.task.branch !== branch) throw new Error(`Coverage artifact targets ${handoff.task.branch}, not ${branch}.`);
  if (handoff.task?.headSha && git(['rev-parse', 'HEAD']) !== handoff.task.headSha) {
    throw new Error('Coverage artifact is stale for the current branch HEAD; download the latest day4-agent-handoff artifact.');
  }
  const retry = handoff.task || {};
  const maxRetries = Math.min(MAX_RETRIES, Number(retry.maxRetries) || MAX_RETRIES);
  const attempt = (Number(retry.completedAttempts) || 0) + 1;
  if (attempt > maxRetries) throw new Error(`Retry limit reached (${maxRetries}); no tests will be generated or pushed.`);

  const changed = changedPaths();
  if (!changed.length) throw new Error('No changes detected. Generate a meaningful test batch before finishing.');
  if (changed.some((file) => !/^[A-Za-z0-9_./-]+$/.test(file))) throw new Error('Changed paths must not contain shell metacharacters.');
  const forbidden = changed.filter((file) => !ALLOWED(file));
  if (forbidden.length) throw new Error(`Test agent may not modify these files: ${forbidden.join(', ')}`);
  const changedTests = changed.filter((file) => file.startsWith('tests/api/') && file.endsWith('.spec.ts'));
  if (!changedTests.length) throw new Error('The batch must add or update a tests/api/*.spec.ts file.');
  const omittedTests = changedTests.filter((file) => !testFiles.includes(file));
  if (omittedTests.length) throw new Error(`Pass every changed API test to the validator: ${omittedTests.join(', ')}`);
  for (const file of testFiles) {
    if (!file.startsWith('tests/api/') || !file.endsWith('.spec.ts') || !fs.existsSync(path.join(ROOT, file))) {
      throw new Error(`Invalid or missing API test file: ${file}`);
    }
  }

  const baselineCounts = new Map();
  for (const absolute of listTestFiles()) {
    const relative = path.relative(ROOT, absolute).replace(/\\/g, '/');
    let baseline;
    try { baseline = git(['show', `HEAD:${relative}`]); }
    catch { baseline = ''; }
    for (const item of testCases(baseline, relative)) baselineCounts.set(item.title, (baselineCounts.get(item.title) || 0) + 1);
  }
  const newCases = [];
  for (const file of changedTests) {
    const current = testCases(fs.readFileSync(path.join(ROOT, file), 'utf8'), file);
    let previous = '';
    try { previous = git(['show', `HEAD:${file}`]); } catch { /* newly created test file */ }
    const priorCounts = new Map();
    for (const item of testCases(previous, file)) priorCounts.set(item.title, (priorCounts.get(item.title) || 0) + 1);
    for (const item of current) {
      const count = priorCounts.get(item.title) || 0;
      if (count) priorCounts.set(item.title, count - 1);
      else newCases.push(item);
    }
  }
  if (!newCases.length) throw new Error('No new static test cases were found in the changed API test files.');
  const duplicates = newCases.filter((item) => baselineCounts.has(item.title));
  if (duplicates.length) throw new Error(`Duplicate test title(s): ${duplicates.map((item) => item.title).join('; ')}`);
  const newTitleCounts = new Map();
  for (const item of newCases) newTitleCounts.set(item.title, (newTitleCounts.get(item.title) || 0) + 1);
  const repeated = [...newTitleCounts].filter(([, count]) => count > 1).map(([title]) => title);
  if (repeated.length) throw new Error(`Duplicate test title(s) in this batch: ${repeated.join('; ')}`);
  const withoutAssertions = newCases.filter((item) => item.assertions < 1);
  if (withoutAssertions.length) throw new Error(`Every added test needs at least one behavioral assertion: ${withoutAssertions.map((item) => item.title).join('; ')}`);
  if (newCases.length > 5) throw new Error(`A batch may add at most five tests; found ${newCases.length}.`);
  return { attempt, maxRetries, changed, changedTests, newCases };
}

function run(command, args) {
  console.log(`$ ${command} ${args.join(' ')}`);
  const result = spawnSync(command, args, { cwd: ROOT, stdio: 'inherit', shell: process.platform === 'win32' });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`${command} exited with status ${result.status}.`);
}

function finish(options) {
  const handoff = JSON.parse(fs.readFileSync(path.resolve(ROOT, options.handoff), 'utf8'));
  const validation = validateScopeAndTests({ handoff, branch: options.branch, testFiles: options.testFiles });
  run('npm', ['run', 'ci:check']);
  run('npx', ['playwright', 'test', '--project=api', '--reporter=list', ...options.testFiles]);
  console.log(`Validated ${validation.newCases.length} new behavior test(s), attempt ${validation.attempt}/${validation.maxRetries}.`);
  if (!options.publish) {
    console.log('Validation completed. Pass --publish to increment the attempt, commit, and push this batch.');
    return;
  }

  const statePath = path.join(ROOT, '.agents/day4/attempt-state.json');
  fs.mkdirSync(path.dirname(statePath), { recursive: true });
  fs.writeFileSync(statePath, `${JSON.stringify({
    taskId: handoff.task?.id || 'active-feature',
    completedAttempts: validation.attempt,
    maxRetries: validation.maxRetries,
    lastCoverageRun: handoff.task?.runUrl || null,
    lastCommit: git(['rev-parse', 'HEAD']),
  }, null, 2)}\n`);
  const stageFiles = [...validation.changed, '.agents/day4/attempt-state.json'];
  run('git', ['add', '--', ...stageFiles]);
  run('git', ['commit', '-m', `test(agent-2): add uncovered behavior (attempt ${validation.attempt}/${validation.maxRetries})`]);
  run('git', ['push', 'origin', options.branch]);
}

if (require.main === module) {
  try { finish(parseArgs(process.argv.slice(2))); }
  catch (error) { console.error(`[agent-2] ${error.message}`); process.exitCode = 1; }
}

module.exports = { finish, parseArgs, testCases, validateScopeAndTests };
