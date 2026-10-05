#!/usr/bin/env node
/**
 * Zip per WordPress.org: come quello di rilascio, ma senza gli aggiornamenti da GitHub
 * (WordPress.org non permette sistemi di aggiornamento propri) e senza le traduzioni incluse.
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
// Su Linux (CI) bastano tar e zip.
const WIN = process.platform === 'win32';
const TAR = WIN ? path.join(process.env.SystemRoot || 'C:\\Windows', 'System32', 'tar.exe') : 'tar';
const run = (cmd, args, cwd = ROOT) => execFileSync(cmd, args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });

const main = fs.readFileSync(path.join(ROOT, 'kaosslider.php'), 'utf8');
const version = (main.match(/^\s*\*\s*Version:\s*(\S+)/m) || [])[1];
if (!version) {
	throw new Error('Versione non trovata in kaosslider.php');
}

// Lo zip nasce dall'ultimo commit: con modifiche non salvate non corrisponderebbe ai file.
if (run('git', ['status', '--porcelain']).trim()) {
	throw new Error('Ci sono modifiche non committate: fai prima il commit.');
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

// 3. Niente traduzioni incluse: su WordPress.org arrivano da translate.wordpress.org e WordPress le carica da solo.
fs.rmSync(path.join(dir, 'languages'), { recursive: true, force: true });
fs.writeFileSync(php, fs.readFileSync(php, 'utf8').replace(/^add_action\(\s*'init',\s*function \(\) \{\s*load_plugin_textdomain\([^;]*\);\s*\},\s*0\s*\);\r?\n/m, ''));
for (const file of ['includes/class-kaosslider-admin.php', 'includes/integrations/block.php']) {
	const f = path.join(dir, file);
	fs.writeFileSync(f, fs.readFileSync(f, 'utf8').replace(/(wp_set_script_translations\( '[\w-]+', 'kaosslider'), KAOSSLIDER_DIR \. 'languages' \)/g, '$1 )'));
}

for (const [file, re] of [['kaosslider.php', /Update URI|load_plugin_textdomain/], ['readme.txt', /\*\*GitHub\*\*/], ['includes/class-kaosslider-admin.php', /'languages'/], ['includes/integrations/block.php', /'languages'/]]) {
	if (re.test(fs.readFileSync(path.join(dir, file), 'utf8'))) {
		throw new Error('Pulizia non riuscita in ' + file);
	}
}

const out = path.join(ROOT, 'dist', 'kaosslider-wporg-' + version + '.zip');
fs.mkdirSync(path.dirname(out), { recursive: true });
if (fs.existsSync(out)) {
	fs.unlinkSync(out);
}
if (WIN) {
	run(TAR, ['-a', '-c', '-f', out, 'kaosslider'], tmp);
} else {
	run('zip', ['-qr', out, 'kaosslider'], tmp);
}
fs.rmSync(tmp, { recursive: true, force: true });
console.log('Creato ' + path.relative(ROOT, out) + ' (' + Math.round(fs.statSync(out).size / 1024) + ' KB)');
