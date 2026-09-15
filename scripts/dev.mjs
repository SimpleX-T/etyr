import { spawn } from 'child_process';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(__dirname, '..');

function run(name, args) {
  const child = spawn('npx', args, { cwd: rootDir, stdio: 'inherit', shell: true });
  child.on('exit', (code) => {
    process.exit(code ?? 0);
  });
  return child;
}

const main = run('vite', ['vite', 'build', '--watch', '--mode', 'development']);
const content = run('vite', ['vite', 'build', '--watch', '--config', 'vite.content.config.ts']);

for (const sig of ['SIGINT', 'SIGTERM']) {
  process.on(sig, () => {
    main.kill(sig);
    content.kill(sig);
    process.exit(0);
  });
}