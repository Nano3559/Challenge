'use strict';

/**
 * Error controlado de la herramienta de cobertura.
 * El `exitCode` permite distinguir errores de uso/configuración (2)
 * de fallos de análisis (3) y del gate de cobertura (1).
 */
class CoverageError extends Error {
  constructor(message, { code = 'COVERAGE_ERROR', exitCode = 2, cause } = {}) {
    super(message, cause ? { cause } : undefined);
    this.name = 'CoverageError';
    this.code = code;
    this.exitCode = exitCode;
  }
}

module.exports = { CoverageError };
