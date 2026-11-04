const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const root = path.resolve(__dirname, '..');
const target = path.join(root, 'cloudflare', 'solo-assets.mjs');
const source = fs.readFileSync(target, 'utf8');
const pattern = /const files=(.*);\r?\nexport function/;
const match = source.match(pattern);
if (!match) throw new Error('Embedded asset manifest was not found.');
const files = JSON.parse(match[1]);
for (const [url, entry] of Object.entries(files)) {
  const file = path.resolve(root, '.' + url);
  if (!file.startsWith(root + path.sep)) throw new Error('Invalid asset path: ' + url);
  const body = fs.readFileSync(file, 'utf8').replaceAll('\r\n', '\n');
  entry.body = body;
  entry.etag = '"' + crypto.createHash('sha256').update(body).digest('hex') + '"';
}
fs.writeFileSync(target, source.replace(pattern, () => 'const files=' + JSON.stringify(files) + ';\nexport function'));
console.log('Updated ' + Object.keys(files).length + ' embedded assets and their ETags.');
