import type { FullResult, Reporter, Suite, TestCase } from '@playwright/test/reporter';
import fs from 'fs';
import path from 'path';

// eslint-disable-next-line no-control-regex
const ANSI = /\u001b\[[0-9;]*m/g;
const OUT_DIR = 'reports';

interface Entry {
  title: string;
  project: string;
  location: string;
  retries: number;
  durationMs: number;
  error: string;
  artifacts: string[];
}

/**
 * Reporter propio: genera reports/failure-summary.md y .json con fallos, tests inestables (flaky)
 * y los más lentos. Pensado para leerse en el resumen de GitHub Actions o para dárselo a una IA.
 */
export default class FailureSummaryReporter implements Reporter {
  private suite!: Suite;

  printsToStdio(): boolean {
    return false;
  }

  onBegin(_config: unknown, suite: Suite): void {
    this.suite = suite;
  }

  private entry(test: TestCase): Entry {
    const failing = test.results.find((r) => r.status === 'failed' || r.status === 'timedOut') ?? test.results.at(-1);
    const error = (failing?.error?.message ?? '').replace(ANSI, '').split('\n').slice(0, 14).join('\n');
    return {
      title: test.titlePath().filter(Boolean).slice(1).join(' › '),
      project: test.parent.project()?.name ?? '',
      location: `${path.relative(process.cwd(), test.location.file)}:${test.location.line}`,
      retries: test.results.length - 1,
      durationMs: test.results.reduce((sum, r) => sum + r.duration, 0),
      error,
      artifacts: (failing?.attachments ?? [])
        .filter((a) => a.path)
        .map((a) => `${a.name}: ${path.relative(process.cwd(), a.path as string)}`),
    };
  }

  onEnd(result: FullResult): void {
    const tests = this.suite.allTests();
    const failed = tests.filter((t) => t.outcome() === 'unexpected').map((t) => this.entry(t));
    const flaky = tests.filter((t) => t.outcome() === 'flaky').map((t) => this.entry(t));
    const passed = tests.filter((t) => t.outcome() === 'expected').length;
    const skipped = tests.filter((t) => t.outcome() === 'skipped').length;
    const slowest = tests
      .filter((t) => t.outcome() === 'expected')
      .map((t) => ({ title: t.titlePath().filter(Boolean).slice(1).join(' › '), ms: t.results.at(-1)?.duration ?? 0 }))
      .sort((a, b) => b.ms - a.ms)
      .slice(0, 5);

    const md: string[] = [
      `# Resumen de ejecución`,
      ``,
      `**Estado:** ${result.status} · ✅ ${passed} · ❌ ${failed.length} · ⚠️ flaky ${flaky.length} · ⏭️ ${skipped} · ⏱️ ${(result.duration / 1000).toFixed(1)}s`,
      ``,
    ];
    const section = (heading: string, list: Entry[]) => {
      if (!list.length) return;
      md.push(`## ${heading}`, '');
      for (const e of list) {
        md.push(`### ${e.title}`, `- Proyecto: \`${e.project}\` · \`${e.location}\` · reintentos: ${e.retries}`);
        if (e.artifacts.length) md.push(`- Evidencia: ${e.artifacts.map((a) => `\`${a}\``).join(', ')}`);
        md.push('', '```', e.error || '(sin mensaje de error)', '```', '');
      }
    };
    section('❌ Fallos', failed);
    section('⚠️ Tests inestables (pasaron tras reintentar)', flaky);
    if (slowest.length) {
      md.push('## ⏱️ Los 5 tests más lentos', '');
      slowest.forEach((s) => md.push(`- ${(s.ms / 1000).toFixed(2)}s — ${s.title}`));
      md.push('');
    }

    fs.mkdirSync(OUT_DIR, { recursive: true });
    fs.writeFileSync(path.join(OUT_DIR, 'failure-summary.md'), md.join('\n'));
    fs.writeFileSync(
      path.join(OUT_DIR, 'failure-summary.json'),
      JSON.stringify({ status: result.status, passed, skipped, failed, flaky, slowest }, null, 2),
    );
  }
}
