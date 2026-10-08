const path = require('path');
const { spawn } = require('child_process');

const apiProcess = spawn(process.execPath, ['server/server.js'], { stdio: 'inherit' });
let frontendProcess;
let stopping = false;
let apiExited = false;

const stop = (exitCode = 0) => {
  if (stopping) return;
  stopping = true;
  process.exitCode = exitCode;
  frontendProcess?.kill();
  apiProcess.kill();
};

process.once('SIGINT', () => stop());
process.once('SIGTERM', () => stop());

apiProcess.on('error', error => {
  console.error(`Could not start the API server: ${error.message}`);
  stop(1);
});

apiProcess.on('exit', (code, signal) => {
  if (stopping) return;
  apiExited = true;
  stopping = true;
  frontendProcess?.kill();
  process.exitCode = code ?? (signal ? 1 : 0);
});

const delay = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds));

const startFrontend = async () => {
  const deadline = Date.now() + 90_000;
  while (!stopping && Date.now() < deadline) {
    try {
      const response = await fetch('http://127.0.0.1:5000/api/health');
      if (response.ok) break;
    } catch {
      if (apiExited) return;
    }
    await delay(500);
  }

  if (stopping || apiExited) return;
  if (Date.now() >= deadline) {
    console.error('The API did not become healthy within 90 seconds. Check the API startup output above.');
    stop(1);
    return;
  }

  frontendProcess = spawn(process.execPath, [path.join(process.cwd(), 'node_modules', 'vite', 'bin', 'vite.js'), '--host', '0.0.0.0'], { stdio: 'inherit' });
  frontendProcess.on('error', error => {
    console.error(`Could not start the frontend: ${error.message}`);
    stop(1);
  });
  frontendProcess.on('exit', code => {
    if (!stopping) stop(code ?? 1);
  });
};

startFrontend();