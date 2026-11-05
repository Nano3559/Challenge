'use strict';

const path = require('path');
const { loadOpenApiFile } = require('../lib/openapi-parser');
const { loadRequests } = require('../lib/request-store');
const { buildCoverageReport } = require('../lib/analyzer');
const { printConsoleReport } = require('../lib/console-report');
const { writeJson, writeText } = require('../lib/json-writer');
const { loadAiEstimates, compareEstimates } = require('../lib/ai-estimates');
const { buildBaselineMarkdown } = require('../lib/baseline');
const { CoverageError } = require('../lib/errors');
const { log, setQuiet } = require('../lib/log');

const USAGE = `
Uso:
  node coverage-cli.js --spec <openapi.json|yaml> [opciones]

Opciones:
  --spec <ruta>               OpenAPI 3.x JSON o YAML (obligatorio).
  --requests <ruta>           Archivo JSONL/JSON o directorio con solicitudes grabadas.
                              Por defecto: reports/coverage/requests
  --out <directorio>          Directorio de salida. Por defecto: reports/coverage
                              Genera coverage-report.json, coverage-gaps.json y day-1-baseline.md.
  --min-coverage <0-100>      Falla (exit 1) si la cobertura global es menor. Por defecto: 0
  --fail-on-critical-gaps     Falla (exit 1) si hay brechas críticas
                              (uncovered_endpoint o untested_method).
  --ai-estimates <ruta>       JSON con dos estimaciones de IA ejecutadas realmente.
                              Si se omite, el baseline lo indica explícitamente.
  --tests <ruta>              Ruta de pruebas para mostrar en el baseline. Por defecto: tests
  --console-limit <n>         Brechas a mostrar en consola. Por defecto: 10
  --no-baseline               No generar day-1-baseline.md.
  --quiet                     Solo warnings y errores.
  -h, --help                  Muestra esta ayuda.

Ejemplo:
  node coverage-cli.js \\
    --spec gad-gui-api-demo/public/tools/schema/openapi_rest_demo.json \\
    --requests reports/coverage/requests \\
    --out reports/coverage \\
    --min-coverage 5 \\
    --ai-estimates tools/coverage/ai-estimates.json

Códigos de salida:
  0  Análisis correcto y gates superados.
  1  Gate de cobertura/brechas críticas incumplido.
  2  Error de uso o de configuración.
  3  Error inesperado durante el análisis.
`;

function parseArgs(argv) {
  const options = {
    spec: null,
    requests: path.join('reports', 'coverage', 'requests'),
    out: path.join('reports', 'coverage'),
    minCoverage: 0,
    failOnCriticalGaps: false,
    aiEstimates: null,
    tests: 'tests',
    consoleLimit: 10,
    baseline: true,
    quiet: false,
    help: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const raw = argv[index];
    const [flag, inlineValue] = raw.includes('=') ? raw.split(/=(.*)/s, 2) : [raw, undefined];
    const readValue = () => {
      if (inlineValue !== undefined) return inlineValue;
      const value = argv[index + 1];
      if (value === undefined || value.startsWith('--')) {
        throw new CoverageError(`La opción ${flag} requiere un valor.`, { code: 'INVALID_ARGUMENTS' });
      }
      index += 1;
      return value;
    };

    switch (flag) {
      case '--spec':
        options.spec = readValue();
        break;
      case '--requests':
        options.requests = readValue();
        break;
      case '--out':
        options.out = readValue();
        break;
      case '--min-coverage': {
        const value = Number(readValue());
        if (!Number.isFinite(value) || value < 0 || value > 100) {
          throw new CoverageError('--min-coverage debe ser un número entre 0 y 100.', {
            code: 'INVALID_ARGUMENTS',
          });
        }
        options.minCoverage = value;
        break;
      }
      case '--fail-on-critical-gaps':
        options.failOnCriticalGaps = true;
        break;
      case '--ai-estimates':
        options.aiEstimates = readValue();
        break;
      case '--tests':
        options.tests = readValue();
        break;
      case '--console-limit': {
        const value = Number(readValue());
        if (!Number.isInteger(value) || value < 0) {
          throw new CoverageError('--console-limit debe ser un entero >= 0.', {
            code: 'INVALID_ARGUMENTS',
          });
        }
        options.consoleLimit = value;
        break;
      }
      case '--no-baseline':
        options.baseline = false;
        break;
      case '--quiet':
        options.quiet = true;
        break;
      case '-h':
      case '--help':
        options.help = true;
        break;
      default:
        throw new CoverageError(`Opción desconocida: ${flag}. Usa --help.`, {
          code: 'INVALID_ARGUMENTS',
        });
    }
  }

  if (!options.help && !options.spec) {
    throw new CoverageError('Falta --spec. Usa --help para ver ejemplos.', {
      code: 'MISSING_SPEC',
    });
  }
  return options;
}

