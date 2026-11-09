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
if (process.env.GAD_SANDBOX_SOCIAL_FEATURES === '1') {
  featureFlagConfig.feature_labels = true;
  featureFlagConfig.feature_likes = true;
  featureFlagConfig.feature_user_bookmark_articles = true;
}
const { serverApp } = require(path.join(gad, 'server'));
let stopping = false;
function stopServer() {
  if (stopping) return;
  stopping = true;
  const forceStop = setTimeout(() => process.exit(1), 5_000);
  forceStop.unref();
  const exit = () => { clearTimeout(forceStop); process.exit(0); };
  if (serverApp.listening) serverApp.close(exit);
  else exit();
}
process.on('message', (message) => { if (message?.type === 'shutdown') stopServer(); });
process.once('SIGTERM', stopServer);
process.once('SIGINT', stopServer);
const ready = () => process.send({ baseUrl: `http://127.0.0.1:${serverApp.address().port}` });
if (serverApp.listening) ready();
else serverApp.once('listening', ready);
