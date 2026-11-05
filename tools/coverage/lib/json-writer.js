'use strict';

const fs = require('fs');
const path = require('path');
const { CoverageError } = require('./errors');

/** Escritura atómica (tmp + rename) para no dejar JSON a medias si el proceso falla. */
function writeJson(filePath, data) {
  const absolute = path.resolve(filePath);
  fs.mkdirSync(path.dirname(absolute), { recursive: true });
  const temporary = `${absolute}.tmp`;
  fs.writeFileSync(temporary, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
  fs.renameSync(temporary, absolute);
  return absolute;
}

function writeText(filePath, text) {
  const absolute = path.resolve(filePath);
  fs.mkdirSync(path.dirname(absolute), { recursive: true });
  fs.writeFileSync(absolute, text, 'utf8');
  return absolute;
}

function readJsonFile(filePath) {
  const absolute = path.resolve(filePath);
  if (!fs.existsSync(absolute)) {
    throw new CoverageError(`No existe el archivo: ${absolute}`, { code: 'FILE_NOT_FOUND' });
  }
  try {
    return JSON.parse(fs.readFileSync(absolute, 'utf8'));
  } catch (cause) {
    throw new CoverageError(`JSON inválido (${absolute}): ${cause.message}`, {
      code: 'INVALID_JSON',
      cause,
    });
  }
}

module.exports = { writeJson, writeText, readJsonFile };
