'use strict';

const fs = require('node:fs');
const path = require('node:path');

function createFeatureTask({ branch, request, output }) {
  if (!/^[A-Za-z0-9._/-]+$/.test(branch || '')) throw new Error('Provide a plain target PR branch name.');
  if (!request || !request.trim()) throw new Error('Feature request cannot be empty.');
  const directory = path.resolve(output);
  fs.mkdirSync(directory, { recursive: true });
  const content = [
    '# Agent 1 Feature Request', '',
    `- Target PR branch: \`${branch}\``,
    '- Agent role: `.agents/day4/feature-development.md`',
    '', '## Engineer request', '', request.trim(), '',
    '## Required boundaries', '',
    '- Work on the target PR branch and update the behavior specification under `docs/`.',
    '- The external `gad-gui-api-demo/` application is read-only. If the request requires changing it, stop and request an explicit scope change.',
    '- Use the local Codex role prompt. No hosted model API is invoked by this workflow.', '',
  ].join('\n');
  fs.writeFileSync(path.join(directory, 'feature-request.md'), content);
  return path.join(directory, 'feature-request.md');
}

if (require.main === module) {
  try {
    const file = createFeatureTask({
      branch: process.env.DAY4_BRANCH,
      request: process.env.DAY4_FEATURE_REQUEST,
      output: process.env.DAY4_OUTPUT || 'day4-agent-task',
    });
    console.log(`Feature task package created at ${file}.`);
  } catch (error) { console.error(`[day4-feature-task] ${error.message}`); process.exitCode = 1; }
}

module.exports = { createFeatureTask };
