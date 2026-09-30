import { build } from 'esbuild';
import { readdir, readFile, mkdir, writeFile, copyFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve, join } from 'node:path';
const root = fileURLToPath(new URL('../../../', import.meta.url));
const pkg = resolve(root, 'packages/humanette');
await mkdir(join(pkg, 'dist/assets'), { recursive: true });
const assets = {};
for (const file of (await readdir(join(root, 'docs')))
  .filter((file) => file.endsWith('.svg'))
  .sort()) {
  const svg = await readFile(join(root, 'docs', file), 'utf8');
  const size = svg
    .match(/viewBox="([^"]+)"/)[1]
    .split(/\s+/)
    .map(Number);
  assets[file.slice(0, -4)] = {
    src: 'data:image/svg+xml;base64,' + Buffer.from(svg).toString('base64'),
    width: size[2],
    height: size[3],
  };
  await copyFile(join(root, 'docs', file), join(pkg, 'dist/assets', file));
}
const plugin = {
  name: 'bundled-cursors',
  setup(b) {
    b.onResolve({ filter: /^virtual:cursors$/ }, () => ({ path: 'cursors', namespace: 'assets' }));
    b.onLoad({ filter: /.*/, namespace: 'assets' }, () => ({
      contents: `export default ${JSON.stringify(assets)}`,
      loader: 'js',
    }));
  },
};
await build({
  entryPoints: [
    join(pkg, 'src/index.ts'),
    join(pkg, 'src/motion.ts'),
    join(pkg, 'src/playwright.ts'),
  ],
  outdir: join(pkg, 'dist'),
  bundle: true,
  format: 'esm',
  platform: 'neutral',
  target: 'es2022',
  sourcemap: true,
  external: ['node:*'],
  plugins: [plugin],
});
await build({
  entryPoints: [join(pkg, 'src/index.ts')],
  outfile: join(pkg, 'dist/humanette.global.js'),
  bundle: true,
  format: 'iife',
  globalName: 'Humanette',
  target: 'es2022',
  minify: true,
  plugins: [plugin],
});
await writeFile(
  join(pkg, 'dist/assets/manifest.json'),
  JSON.stringify(Object.keys(assets), null, 2) + '\n',
);
console.log(`Built Humanette with ${Object.keys(assets).length} embedded SVGs.`);
