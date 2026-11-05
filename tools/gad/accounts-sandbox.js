'use strict';

// Arranque exclusivo de la fixture: cambia solo la configuración en memoria del proceso hijo.
const path = require('path');
const fs = require('fs');
const root = path.resolve(__dirname, '../..');
const db = path.resolve(process.argv[2] || '');
const reports = path.join(root, 'reports');
if (!process.send || !db.startsWith(reports + path.sep) || path.basename(db) !== 'db.json' || !fs.existsSync(db)) {
  throw new Error('La base aislada debe existir dentro de reports y el proceso debe pertenecer a la fixture.');
}
const gad = path.join(root, 'gad-gui-api-demo');
process.chdir(gad);
const { config } = require(path.join(gad, 'config/config-general'));
config.dbPath = path.relative(gad, db);
const { featureFlagConfig } = require(path.join(gad, 'config/config-features'));
featureFlagConfig.feature_bug_hatch_module = false;
featureFlagConfig.feature_gad_talk_module = false;
const { serverApp } = require(path.join(gad, 'server'));
const ready = () => process.send({ baseUrl: `http://127.0.0.1:${serverApp.address().port}` });
if (serverApp.listening) ready();
else serverApp.once('listening', ready);
