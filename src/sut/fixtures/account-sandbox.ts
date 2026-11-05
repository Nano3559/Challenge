import { fork, type ChildProcess } from 'node:child_process';
import { copyFile, mkdir, mkdtemp, rm } from 'node:fs/promises';
import net from 'node:net';
import path from 'node:path';

async function availablePort(): Promise<number> {
  const listener = net.createServer();
  await new Promise<void>((resolve, reject) => {
    listener.once('error', reject);
    listener.listen(0, '127.0.0.1', resolve);
  });
  const address = listener.address() as net.AddressInfo;
  await new Promise<void>((resolve, reject) => listener.close((error) => error ? reject(error) : resolve()));
  return address.port;
}

async function stop(child: ChildProcess) {
  if (child.exitCode !== null || child.signalCode !== null) return;
  await new Promise<void>((resolve) => {
    child.once('exit', () => resolve());
    child.kill();
  });
}

export async function startAccountSandbox() {
  const root = process.cwd();
  const reports = path.resolve(root, 'reports');
  await mkdir(reports, { recursive: true });
  const directory = await mkdtemp(path.join(reports, 'gad-accounts-'));
  let child: ChildProcess | undefined;
  const dispose = async () => {
    if (child) await stop(child);
    // Solo se elimina el directorio propio creado por mkdtemp dentro de reports.
    if (path.dirname(path.resolve(directory)) !== reports || !path.basename(directory).startsWith('gad-accounts-')) {
      throw new Error('Ruta de limpieza de sandbox fuera de reports.');
    }
    await rm(directory, { recursive: true, force: true });
  };
  try {
    const db = path.join(directory, 'db.json');
    await copyFile(path.join(root, 'gad-gui-api-demo/db/db-base.json'), db);
    const port = await availablePort();
    // GAD abre WebSocket en PORT + 10; comprobar también ese puerto antes del arranque.
    const wsProbe = net.createServer();
    await new Promise<void>((resolve, reject) => {
      wsProbe.once('error', reject);
      wsProbe.listen(port + 10, '127.0.0.1', resolve);
    });
    await new Promise<void>((resolve) => wsProbe.close(() => resolve()));
    child = fork(path.join(root, 'tools/gad/accounts-sandbox.js'), [db], {
      cwd: root,
      env: { ...process.env, PORT: String(port), DB: '', READ_ONLY: '0', SSL_ENABLED: '0' },
      stdio: ['ignore', 'ignore', 'ignore', 'ipc'],
    });
    const running = child;
    const baseUrl = await new Promise<string>((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('GAD aislado no inició en 30 segundos.')), 30_000);
      running.once('error', (error) => { clearTimeout(timeout); reject(error); });
      running.once('exit', (code) => { clearTimeout(timeout); reject(new Error(`GAD aislado terminó con código ${code}.`)); });
      running.once('message', (message: { baseUrl?: string }) => {
        clearTimeout(timeout);
        if (!message.baseUrl) reject(new Error('GAD aislado no comunicó su URL.'));
        else resolve(message.baseUrl);
      });
    });
    return { baseUrl, dispose };
  } catch (error) {
    await dispose();
    throw error;
  }
}
