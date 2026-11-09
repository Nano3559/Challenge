'use strict';

// Start the checked-out GAD application directly under the V8 coverage environment.
const path = require('node:path');

const appDirectory = path.resolve(process.env.GAD_APP_DIR || path.join(process.cwd(), 'gad-gui-api-demo'));
process.chdir(appDirectory);
const { serverApp } = require(path.join(appDirectory, 'server.js'));

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
process.once('SIGTERM', stopServer);
process.once('SIGINT', stopServer);
