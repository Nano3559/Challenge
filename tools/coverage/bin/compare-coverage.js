'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { buildComparison } = require('../lib/comparison');
const { buildSummaryMarkdown, buildHtml } = require('../lib/comparison-report');

function parseArgs(argv) {
  const options = { base: 'coverage-inputs/base', head: 'coverage-inputs/pr', out: 'coverage-comparison', artifactUrl: '', minCoverage: 0, failOnCriticalGaps: false };
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === '--fail-on-critical-gaps') { options.failOnCriticalGaps = true; continue; }
    const [key, inline] = argv[i].split(/=(.*)/s, 2);
    if (!['--base', '--head', '--out', '--artifact-url', '--min-coverage'].includes(key)) throw new Error(`Unknown option ${key}`);
    const value = inline ?? argv[++i];
    if (!value || value.startsWith('--')) throw new Error(`${key} requires a value`);
    const option = key.slice(2).replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
    options[option] = option === 'minCoverage' ? Number(value) : value;
    if (option === 'minCoverage' && (!Number.isFinite(options.minCoverage) || options.minCoverage < 0 || options.minCoverage > 100)) throw new Error('--min-coverage must be between 0 and 100');
  }
  return options;
}

function readJson(directory, filename) {
  try { return JSON.parse(fs.readFileSync(path.join(directory, filename), 'utf8')); }
  catch { return null; }
}

function readText(directory, filename) {
  try { return fs.readFileSync(path.join(directory, filename), 'utf8'); }
  catch { return null; }
}

function run() {
  try {
    const options = parseArgs(process.argv.slice(2));
    const baseDir = path.resolve(options.base);
    const headDir = path.resolve(options.head);
    const baseStatus = readJson(baseDir, 'run-status.json');
    const headStatus = readJson(headDir, 'run-status.json');
    const comparison = buildComparison({
      base: { report: readJson(baseDir, 'coverage-report.json'), codeSummary: readJson(baseDir, 'coverage-summary.json') },
      head: { report: readJson(headDir, 'coverage-report.json'), codeSummary: readJson(headDir, 'coverage-summary.json') },
      baseGaps: readJson(baseDir, 'coverage-gaps.json'),
      headGaps: readJson(headDir, 'coverage-gaps.json'),
      baseLcov: readText(baseDir, 'lcov.info'),
      headLcov: readText(headDir, 'lcov.info'),
      runStatus: { base: baseStatus?.status || 'unknown', head: headStatus?.status || 'unknown' },
    });

    fs.mkdirSync(options.out, { recursive: true });
    fs.writeFileSync(path.join(options.out, 'coverage-comparison.json'), `${JSON.stringify(comparison, null, 2)}\n`);
    fs.writeFileSync(path.join(options.out, 'summary.md'), `${buildSummaryMarkdown(comparison, options.artifactUrl)}\n`);
    fs.writeFileSync(path.join(options.out, 'index.html'), buildHtml(comparison, options.artifactUrl));
    console.log(`Comparison written to ${path.resolve(options.out)}`);
    const failures = [];
    if (!comparison.apiCoverage.available) failures.push('OpenAPI coverage data is missing.');
    if (!comparison.codeCoverage.available) failures.push('Code coverage data is missing.');
    if (comparison.measurement.status === 'failed') failures.push(comparison.measurement.reason);
    if (comparison.apiCoverage.head && comparison.apiCoverage.head.global < options.minCoverage) failures.push(`PR OpenAPI coverage ${comparison.apiCoverage.head.global}% is below ${options.minCoverage}%.`);
    if (options.failOnCriticalGaps && (comparison.apiCoverage.criticalGaps ?? 0) > 0) failures.push(`PR has ${comparison.apiCoverage.criticalGaps} critical OpenAPI gaps.`);
    if (failures.length) {
      console.error(`[coverage-compare] ${failures.join(' ')}`);
      process.exitCode = 1;
    }
  } catch (error) {
    console.error(`[coverage-compare] ${error.message}`);
    process.exitCode = 2;
  }
}

if (require.main === module) run();

module.exports = { parseArgs, readJson, readText };