async function run(argv = process.argv.slice(2)) {
  const options = parseArgs(argv);
  if (options.help) {
    console.log(USAGE.trim());
    return 0;
  }

  setQuiet(options.quiet);
  log.info(`Parseando OpenAPI: ${path.resolve(options.spec)}`);
  const spec = loadOpenApiFile(options.spec);
  log.info(
    `OpenAPI ${spec.openapi}: ${spec.endpoints.length} endpoints, ${spec.operations.length} operaciones, ` +
      `${spec.operations.reduce((total, operation) => total + operation.responses.length, 0)} respuestas documentadas.`,
  );

  log.info(`Cargando solicitudes: ${path.resolve(options.requests)}`);
  const requestStore = loadRequests(options.requests);
  log.info(`Solicitudes válidas: ${requestStore.requests.length} en ${requestStore.files.length} archivo(s).`);

  const { report, gapReport } = buildCoverageReport({ spec, requestStore });
  relativizeReportPaths(report, gapReport);

  log.info(`Cargando estimaciones de IA: ${options.aiEstimates || '(no especificadas)'}`);
  const aiEstimates = loadAiEstimates(options.aiEstimates);
  const aiComparison = compareEstimates(aiEstimates, report.summary.global.percentage);

  const outDir = path.resolve(options.out);
  const reportPath = writeJson(path.join(outDir, 'coverage-report.json'), report);
  const gapsPath = writeJson(path.join(outDir, 'coverage-gaps.json'), gapReport);
  log.info(`Reporte escrito: ${reportPath}`);
  log.info(`Brechas escritas: ${gapsPath}`);

  if (options.baseline) {
    const markdown = buildBaselineMarkdown({
      report,
      gapReport,
      aiEstimates,
      aiComparison,
      inputs: {
        testsPath: options.tests,
        command: `node coverage-cli.js ${process.argv.slice(2).join(' ')}`.trim(),
      },
    });
    const baselinePath = writeText(path.join(outDir, 'day-1-baseline.md'), markdown);
    log.info(`Baseline escrito: ${baselinePath}`);
  }

  printConsoleReport(report, gapReport, { limit: options.consoleLimit });

  const failures = [];
  if (options.minCoverage > 0 && report.summary.global.percentage < options.minCoverage) {
    failures.push(
      `Cobertura global ${report.summary.global.percentage.toFixed(2)}% < umbral ${options.minCoverage.toFixed(2)}%.`,
    );
  }
  if (options.failOnCriticalGaps && gapReport.summary.critical > 0) {
    failures.push(`Hay ${gapReport.summary.critical} brechas críticas (${gapReport.summary.criticalCategories.join(', ')}).`);
  }

  if (failures.length > 0) {
    console.error('');
    console.error('GATE DE COBERTURA: FALLÓ');
    for (const failure of failures) console.error(`  - ${failure}`);
    console.error('');
    return 1;
  }

  console.log(
    `GATE DE COBERTURA: OK (global ${report.summary.global.percentage.toFixed(2)}%, ` +
      `umbral ${options.minCoverage.toFixed(2)}%, brechas críticas ${gapReport.summary.critical}).`,
  );
  console.log('');
  return 0;
}

/** Rutas relativas al cwd para que los reportes comprometidos sean portables. */
function relativizeReportPaths(report, gapReport) {
  report.spec.source = displayPath(report.spec.source);
  report.requests.source = displayPath(report.requests.source);
  report.requests.files = report.requests.files.map(displayPath);
  gapReport.spec.source = report.spec.source;
}

function displayPath(value) {
  const absolute = path.resolve(value);
  const relative = path.relative(process.cwd(), absolute);
  if (!relative || relative.startsWith('..') || path.isAbsolute(relative)) return value;
  return relative.split(path.sep).join('/');
}

function runFromProcess() {
  run()
    .then((exitCode) => {
      process.exitCode = exitCode;
    })
    .catch((error) => {
      if (error instanceof CoverageError) {
        log.error(error.message);
        process.exitCode = error.exitCode;
      } else {
        log.error(`Error inesperado: ${error && error.stack ? error.stack : error}`);
        process.exitCode = 3;
      }
    });
}

if (require.main === module) {
  runFromProcess();
}

module.exports = { parseArgs, run, runFromProcess, USAGE };
