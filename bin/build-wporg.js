#!/usr/bin/env node
/**
 * Zip per WordPress.org: come quello di rilascio, ma senza gli aggiornamenti da GitHub
 * (WordPress.org non permette sistemi di aggiornamento propri).
 *
 *   node bin/build-wporg.js
 *
 * Crea dist/kaosslider-wporg-<versione>.zip con la cartella kaosslider/ all'interno.
 */

'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
// Su Windows serve il tar di sistema (bsdtar): quello di Git non gestisce i percorsi C:\ né crea zip.
const TAR = process.platform === 'win32' ? path.join(process.env.SystemRoot || 'C:\\Windows', 'System32', 'tar.exe') : 'bsdtar';
const run = (cmd, args, cwd = ROOT) => execFileSync(cmd, args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });

const main = fs.readFileSync(path.join(ROOT, 'kaosslider.php'), 'utf8');
const version = (main.match(/^\s*\*\s*Version:\s*(\S+)/m) || [])[1];
if (!version) {
	throw new Error('Versione non trovata in kaosslider.php');
}

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'kaosslider-wporg-'));
const tar = path.join(tmp, 'src.tar');
run('git', ['archive', '--format=tar', '--prefix=kaosslider/', '-o', tar, 'HEAD']);
run(TAR, ['-xf', tar, '-C', tmp]);
fs.unlinkSync(tar);
const dir = path.join(tmp, 'kaosslider');

// 1. Niente aggiornamenti da GitHub.
fs.unlinkSync(path.join(dir, 'includes', 'class-kaosslider-updater.php'));
const php = path.join(dir, 'kaosslider.php');
fs.writeFileSync(php, fs.readFileSync(php, 'utf8').replace(/^ \* Update URI:.*\r?\n/m, ''));

// 2. Nel readme non c'è più GitHub tra i servizi esterni.
const readme = path.join(dir, 'readme.txt');
fs.writeFileSync(readme, fs.readFileSync(readme, 'utf8').replace(/^\* \*\*GitHub\*\*.*\r?\n/m, ''));

for (const [file, re] of [['kaosslider.php', /Update URI/], ['readme.txt', /\*\*GitHub\*\*/]]) {
	if (re.test(fs.readFileSync(path.join(dir, file), 'utf8'))) {
		throw new Error('Pulizia non riuscita in ' + file);
	}
}

const out = path.join(ROOT, 'dist', 'kaosslider-wporg-' + version + '.zip');
fs.mkdirSync(path.dirname(out), { recursive: true });
if (fs.existsSync(out)) {
	fs.unlinkSync(out);
}
run(TAR, ['-a', '-c', '-f', out, 'kaosslider'], tmp);
fs.rmSync(tmp, { recursive: true, force: true });
console.log('Creato ' + path.relative(ROOT, out) + ' (' + Math.round(fs.statSync(out).size / 1024) + ' KB)');
