#!/usr/bin/env node
/**
 * Rilascio di una nuova versione di KaosSlider.
 *
 *   node bin/release.js keygen   crea la coppia di chiavi di firma (una volta sola)
 *   node bin/release.js          crea lo zip, lo firma e pubblica la release su GitHub
 *
 * La chiave privata resta in %USERPROFILE%\.kaosslider (fuori dal repository e da OneDrive).
 * La chiave pubblica va in includes/class-kaosslider-updater.php (PUBLIC_KEY).
 */

'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const { execFileSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const KEY_DIR = path.join(os.homedir(), '.kaosslider');
const KEY_FILE = path.join(KEY_DIR, 'signing-key.pem');
const GH = process.platform === 'win32' && fs.existsSync('C:\\Program Files\\GitHub CLI\\gh.exe') ? 'C:\\Program Files\\GitHub CLI\\gh.exe' : 'gh';

function fail(msg) {
	console.error('\n✖ ' + msg + '\n');
	process.exit(1);
}

function run(cmd, args, opts = {}) {
	return execFileSync(cmd, args, Object.assign({ cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }, opts)).trim();
}

function rawPublicKey(keyObject) {
	// SPKI DER di una chiave Ed25519: gli ultimi 32 byte sono la chiave pubblica "grezza" usata da libsodium.
	return crypto.createPublicKey(keyObject).export({ type: 'spki', format: 'der' }).subarray(-32).toString('base64');
}

function keygen() {
	if (fs.existsSync(KEY_FILE)) {
		fail('La chiave esiste già in ' + KEY_FILE + '. Non la sovrascrivo: se la perdi, i siti non accetteranno più gli aggiornamenti.');
	}
	fs.mkdirSync(KEY_DIR, { recursive: true });
	const { privateKey } = crypto.generateKeyPairSync('ed25519');
	fs.writeFileSync(KEY_FILE, privateKey.export({ type: 'pkcs8', format: 'pem' }), { mode: 0o600 });
	console.log('Chiave privata salvata in: ' + KEY_FILE);
	console.log('Fanne una copia di sicurezza offline (es. chiavetta USB): senza, non potrai firmare nuove versioni.');
	console.log('\nChiave pubblica (va in PUBLIC_KEY di includes/class-kaosslider-updater.php):\n' + rawPublicKey(privateKey));
}

function read(rel) {
	return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

function release() {
	if (!fs.existsSync(KEY_FILE)) {
		fail('Chiave di firma non trovata in ' + KEY_FILE + '. Creala con: node bin/release.js keygen');
	}
	const privateKey = crypto.createPrivateKey(fs.readFileSync(KEY_FILE));

	// Versione: deve coincidere in intestazione del plugin, costante e readme.
	const main = read('kaosslider.php');
	const header = (main.match(/^\s*\*\s*Version:\s*(\S+)/m) || [])[1];
	const constant = (main.match(/define\(\s*'KAOSSLIDER_VERSION',\s*'([^']+)'/) || [])[1];
	const readme = read('readme.txt');
	const stable = (readme.match(/^Stable tag:\s*(\S+)/m) || [])[1];
	if (!header || header !== constant || header !== stable) {
		fail('Versioni diverse: intestazione ' + header + ', costante ' + constant + ', readme ' + stable + '.');
	}
	const version = header;
	if (!/^\d+\.\d+\.\d+$/.test(version)) {
		fail('La versione deve essere nel formato 1.2.3 (trovato ' + version + ').');
	}
	const notes = (readme.split(/^= /m).find((s) => s.startsWith(version + ' =')) || '').replace(/^.*=\s*\n/, '').trim();
	if (!notes) {
		fail('Manca la voce "= ' + version + ' =" nel Changelog di readme.txt.');
	}

	// Chiave pubblica nel plugin: deve corrispondere alla chiave privata, altrimenti i siti rifiuterebbero l'aggiornamento.
	const updater = read('includes/class-kaosslider-updater.php');
	const embedded = (updater.match(/const PUBLIC_KEY\s*=\s*'([^']+)'/) || [])[1];
	if (embedded !== rawPublicKey(privateKey)) {
		fail('La chiave pubblica in class-kaosslider-updater.php non corrisponde alla chiave privata.');
	}

	// Repository: tutto committato, su main, allineato a GitHub, versione non ancora pubblicata.
	if (run('git', ['status', '--porcelain'])) {
		fail('Ci sono modifiche non committate.');
	}
	if (run('git', ['rev-parse', '--abbrev-ref', 'HEAD']) !== 'main') {
		fail('Il rilascio si fa dal ramo main.');
	}
	run('git', ['fetch', 'origin', 'main']);
	if (run('git', ['rev-parse', 'HEAD']) !== run('git', ['rev-parse', 'origin/main'])) {
		fail('Il ramo main locale non è allineato a GitHub: fai prima git push (o git pull).');
	}
	if (run('git', ['tag', '--list', 'v' + version])) {
		fail('La versione ' + version + ' è già stata rilasciata: aumenta il numero di versione.');
	}

	// Zip (senza i file di sviluppo, vedi .gitattributes) e firma.
	const dist = path.join(ROOT, 'dist');
	fs.mkdirSync(dist, { recursive: true });
	const zip = path.join(dist, 'kaosslider-' + version + '.zip');
	run('git', ['archive', '--format=zip', '--prefix=kaosslider/', '-o', zip, 'HEAD']);
	const data = fs.readFileSync(zip);
	const signature = crypto.sign(null, data, privateKey);
	if (!crypto.verify(null, data, crypto.createPublicKey(privateKey), signature)) {
		fail('Verifica della firma non riuscita.');
	}
	fs.writeFileSync(zip + '.sig', signature.toString('base64') + '\n');
	console.log('Creato ' + path.relative(ROOT, zip) + ' (' + Math.round(data.length / 1024) + ' KB) e la sua firma.');

	// Release su GitHub (crea anche il tag).
	const notesFile = path.join(dist, 'notes-' + version + '.md');
	fs.writeFileSync(notesFile, notes + '\n');
	run(GH, ['release', 'create', 'v' + version, zip, zip + '.sig', '--title', 'KaosSlider ' + version, '--notes-file', notesFile, '--target', 'main'], { stdio: ['ignore', 'inherit', 'inherit'] });
	run('git', ['fetch', '--tags']);
	console.log('\n✔ Versione ' + version + ' pubblicata. I siti la vedranno in Bacheca → Aggiornamenti entro qualche ora (o subito con "Controlla aggiornamenti").');
}

if (process.argv[2] === 'keygen') {
	keygen();
} else if (!process.argv[2]) {
	release();
} else {
	fail('Comando sconosciuto. Usa: node bin/release.js [keygen]');
}
