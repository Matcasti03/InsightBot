import { build } from 'esbuild';
import fs from 'node:fs/promises';
import { buildCapsule } from './model.mjs';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
const source = new URL('.', import.meta.url);
const destination = new URL('../../public/capsula-3d/', source);
await fs.mkdir(destination, { recursive: true });
const bundle = await build({ entryPoints: [new URL('viewer.mjs', source).pathname], bundle: true, format: 'iife', minify: true, write: false });
const template = await fs.readFile(new URL('template.html', source), 'utf8');
const html = template.replace('__BUNDLE__', () => bundle.outputFiles[0].text.replace(/<\/script/gi, '<\\/script'));
await fs.writeFile(new URL('index.html', destination), html);
// GLTFExporter uses FileReader for binary blobs; no DOM or textures are needed here.
globalThis.FileReader = class {
  readAsArrayBuffer(blob) { blob.arrayBuffer().then(value => { this.result = value; this.onloadend?.(); }); }
  readAsDataURL(blob) { blob.arrayBuffer().then(value => { this.result = `data:${blob.type};base64,${Buffer.from(value).toString('base64')}`; this.onloadend?.(); }); }
};
const model = buildCapsule();
model.root.updateMatrixWorld(true);
const glb = await new GLTFExporter().parseAsync(model.root, { binary: true });
await fs.writeFile(new URL('InSightBot-capsula-conceitual.glb', destination), Buffer.from(glb));
await fs.writeFile(new URL('.nojekyll', destination), '');
console.log('Capsule 3D: standalone HTML + GLB generated.');
