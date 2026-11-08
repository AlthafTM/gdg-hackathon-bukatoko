import { build } from 'esbuild';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { readFile, writeFile } from 'node:fs/promises';

const require = createRequire(import.meta.url);
await import('./build-shell.mjs');
const root = fileURLToPath(new URL('../', import.meta.url));
await build({
  absWorkingDir: root,
  entryPoints: ['frontend/src/main.jsx'],
  outfile: 'app/assets/react-ui.js',
  bundle: true,
  format: 'iife',
  target: ['es2020'],
  minify: true,
  sourcemap: false,
  legalComments: 'eof',
  define: { 'process.env.NODE_ENV': '"production"' },
});
const cli = path.join(path.dirname(require.resolve('@tailwindcss/cli/package.json')), 'dist/index.mjs');
const css = spawnSync(process.execPath, [cli, '-i', 'frontend/src/tailwind.css', '-o', 'app/assets/react-ui.css', '--minify'], {
  cwd: root, stdio: 'inherit', timeout: 60000,
});
if (css.status !== 0) throw new Error('Tailwind compilation failed', { cause: css.error });
const notices = [];
for (const name of ['react', 'react-dom', 'scheduler', 'tailwindcss']) {
  const directory = path.dirname(require.resolve(name + '/package.json'));
  notices.push(name + '\n' + await readFile(path.join(directory, 'LICENSE'), 'utf8'));
}
await writeFile(path.join(root, 'app/assets/THIRD-PARTY-NOTICES.txt'), notices.join('\n\n'), 'utf8');
