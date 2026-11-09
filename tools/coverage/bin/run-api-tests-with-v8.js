'use strict';

const { spawnSync, fork } = require('node:child_process');
const http = require('node:http');
const https = require('node:https');
const path = require('node:path');

const delay = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

function checkHealth(url) {
  return new Promise((resolve, reject) => {
    const target = new URL(url);
    const client = target.protocol === 'https:' ? https : http;
    const request = client.get(target, (response) => {
      response.resume();
      resolve(response.statusCode >= 200 && response.statusCode < 300);
    });
    request.setTimeout(5_000, () => request.destroy(new Error('Health check timed out.')));
    request.once('error', reject);
  });
}

async function waitForHealth(baseUrl, server, timeoutMs = 120_000) {
  const healthUrl = `${baseUrl.replace(/\/$/, '')}/api/health`;
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (server.exitCode !== null) throw new Error(`GAD coverage server exited with code ${server.exitCode} before health check.`);
    try {
      if (await checkHealth(healthUrl)) return;
    } catch { /* retry while the app starts */ }
    await delay(250);
  }
  throw new Error(`GAD coverage server did not become healthy at ${healthUrl} within ${timeoutMs} ms.`);
}

async function stopServer(server) {
  if (server.exitCode !== null || server.signalCode !== null) return;
  await new Promise((resolve) => {
    const forceStop = setTimeout(() => server.kill(), 5_000);
    server.once('exit', () => { clearTimeout(forceStop); resolve(); });
    if (server.connected) server.send({ type: 'shutdown' }, (error) => { if (error) server.kill(); });
    else server.kill();
  });
}

function runTests(root, requestsOutput, testArgs = []) {
  const recorder = path.join(root, 'tools/coverage/bin/record-tests.js');
  const args = [];
  if (requestsOutput) args.push('--out', requestsOutput);
  args.push('--project=api', '--reporter=list', ...testArgs);
  const result = spawnSync(process.execPath, [recorder, ...args], {
    cwd: root,
    env: { ...process.env, START_APP: 'false' },
    stdio: 'inherit',
  });
  if (result.error) throw result.error;
  return result.status === null ? 1 : result.status;
}

async function main() {
  const root = process.cwd();
  const workflowSource = path.resolve(root, process.env.COVERAGE_WORKFLOW_SOURCE || '.');
  const appDirectory = path.resolve(root, process.env.GAD_APP_DIR || 'gad-gui-api-demo');
  const serverScript = path.join(workflowSource, 'tools/gad/coverage-server.js');
  const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
  const server = fork(serverScript, [], {
    cwd: root,
    env: { ...process.env, GAD_APP_DIR: appDirectory },
    stdio: ['ignore', 'inherit', 'inherit', 'ipc'],
  });

  try {
    await waitForHealth(baseUrl, server);
    return runTests(root, process.env.COVERAGE_REQUESTS_OUT, process.argv.slice(2));
  } finally {
    await stopServer(server);
  }
}

if (require.main === module) {
  main().then((exitCode) => { process.exitCode = exitCode; })
    .catch((error) => { console.error(`[coverage] ${error.message}`); process.exitCode = 1; });
}

module.exports = { main, runTests, stopServer, waitForHealth };
