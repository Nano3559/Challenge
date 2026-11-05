'use strict';

let quiet = false;

function setQuiet(value) {
  quiet = Boolean(value);
}

function stamp() {
  return new Date().toISOString();
}

const log = {
  debug(message, ...extra) {
    if (!quiet && process.env.COVERAGE_DEBUG === 'true') {
      console.log(`[${stamp()}] DEBUG ${message}`, ...extra);
    }
  },
  info(message, ...extra) {
    if (!quiet) console.log(`[${stamp()}] INFO  ${message}`, ...extra);
  },
  warn(message, ...extra) {
    console.warn(`[${stamp()}] WARN  ${message}`, ...extra);
  },
  error(message, ...extra) {
    console.error(`[${stamp()}] ERROR ${message}`, ...extra);
  },
};

module.exports = { log, setQuiet };
