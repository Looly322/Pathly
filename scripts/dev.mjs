import { spawn } from 'node:child_process';
const children = [];
try {
  const response = await fetch('http://127.0.0.1:8787/api/health', { signal: AbortSignal.timeout(1000) });
  if (!response.ok) throw new Error('Backend unavailable');
} catch {
  children.push(spawn('python3', ['backend/server.py'], { stdio: 'inherit' }));
}
children.push(spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--host', '0.0.0.0'], { stdio: 'inherit' }));
function stop() { for (const child of children) child.kill('SIGTERM'); }
for (const child of children) {
  child.on('error', () => { stop(); process.exitCode = 1; });
  child.on('exit', (code) => { stop(); process.exitCode = code || 0; });
}
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
