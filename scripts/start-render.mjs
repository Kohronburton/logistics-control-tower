import { spawn } from 'node:child_process';

const port = process.env.PORT ?? '10000';
const children = [];

function run(command, args) {
  const child = spawn(command, args, {
    stdio: 'inherit',
    shell: true,
    env: process.env
  });
  children.push(child);
  child.on('exit', (code) => {
    if (code && code !== 0) process.exitCode = code;
  });
  return child;
}

run('npm', ['run', 'start', '-w', 'apps/api']);
run('npm', ['run', 'dev', '-w', 'apps/web', '--', '--host', '0.0.0.0', '--port', port]);

function shutdown(signal) {
  for (const child of children) child.kill(signal);
  process.exit(0);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
