/*!
 * KaosSlider – runtime frontend (nessuna dipendenza, Web Animations API)
 */
(function () {
	'use strict';

	var EASINGS = {
		linear: 'linear',
		ease: 'ease',
		easeIn: 'cubic-bezier(.55,.055,.675,.19)',
		easeOut: 'cubic-bezier(.22,1,.36,1)',
		easeInOut: 'cubic-bezier(.65,0,.35,1)',
		back: 'cubic-bezier(.34,1.56,.64,1)',
		expo: 'cubic-bezier(.16,1,.3,1)'
	};

	/* Stato "di partenza" di ogni effetto; l'arrivo è sempre lo stato naturale del livello. */
	var FROM = {
		fade: { opacity: 0 },
		fadeUp: { opacity: 0, transform: 'translate3d(0,60px,0)' },
		fadeDown: { opacity: 0, transform: 'translate3d(0,-60px,0)' },
		fadeLeft: { opacity: 0, transform: 'translate3d(-80px,0,0)' },
		fadeRight: { opacity: 0, transform: 'translate3d(80px,0,0)' },
		zoomIn: { opacity: 0, transform: 'scale(.5)' },
		zoomOut: { opacity: 0, transform: 'scale(1.5)' },
		rotateIn: { opacity: 0, transform: 'rotate(-20deg) scale(.7)' },
		blurIn: { opacity: 0, filter: 'blur(20px)' },
		maskUp: { clipPath: 'inset(100% 0% 0% 0%)', transform: 'translate3d(0,30px,0)' },
		maskLeft: { clipPath: 'inset(0% 100% 0% 0%)' },
		flipUp: { opacity: 0, transform: 'perspective(600px) rotateX(90deg)' },
		revealUp: { transform: 'translate3d(0,110%,0)' },
		skewIn: { opacity: 0, transform: 'translate3d(-60px,0,0) skewX(30deg)' },
		dropIn: { opacity: 0, transform: 'translate3d(0,-140px,0)' }
	};

	FROM.rollIn = { opacity: 0, transform: 'translate3d(-100%,0,0) rotate(-120deg)' };
	FROM.swingIn = { opacity: 0, transform: 'perspective(600px) rotateX(-90deg)' };
	FROM.zoomBlur = { opacity: 0, transform: 'scale(1.6)', filter: 'blur(16px)' };
	FROM.scaleX = { transform: 'scaleX(0)' };
	FROM.scaleY = { transform: 'scaleY(0)' };
	FROM.rotateY = { opacity: 0, transform: 'perspective(800px) rotateY(90deg)' };

	/* Effetti a più fotogrammi (rimbalzi, elastici). */
	var KEYFRAMES = {
		bounceIn: [
			{ opacity: 0, transform: 'scale(.3)' },
			{ opacity: 1, transform: 'scale(1.08)', offset: 0.55 },
			{ opacity: 1, transform: 'scale(.96)', offset: 0.78 },
			{ opacity: 1, transform: 'scale(1)' }
		],
		elasticUp: [
			{ opacity: 0, transform: 'translate3d(0,80px,0)' },
			{ opacity: 1, transform: 'translate3d(0,-14px,0)', offset: 0.6 },
			{ opacity: 1, transform: 'translate3d(0,5px,0)', offset: 0.8 },
			{ opacity: 1, transform: 'translate3d(0,0,0)' }
		],
		lightSpeed: [
			{ opacity: 0, transform: 'translate3d(60%,0,0) skewX(-30deg)' },
			{ opacity: 1, transform: 'translate3d(0,0,0) skewX(20deg)', offset: 0.6 },
			{ opacity: 1, transform: 'translate3d(0,0,0) skewX(-5deg)', offset: 0.8 },
			{ opacity: 1, transform: 'translate3d(0,0,0) skewX(0deg)' }
		]
	};

	/* Punto di origine delle trasformazioni per alcuni effetti. */
	var ORIGINS = { swingIn: '50% 0%', scaleX: '0% 50%', scaleY: '50% 100%' };

	/* Effetto personalizzato: stato di partenza costruito dai valori scelti nell'editor. */
	function customFrames(c, s) {
		c = c || {};
		s = s || 1;
		var p3d = (+c.rotateX || +c.rotateY) ? 'perspective(800px) ' : '';
		var from = p3d + 'translate3d(' + (+c.x || 0) * s + 'px,' + (+c.y || 0) * s + 'px,0) scale(' + (c.scale != null ? +c.scale : 1) + ') rotate(' + (+c.rotate || 0) + 'deg) rotateX(' + (+c.rotateX || 0) + 'deg) rotateY(' + (+c.rotateY || 0) + 'deg) skewX(' + (+c.skewX || 0) + 'deg)';
		var to = p3d + 'translate3d(0px,0px,0) scale(1) rotate(0deg) rotateX(0deg) rotateY(0deg) skewX(0deg)';
		return [
			{ opacity: c.opacity != null ? +c.opacity : 0, transform: from, filter: 'blur(' + (+c.blur || 0) * s + 'px)' },
			{ opacity: 1, transform: to, filter: 'blur(0px)' }
		];
	}

	function framesFor(effect, custom, s) {
		if (effect === 'custom') { return customFrames(custom, s); }
		if (effect === 'typewriter') { return [{ opacity: 0 }, { opacity: 1 }]; }
		if (KEYFRAMES[effect]) { return KEYFRAMES[effect]; }
		if (FROM[effect]) { return [FROM[effect], identityOf(FROM[effect])]; }
		return null;
	}

	/* Uscita = entrata al contrario. */
	function reverseFrames(frames) {
		return frames.slice().reverse().map(function (k) {
			var c = Object.assign({}, k);
			if (c.offset != null) { c.offset = 1 - c.offset; }
			return c;
		});
	}

	function scaleOf(el) {
		var r = el.closest('.kaosslider');
		return r ? (parseFloat(getComputedStyle(r).getPropertyValue('--s')) || 1) : 1;
	}

	var LOOP_CLASSES =['ks-loop-pulse', 'ks-loop-float', 'ks-loop-rotate', 'ks-loop-swing', 'ks-loop-blink'];

	var reducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

	function identityOf(from) {
		var to = {};
		Object.keys(from).forEach(function (k) {
			if (k === 'opacity') { to[k] = 1; }
			else if (k === 'filter') { to[k] = 'blur(0px)'; }
			else if (k === 'clipPath') { to[k] = 'inset(0% 0% 0% 0%)'; }
			else { to[k] = 'none'; }
		});
		return to;
	}

	function ease(name) {
		return EASINGS[name] || EASINGS.easeOut;
	}

	/* ---------- Testo spezzato ---------- */

	function unsplit(inner) {
		if (inner && inner._ksOrig != null) {
			inner.innerHTML = inner._ksOrig;
			inner.classList.remove('ks-is-split');
			inner._ksOrig = null;
			inner._ksSplitKey = null;
			inner._ksPieces = null;
		}
	}

	function splitText(inner, mode, mask) {
		var key = mode + (mask ? '-m' : '');
		if (inner._ksSplitKey === key) {
			return inner._ksPieces;
		}
		unsplit(inner);
		inner._ksOrig = inner.innerHTML;

		var pieces = [];
		var nodes = [];
		var walker = document.createTreeWalker(inner, NodeFilter.SHOW_TEXT, null);
		while (walker.nextNode()) {
			nodes.push(walker.currentNode);
		}

		function piece(text) {
			var s = document.createElement('span');
			s.className = 'ks-split';
			s.textContent = text;
			pieces.push(s);
			if (mask) {
				var m = document.createElement('span');
				m.className = 'ks-split-mask';
				m.appendChild(s);
				return m;
			}
			return s;
		}

		nodes.forEach(function (node) {
			var frag = document.createDocumentFragment();
			node.nodeValue.split(/(\s+)/).forEach(function (tok) {
				if (!tok) { return; }
				if (/^\s+$/.test(tok)) {
					frag.appendChild(document.createTextNode(tok));
					return;
				}
				if (mode === 'chars') {
					var word = document.createElement('span');
					word.style.display = 'inline-block';
					word.style.whiteSpace = 'nowrap';
					Array.from(tok).forEach(function (ch) { word.appendChild(piece(ch)); });
					frag.appendChild(word);
				} else {
					frag.appendChild(piece(tok));
				}
			});
			node.parentNode.replaceChild(frag, node);
		});

		inner._ksSplitKey = key;
		inner._ksPieces = pieces;
		inner.classList.add('ks-is-split');
		return pieces;
	}

	/* Gradiente continuo sul testo spezzato: ogni parte mostra la propria porzione del gradiente del blocco. */
	function alignGradient(inner, pieces) {
		var ir = inner.getBoundingClientRect();
		if (!ir.width) { return; }
		var k = inner.offsetWidth / ir.width; // compensa lo zoom dell'editor
		pieces.forEach(function (p) {
			var r = p.getBoundingClientRect();
			p.style.backgroundSize = (ir.width * k) + 'px ' + (ir.height * k) + 'px';
			p.style.backgroundPosition = ((ir.left - r.left) * k) + 'px ' + ((ir.top - r.top) * k) + 'px';
		});
	}

	/* Indice di riga di ogni parola (per l'effetto "per righe"). */
	function lineIndexes(pieces) {
		var tops = [];
		return pieces.map(function (p) {
			var top = Math.round((p.parentNode.classList.contains('ks-split-mask') ? p.parentNode : p).offsetTop);
			var idx = tops.indexOf(top);
			if (idx === -1) {
				tops.push(top);
				idx = tops.length - 1;
			}
			return idx;
		});
	}

	/* ---------- Animazioni dei livelli ---------- */

	function layerConfig(layer) {
		if (!layer._ksCfg) {
			try {
				layer._ksCfg = JSON.parse(layer.getAttribute('data-ks-anim') || '{}');
			} catch (e) {
				layer._ksCfg = {};
			}
		}
		return layer._ksCfg;
	}

	function stopLayer(layer) {
		(layer._ksAnims || []).forEach(function (a) { a.cancel(); });
		layer._ksAnims = [];
		var el = layer.querySelector('.ks-anim');
		if (el) {
			el.classList.remove('ks-looping');
		}
	}

	function playIn(layer, cfg) {
		cfg = cfg || layerConfig(layer);
		stopLayer(layer);

		var a = cfg['in'] || {};
		var effect = reducedMotion ? 'none' : a.effect;
		var animEl = layer.querySelector('.ks-anim');
		var inner = layer.querySelector('.ks-inner');
		var duration = +a.duration || 0;
		var delay = reducedMotion ? 0 : (+a.delay || 0);
		var frames = effect && effect !== 'none' ? framesFor(effect, a.custom, scaleOf(layer)) : null;
		var isText = inner && layer.classList.contains('ks-ltype-text');
		var typewriter = effect === 'typewriter' && isText;
		var split = typewriter ? 'chars' : a.split;
		var useSplit = frames && split && split !== 'none' && isText;

		animEl.style.transformOrigin = effect === 'custom' && a.custom && a.custom.origin
			? a.custom.origin.replace('left', '0%').replace('right', '100%').replace('top', '0%').replace('bottom', '100%').replace(/center/g, '50%')
			: (ORIGINS[effect] || '');
		if (inner) { inner.classList.remove('ks-caret'); }

		LOOP_CLASSES.forEach(function (c) { animEl.classList.remove(c); });
		var loopClass = cfg.loop && cfg.loop !== 'none' && !reducedMotion ? 'ks-loop-' + cfg.loop : '';
		if (loopClass) {
			animEl.classList.add(loopClass);
		}
		layer.classList.toggle('ks-reveal', effect === 'revealUp' && !useSplit);
		layer.style.overflow = effect === 'revealUp' && !useSplit ? 'hidden' : '';

		var anims = [];
		var drawEls = effect === 'draw' ? layer.querySelectorAll('.ks-draw path, .ks-draw text') : [];
		if (drawEls.length) {
			anims = drawAnims(drawEls, delay, duration, ease(a.easing), false);
		} else if (!frames) {
			unsplit(inner);
			// Nessun effetto: il livello compare di colpo al suo tempo.
			anims.push(animEl.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 1, delay: delay, fill: 'both' }));
		} else {
			if (useSplit) {
				var pieces = splitText(inner, split === 'chars' ? 'chars' : 'words', effect === 'revealUp');
				if (inner.classList.contains('ks-gradtext')) {
					alignGradient(inner, pieces);
				}
				var lines = split === 'lines' ? lineIndexes(pieces) : null;
				var stagger = typewriter ? (+a.stagger || 60) : (+a.stagger || 0);
				pieces.forEach(function (p, i) {
					anims.push(p.animate(frames, {
						duration: typewriter ? 1 : duration,
						delay: delay + (lines ? lines[i] : i) * stagger,
						easing: typewriter ? 'linear' : ease(a.easing),
						fill: 'both'
					}));
				});
			} else {
				unsplit(inner);
				anims.push(animEl.animate(frames, { duration: duration, delay: delay, easing: ease(a.easing), fill: 'both' }));
			}
		}

		layer._ksAnims = anims;
		Promise.all(anims.map(function (x) { return x.finished; })).then(function () {
			if (layer._ksAnims !== anims) { return; }
			// Finita l'entrata, si rimuovono le animazioni: il livello resta nel suo stato naturale.
			anims.forEach(function (x) { x.cancel(); });
			layer._ksAnims = [];
			if (typewriter) {
				inner.classList.add('ks-caret'); // cursore lampeggiante a fine scrittura
			}
			if (loopClass) {
				animEl.classList.add('ks-looping');
			}
		})['catch'](function () {});
		return anims;
	}

	function playOut(layer, cfg) {
		cfg = cfg || layerConfig(layer);
		var o = cfg.out || {};
		if (o.effect === 'draw') {
			// Uscita "disegno": il tratto si cancella.
			var els = layer.querySelectorAll('.ks-draw path, .ks-draw text');
			if (els.length) {
				stopLayer(layer);
				layer._ksAnims = drawAnims(els, 0, reducedMotion ? 1 : (+o.duration || 0), ease(o.easing), true);
				return layer._ksAnims[0];
			}
		}
		var frames = o.effect && o.effect !== 'none' ? framesFor(o.effect === 'typewriter' || o.effect === 'draw' ? 'fade' : o.effect, o.custom, scaleOf(layer)) : null;
		if (!frames) { return null; }
		stopLayer(layer);
		var animEl = layer.querySelector('.ks-anim');
		animEl.style.transformOrigin = ORIGINS[o.effect] || '';
		var anim = animEl.animate(reverseFrames(frames), {
			duration: reducedMotion ? 1 : (+o.duration || 0),
			easing: ease(o.easing),
			fill: 'forwards'
		});
		layer._ksAnims = [anim];
		return anim;
	}

	/* Disegno a mano: ogni tratto si traccia dopo il precedente (pathLength=1 rende la lunghezza uguale per tutti). */
	function drawAnims(els, delay, duration, easing, erase) {
		var out = [];
		var paths = Array.prototype.filter.call(els, function (e) { return e.tagName.toLowerCase() === 'path'; });
		var text = Array.prototype.filter.call(els, function (e) { return e.tagName.toLowerCase() === 'text'; })[0];
		if (paths.length) {
			var each = duration / paths.length;
			(erase ? paths.slice().reverse() : paths).forEach(function (p, i) {
				var f = [{ strokeDashoffset: 1 }, { strokeDashoffset: 0 }];
				out.push(p.animate(erase ? f.reverse() : f, { duration: each, delay: delay + i * each, easing: easing, fill: 'both' }));
			});
		}
		if (text) {
			var fs = parseFloat(text.getAttribute('font-size')) || 40;
			var L = Math.max(400, Math.round(text.textContent.length * fs * 3.2));
			text.style.strokeDasharray = L;
			var tf = [{ strokeDashoffset: L }, { strokeDashoffset: 0 }];
			out.push(text.animate(erase ? tf.reverse() : tf, { duration: duration, delay: delay, easing: easing, fill: 'both' }));
			if (text.closest('.ks-draw-fill')) {
				var ff = [{ fillOpacity: 0 }, { fillOpacity: 1 }];
				out.push(text.animate(erase ? ff.reverse() : ff, {
					duration: Math.min(800, duration * 0.5),
					delay: erase ? delay : delay + duration * 0.7,
					fill: 'both'
				}));
			}
		}
		return out;
	}

	function setPaused(layers, paused) {
		layers.forEach(function (layer) {
			(layer._ksAnims || []).forEach(function (a) {
				if (paused && a.playState === 'running') { a.pause(); }
				else if (!paused && a.playState === 'paused') { a.play(); }
			});
		});
	}

	/* ---------- Effetti animati su canvas (particelle e meteo) ---------- */

	var GL_FX = ['fluid', 'rays', 'morph', 'panorama', 'liquid'];
	var CONFETTI = ['#ff5c6c', '#ffd166', '#06d6a0', '#118ab2', '#7c5cff', '#ffffff', '#ff8fab'];

	function rnd(a, b) { return a + Math.random() * (b - a); }

	function FxCanvas(canvas, p) {
		var self = this;
		this.c = canvas;
		this.ctx = canvas.getContext('2d');
		this.p = p;
		this.parts = [];
		this.running = false;
		this.mouse = { x: -9999, y: -9999 };
		var raw = String(p.color || '#ffffff');
		var list = raw === 'multi' ? CONFETTI : raw.split(',');
		// I colori var(--…) non sono capiti dal canvas: si risolvono con gli stili della pagina.
		this.colors = list.map(function (c) {
			c = c.trim();
			var m = /^var\((--[\w-]+)\)$/.exec(c);
			return m ? (getComputedStyle(canvas).getPropertyValue(m[1]).trim() || '#ffffff') : c;
		});
		if (p.type === 'confetti' && this.colors.length === 1 && raw !== 'multi' && /^#?fff(fff)?$/i.test(raw.replace('#', ''))) {
			this.colors = CONFETTI; // i coriandoli bianchi "di default" diventano multicolore
		}
		if (p.interactive) {
			var host = canvas.parentNode;
			host.addEventListener('mousemove', function (e) {
				var r = canvas.getBoundingClientRect();
				var k = canvas.offsetWidth / (r.width || 1);
				self.mouse.x = (e.clientX - r.left) * k;
				self.mouse.y = (e.clientY - r.top) * k;
			});
			host.addEventListener('mouseleave', function () { self.mouse.x = self.mouse.y = -9999; });
		}
		this.resize();
	}

	FxCanvas.prototype.resize = function () {
		var w = this.c.offsetWidth;
		var h = this.c.offsetHeight;
		if (!w || !h) { return; }
		var dpr = Math.min(2, window.devicePixelRatio || 1);
		var changed = Math.abs(w - (this.w || 0)) > 2 || Math.abs(h - (this.h || 0)) > 2;
		this.w = w;
		this.h = h;
		this.c.width = Math.round(w * dpr);
		this.c.height = Math.round(h * dpr);
		this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
		if (changed || !this.parts.length) { this.seed(); }
		if (!this.running) { this.draw(0); }
	};

	FxCanvas.prototype.seed = function () {
		// La quantità è riferita a una slide 1240×700: su schermi più piccoli le particelle diminuiscono.
		var n = Math.max(3, Math.round((+this.p.count || 100) * (this.w * this.h) / (1240 * 700)));
		this.parts = [];
		for (var i = 0; i < n; i++) { this.parts.push(this.make(true)); }
	};

	FxCanvas.prototype.make = function (init) {
		var p = this.p;
		var w = this.w;
		var h = this.h;
		var s = +p.size || 3;
		var v = +p.speed || 1;
		var wind = +p.wind || 0;
		var col = this.colors[Math.floor(Math.random() * this.colors.length)];
		switch (p.type) {
			case 'rain':
				return { x: rnd(-50, w + 50), y: init ? rnd(0, h) : rnd(-h * 0.3, -10), len: rnd(8, 18) * s / 2, vy: rnd(0.8, 1.2) * v * 700, vx: wind * 90, a: rnd(0.3, 1), col: col };
			case 'stars':
				return { x: rnd(0, w), y: rnd(0, h), r: rnd(0.3, 1) * s * 0.6, tw: rnd(0, 6.28), ts: rnd(0.5, 2) * v, vx: wind * 3, col: col };
			case 'bubbles':
				return { x: rnd(0, w), y: init ? rnd(0, h) : h + rnd(10, 60), r: rnd(0.4, 1) * s * 3, vy: -rnd(0.5, 1) * v * 45, sw: rnd(0, 6.28), vx: wind * 15, a: rnd(0.4, 1), col: col };
			case 'confetti':
				return { x: rnd(0, w), y: init ? rnd(-h, h) : rnd(-60, -10), w: rnd(0.6, 1) * s * 2.2, h: rnd(0.35, 0.6) * s * 2.2, rot: rnd(0, 6.28), vr: rnd(-4, 4), fl: rnd(0, 6.28), vy: rnd(0.6, 1) * v * 90, vx: wind * 25 + rnd(-20, 20), col: col };
			case 'network':
				return { x: rnd(0, w), y: rnd(0, h), vx: rnd(-1, 1) * v * 22, vy: rnd(-1, 1) * v * 22, r: rnd(0.6, 1) * s * 0.8, col: col };
			case 'fireflies':
				return { x: rnd(0, w), y: rnd(0, h), ang: rnd(0, 6.28), sp: rnd(0.3, 1) * v * 25, r: rnd(0.6, 1) * s, ph: rnd(0, 6.28), col: col };
			default: // snow
				return { x: rnd(0, w), y: init ? rnd(0, h) : rnd(-40, -5), r: rnd(0.4, 1) * s, vy: rnd(0.5, 1) * v * 45, sw: rnd(0, 6.28), vx: wind * 22, a: rnd(0.4, 1), col: col };
		}
	};

	FxCanvas.prototype.step = function (dt) {
		var p = this.p;
		var w = this.w;
		var h = this.h;
		var m = this.mouse;
		var self = this;
		this.parts.forEach(function (q, i) {
			switch (p.type) {
				case 'rain':
					q.x += q.vx * dt; q.y += q.vy * dt;
					if (q.y > h + 20) { self.parts[i] = self.make(false); }
					break;
				case 'stars':
					q.tw += q.ts * dt * 2; q.x += q.vx * dt;
					if (q.x > w + 5) { q.x = -5; } else if (q.x < -5) { q.x = w + 5; }
					break;
				case 'bubbles':
					q.sw += dt; q.y += q.vy * dt; q.x += (Math.sin(q.sw) * 12 + q.vx) * dt;
					if (q.y < -q.r * 2) { self.parts[i] = self.make(false); }
					break;
				case 'confetti':
					q.y += q.vy * dt; q.x += q.vx * dt; q.rot += q.vr * dt; q.fl += dt * 6;
					if (q.y > h + 30) { self.parts[i] = self.make(false); }
					break;
				case 'network':
				case 'fireflies':
					if (p.type === 'fireflies') {
						q.ang += rnd(-1, 1) * dt * 2; q.ph += dt * 2;
						q.x += Math.cos(q.ang) * q.sp * dt; q.y += Math.sin(q.ang) * q.sp * dt;
					} else {
						q.x += q.vx * dt; q.y += q.vy * dt;
					}
					if (q.x < 0 || q.x > w) { q.vx = -q.vx; q.ang = Math.PI - q.ang; q.x = Math.max(0, Math.min(w, q.x)); }
					if (q.y < 0 || q.y > h) { q.vy = -q.vy; q.ang = -q.ang; q.y = Math.max(0, Math.min(h, q.y)); }
					break;
				default:
					q.sw += dt; q.y += q.vy * dt; q.x += (Math.sin(q.sw) * 18 + q.vx) * dt;
					if (q.y > h + 10) { self.parts[i] = self.make(false); }
					if (q.x > w + 10) { q.x = -10; } else if (q.x < -10) { q.x = w + 10; }
			}
			// Il mouse allontana le particelle (tranne la rete, che invece si collega al puntatore).
			if (p.interactive && p.type !== 'network' && p.type !== 'rain') {
				var dx = q.x - m.x;
				var dy = q.y - m.y;
				var d2 = dx * dx + dy * dy;
				if (d2 < 10000 && d2 > 1) {
					var f = (1 - Math.sqrt(d2) / 100) * 120 * dt;
					var dd = Math.sqrt(d2);
					q.x += dx / dd * f;
					q.y += dy / dd * f;
				}
			}
		});
	};

	FxCanvas.prototype.draw = function () {
		var ctx = this.ctx;
		var p = this.p;
		var op = +p.opacity || 0.8;
		ctx.clearRect(0, 0, this.w, this.h);
		ctx.lineCap = 'round';
		var parts = this.parts;
		var i;
		var q;
		if (p.type === 'network') {
			var L = 110 + (+p.size || 3) * 6;
			ctx.lineWidth = 1;
			for (i = 0; i < parts.length; i++) {
				for (var j = i + 1; j < parts.length; j++) {
					var dx = parts[i].x - parts[j].x;
					var dy = parts[i].y - parts[j].y;
					var d = Math.sqrt(dx * dx + dy * dy);
					if (d < L) {
						ctx.globalAlpha = (1 - d / L) * op * 0.55;
						ctx.strokeStyle = parts[i].col;
						ctx.beginPath(); ctx.moveTo(parts[i].x, parts[i].y); ctx.lineTo(parts[j].x, parts[j].y); ctx.stroke();
					}
				}
				if (p.interactive) {
					var mx = parts[i].x - this.mouse.x;
					var my = parts[i].y - this.mouse.y;
					var md = Math.sqrt(mx * mx + my * my);
					if (md < L * 1.4) {
						ctx.globalAlpha = (1 - md / (L * 1.4)) * op * 0.8;
						ctx.strokeStyle = parts[i].col;
						ctx.beginPath(); ctx.moveTo(parts[i].x, parts[i].y); ctx.lineTo(this.mouse.x, this.mouse.y); ctx.stroke();
					}
				}
			}
		}
		for (i = 0; i < parts.length; i++) {
			q = parts[i];
			ctx.fillStyle = q.col;
			ctx.strokeStyle = q.col;
			switch (p.type) {
				case 'rain':
					ctx.globalAlpha = q.a * op;
					ctx.lineWidth = Math.max(1, (+p.size || 3) * 0.35);
					ctx.beginPath(); ctx.moveTo(q.x, q.y); ctx.lineTo(q.x - q.vx * 0.02, q.y - q.len); ctx.stroke();
					break;
				case 'stars':
					ctx.globalAlpha = op * (0.35 + 0.65 * (0.5 + 0.5 * Math.sin(q.tw)));
					ctx.beginPath(); ctx.arc(q.x, q.y, q.r, 0, 6.283); ctx.fill();
					break;
				case 'bubbles':
					ctx.globalAlpha = q.a * op;
					ctx.lineWidth = 1.2;
					ctx.beginPath(); ctx.arc(q.x, q.y, q.r, 0, 6.283); ctx.stroke();
					ctx.globalAlpha = q.a * op * 0.15;
					ctx.fill();
					break;
				case 'confetti':
					ctx.globalAlpha = op;
					ctx.save();
					ctx.translate(q.x, q.y); ctx.rotate(q.rot); ctx.scale(1, Math.cos(q.fl));
					ctx.fillRect(-q.w / 2, -q.h / 2, q.w, q.h);
					ctx.restore();
					break;
				case 'fireflies':
					var glow = 0.4 + 0.6 * (0.5 + 0.5 * Math.sin(q.ph));
					ctx.globalAlpha = op * glow * 0.25;
					ctx.beginPath(); ctx.arc(q.x, q.y, q.r * 3.5, 0, 6.283); ctx.fill();
					ctx.globalAlpha = op * glow;
					ctx.beginPath(); ctx.arc(q.x, q.y, q.r, 0, 6.283); ctx.fill();
					break;
				default:
					ctx.globalAlpha = (q.a || 1) * op;
					ctx.beginPath(); ctx.arc(q.x, q.y, q.r, 0, 6.283); ctx.fill();
			}
		}
		ctx.globalAlpha = 1;
	};

	FxCanvas.prototype.start = function () {
		if (this.running) { return; }
		if (!this.w) { this.resize(); }
		if (reducedMotion) { this.draw(); return; } // un solo fotogramma statico
		var self = this;
		this.running = true;
		var last = performance.now();
		var loop = function (t) {
			if (!self.running) { return; }
			if (!self.c.isConnected) { self.running = false; return; }
			var dt = Math.min(0.05, (t - last) / 1000);
			last = t;
			self.step(dt);
			self.draw();
			self.raf = requestAnimationFrame(loop);
		};
		this.raf = requestAnimationFrame(loop);
	};

	FxCanvas.prototype.stop = function () {
		this.running = false;
		cancelAnimationFrame(this.raf);
	};

	function slideFx(slide) {
		if (slide._ksFx === undefined) {
			var c = slide.querySelector(':scope > .ks-fx');
			var p = null;
			if (c) {
				try { p = JSON.parse(c.getAttribute('data-fx') || 'null'); } catch (e) { p = null; }
			}
			if (c && p && GL_FX.indexOf(p.type) > -1) {
				if (!window.KaosSliderGL) { return null; } // script WebGL non ancora arrivato: si riprova all'evento "kaosslider:gl"
				slide._ksFx = window.KaosSliderGL.create(c, p, slide);
			} else {
				slide._ksFx = c && p ? new FxCanvas(c, p) : null;
			}
		}
		return slide._ksFx;
	}

	/* Pellicola: la durata del giro dipende dalla lunghezza della striscia e dalla velocità (px al secondo). */
	function setupFilm(el) {
		var track = el.querySelector('.ks-film-track');
		if (!track) { return; }
		var half = track.scrollWidth / 2;
		var speed = (+el.getAttribute('data-speed') || 40) * (scaleOf(el) || 1);
		if (half > 0) { track.style.setProperty('--ks-film-dur', Math.max(2, half / speed).toFixed(2) + 's'); }
		track.style.animationDirection = el.getAttribute('data-dir') === 'right' ? 'reverse' : 'normal';
		if (!el._ksFilmBound) {
			el._ksFilmBound = true;
			Array.prototype.forEach.call(track.querySelectorAll('img'), function (img) {
				if (!img.complete) { img.addEventListener('load', function () { setupFilm(el); }, { once: true }); }
			});
		}
	}

	/* ---------- Slider ---------- */

	function Slider(root) {
		var self = this;
		this.root = root;
		try {
			this.s = JSON.parse(root.getAttribute('data-ks') || '{}');
		} catch (e) {
			this.s = {};
		}
		this.isCarousel = this.s.type === 'carousel';
		this.viewport = root.querySelector('.ks-viewport');
		this.track = root.querySelector('.ks-track');
		this.slides = Array.prototype.slice.call(root.querySelectorAll('.ks-slide'));
		this.bullets = Array.prototype.slice.call(root.querySelectorAll('.ks-bullet'));
		this.prevBtn = root.querySelector('.ks-prev');
		this.nextBtn = root.querySelector('.ks-next');
		this.progressBar = root.querySelector('.ks-progress span');
		this.index = 0;
		this.clock = 0;
		this.pauseReasons = {};
		this.outs = [];
		this.busy = false;
		this.maxIndex = 0;
		this.slides.forEach(function (sl) {
			sl._ksLayers = Array.prototype.slice.call(sl.querySelectorAll('.ks-layer'));
		});

		root.classList.add('ks-init');
		this.cstyle = this.isCarousel ? (this.s.carouselStyle || 'flat') : 'flat';
		this.centered = this.cstyle !== 'flat';
		if (this.s.scrollVideo && !this.isCarousel) { this.initScrollVideo(); }
		this.layout();
		this.bind();
		this.initParallax();

		if (this.isCarousel) {
			this.updateCarousel(true);
		} else {
			this.slides.forEach(function (sl, i) { self.setA11y(sl, i === 0); });
			this.loadMedia(0);
			this.startSlide(0);
			this.loadMedia(1);
		}
		root.classList.add('ks-ready');

		this.last = performance.now();
		this.tick = this.tick.bind(this);
		requestAnimationFrame(this.tick);
	}

	Slider.prototype.device = function () {
		var bp = this.s.bp || { tablet: 1024, mobile: 767 };
		if (window.matchMedia('(max-width:' + bp.mobile + 'px)').matches) { return 'mobile'; }
		if (window.matchMedia('(max-width:' + bp.tablet + 'px)').matches) { return 'tablet'; }
		return 'desktop';
	};

	Slider.prototype.layout = function () {
		var root = this.root;
		var docEl = document.documentElement;
		docEl.style.setProperty('--ks-sbw', Math.max(0, window.innerWidth - docEl.clientWidth) + 'px');

		// Larghezza piena: alcuni temi forzano i margini con !important, quindi si corregge con "left".
		if (this.s.fullWidth) {
			root.style.left = '0px';
			var offset = root.getBoundingClientRect().left;
			if (Math.abs(offset) > 0.5) {
				root.style.left = -offset + 'px';
			}
		}

		var grid = (this.s.grid || {})[this.device()] || { w: 1240, h: 700 };
		var ref = root.clientWidth;
		if (this.isCarousel && this.slides[0]) {
			ref = this.slides[0].getBoundingClientRect().width;
		}
		// Non responsive: misure reali in px su ogni schermo (il contenuto in eccesso viene tagliato).
		var scale = this.s.responsive === false ? 1 : (Math.min(1, ref / grid.w) || 1);
		root.style.setProperty('--s', scale.toFixed(4));

		if (this.isCarousel) {
			var cs = getComputedStyle(root);
			this.perView = Math.max(1, Math.round(parseFloat(cs.getPropertyValue('--ks-pv')) || 1));
			this.gap = parseFloat(cs.getPropertyValue('--ks-gap')) || 0;
			this.slideW = this.slides[0] ? this.slides[0].getBoundingClientRect().width : 0;
			this.maxIndex = this.centered ? this.slides.length - 1 : Math.max(0, this.slides.length - this.perView);
			if (this.index > this.maxIndex) { this.index = this.maxIndex; }
			var self = this;
			this.bullets.forEach(function (b, i) { b.style.display = i > self.maxIndex ? 'none' : ''; });
			this.applyTrack(0);
		}
		this.sizeEmbeds();
		Array.prototype.forEach.call(root.querySelectorAll('.ks-film'), setupFilm);
		this.slides.forEach(function (sl) { if (sl._ksFx) { sl._ksFx.resize(); } });

		// Dopo un ridimensionamento le parole del testo a gradiente cambiano posizione: si riallinea.
		Array.prototype.forEach.call(root.querySelectorAll('.ks-gradtext.ks-is-split'), function (inner) {
			var layer = inner.closest('.ks-layer');
			if (inner._ksPieces && layer && !(layer._ksAnims || []).length) {
				alignGradient(inner, inner._ksPieces);
			}
		});
	};

	Slider.prototype.sizeEmbeds = function () {
		Array.prototype.forEach.call(this.root.querySelectorAll('.ks-bg-embed iframe'), function (f) {
			var box = f.parentNode.getBoundingClientRect();
			var w = box.width;
			var h = box.height;
			if (!w || !h) { return; }
			var ratio = 16 / 9;
			// Leggermente più grande del contenitore per nascondere le barre del player.
			if (w / h > ratio) {
				f.style.width = w * 1.02 + 'px';
				f.style.height = (w / ratio) * 1.02 + 'px';
			} else {
				f.style.height = h * 1.02 + 'px';
				f.style.width = h * ratio * 1.02 + 'px';
			}
		});
	};

	Slider.prototype.bind = function () {
		var self = this;
		var root = this.root;

		if (this.prevBtn) { this.prevBtn.addEventListener('click', function () { self.prev(); }); }
		if (this.nextBtn) { this.nextBtn.addEventListener('click', function () { self.next(); }); }
		this.bullets.forEach(function (b, i) {
			b.addEventListener('click', function () { self.goTo(i); });
		});

		if (this.s.keyboard) {
			root.addEventListener('keydown', function (e) {
				if (e.key === 'ArrowLeft') { self.prev(); }
				if (e.key === 'ArrowRight') { self.next(); }
			});
		}

		if (this.s.pauseOnHover && window.matchMedia('(hover: hover)').matches) {
			root.addEventListener('mouseenter', function () { self.setPause('hover', true); });
			root.addEventListener('mouseleave', function () { self.setPause('hover', false); });
		}
		root.addEventListener('focusin', function () { self.setPause('focus', true); });
		root.addEventListener('focusout', function (e) {
			if (!root.contains(e.relatedTarget)) { self.setPause('focus', false); }
		});

		document.addEventListener('visibilitychange', function () {
			self.setPause('tab', document.hidden);
		});

		if ('IntersectionObserver' in window) {
			new IntersectionObserver(function (entries) {
				self.setPause('view', !entries[0].isIntersecting);
			}, { threshold: 0.15 }).observe(root);
		}

		var resizeTimer;
		var onResize = function () {
			clearTimeout(resizeTimer);
			resizeTimer = setTimeout(function () { self.layout(); }, 60);
		};
		if ('ResizeObserver' in window) {
			new ResizeObserver(onResize).observe(root);
		}
		window.addEventListener('resize', onResize);

		if (this.s.swipe) {
			this.bindSwipe();
		}
	};

	Slider.prototype.bindSwipe = function () {
		var self = this;
		var vp = this.viewport;
		var startX = 0, startY = 0, dx = 0, active = false, dragging = false, pid = null;

		vp.style.touchAction = 'pan-y';
		vp.addEventListener('dragstart', function (e) { e.preventDefault(); });

		vp.addEventListener('pointerdown', function (e) {
			if (e.target.closest && e.target.closest('.ks-fx-drag')) { return; } // panorama: il trascinamento ruota la vista
			if (e.pointerType === 'mouse' && (!self.isCarousel || e.button !== 0)) { return; }
			active = true;
			dragging = false;
			startX = e.clientX;
			startY = e.clientY;
			dx = 0;
			pid = e.pointerId;
		});
		vp.addEventListener('pointermove', function (e) {
			if (!active || e.pointerId !== pid) { return; }
			dx = e.clientX - startX;
			var dy = e.clientY - startY;
			if (!dragging && Math.abs(dx) > 8 && Math.abs(dx) > Math.abs(dy)) {
				dragging = true;
				self.setPause('drag', true);
				try { vp.setPointerCapture(pid); } catch (err) {}
				if (self.isCarousel) { self.root.classList.add('is-dragging'); }
			}
			if (dragging && self.isCarousel) {
				self.applyTrack(dx);
			}
		});
		var end = function () {
			if (!active) { return; }
			active = false;
			if (!dragging) { return; }
			self.root.classList.remove('is-dragging');
			self.setPause('drag', false);
			self.justDragged = true;
			setTimeout(function () { self.justDragged = false; }, 50);
			if (self.isCarousel) {
				var step = self.slideW + self.gap;
				var n = Math.round(-dx / step);
				if (n === 0 && Math.abs(dx) > 50) { n = dx < 0 ? 1 : -1; }
				if (n) {
					self.goTo(Math.max(0, Math.min(self.maxIndex, self.index + n)));
				} else {
					self.applyTrack(0);
				}
			} else if (Math.abs(dx) > 50) {
				if (dx < 0) { self.next(); } else { self.prev(); }
			}
		};
		vp.addEventListener('pointerup', end);
		vp.addEventListener('pointercancel', end);
		// Evita che un trascinamento apra i link dei livelli.
		vp.addEventListener('click', function (e) {
			if (self.justDragged) {
				e.preventDefault();
				e.stopPropagation();
			}
		}, true);
	};

	/* ---------- Parallasse (mouse e scroll) ---------- */

	Slider.prototype.initParallax = function () {
		var self = this;
		var s = this.s;
		this.par = { x: 0, y: 0, tx: 0, ty: 0 };
		this.parMouse = !!s.parallax && !reducedMotion && window.matchMedia('(hover: hover)').matches;
		this.parScroll = !!s.scrollParallax && !reducedMotion;
		if (this.parMouse) {
			this.root.classList.add('ks-par-mouse');
			this.root.addEventListener('mousemove', function (e) {
				var r = self.root.getBoundingClientRect();
				self.par.tx = ((e.clientX - r.left) / r.width - 0.5) * 2;
				self.par.ty = ((e.clientY - r.top) / r.height - 0.5) * 2;
			});
			this.root.addEventListener('mouseleave', function () {
				self.par.tx = 0;
				self.par.ty = 0;
			});
		}
		if (this.parScroll) {
			this.root.classList.add('ks-par-scroll');
		}
	};

	Slider.prototype.applyParallax = function () {
		var p = this.par;
		p.x += (p.tx - p.x) * 0.08;
		p.y += (p.ty - p.y) * 0.08;
		var k = (this.s.parallaxStrength != null ? +this.s.parallaxStrength : 30) / 10 * (parseFloat(this.root.style.getPropertyValue('--s')) || 1);
		var scrollY = 0;
		if (this.parScroll) {
			var r = this.root.getBoundingClientRect();
			var vh = window.innerHeight;
			var prog = Math.max(-1, Math.min(1, (r.top + r.height / 2 - vh / 2) / (vh / 2 + r.height / 2)));
			scrollY = prog * r.height * 0.12;
		}
		var slides = this.isCarousel ? this.slides.filter(function (sl) { return sl.classList.contains('is-visible'); }) : [this.slides[this.index]];
		var mouse = this.parMouse;
		slides.forEach(function (slide) {
			if (!slide) { return; }
			if (mouse) {
				slide._ksLayers.forEach(function (layer) {
					var d = +layerConfig(layer).parallax || 0;
					if (d) { layer.style.translate = (p.x * d * k).toFixed(2) + 'px ' + (p.y * d * k).toFixed(2) + 'px'; }
				});
			}
			var bd = mouse ? (+slide.getAttribute('data-bgpar') || 0) : 0;
			if (bd || scrollY) {
				var bg = slide.querySelector('.ks-bg');
				if (bg) { bg.style.translate = (p.x * bd * k).toFixed(2) + 'px ' + (p.y * bd * k + scrollY).toFixed(2) + 'px'; }
			}
		});
	};

	Slider.prototype.setPause = function (reason, on) {
		var was = this.animPaused();
		if (on) { this.pauseReasons[reason] = true; } else { delete this.pauseReasons[reason]; }
		var now = this.animPaused();
		if (was !== now) {
			setPaused(this.currentLayers(), now);
			this.activeSlides().forEach(function (sl) {
				var fx = slideFx(sl);
				if (fx) { if (now) { fx.stop(); } else { fx.start(); } }
			});
		}
	};

	Slider.prototype.activeSlides = function () {
		return this.isCarousel
			? this.slides.filter(function (s) { return s.classList.contains('is-visible'); })
			: [this.slides[this.index]].filter(Boolean);
	};

	/* Qualsiasi motivo ferma il timer della slide (autoplay, uscite, barra di avanzamento). */
	Slider.prototype.isPaused = function () {
		return Object.keys(this.pauseReasons).length > 0;
	};

	/* Le animazioni dei livelli si fermano solo se lo slider non si vede: con il mouse sopra
	   (o il focus dentro) i testi devono comunque entrare, altrimenti resterebbero invisibili. */
	Slider.prototype.animPaused = function () {
		return !!(this.pauseReasons.tab || this.pauseReasons.view);
	};

	Slider.prototype.currentLayers = function () {
		if (this.isCarousel) {
			return this.slides.filter(function (s) { return s.classList.contains('is-visible'); })
				.reduce(function (acc, s) { return acc.concat(s._ksLayers); }, []);
		}
		var cur = this.slides[this.index];
		return cur ? cur._ksLayers : [];
	};

	Slider.prototype.duration = function () {
		if (this.isCarousel) { return this.s.delay || 5000; }
		var sl = this.slides[this.index];
		return (sl && +sl.getAttribute('data-duration')) || this.s.delay || 7000;
	};

	Slider.prototype.tick = function (ts) {
		if (!this.root.isConnected) { return; } // rimosso dal DOM (es. ri-render del page builder)
		var dt = Math.min(100, ts - this.last);
		this.last = ts;
		if ((this.parMouse || this.parScroll) && !this.pauseReasons.view && !this.pauseReasons.tab) {
			this.applyParallax();
		}
		if (this.sv) {
			this.updateScrollVideo();
		}
		if (!this.isPaused()) {
			this.clock += dt;
			var clock = this.clock;
			this.outs.forEach(function (o) {
				if (!o.done && clock >= o.at) {
					o.done = true;
					playOut(o.layer, o.cfg);
				}
			});
			var dur = this.duration();
			if (this.progressBar) {
				this.progressBar.style.width = Math.min(100, (clock / dur) * 100) + '%';
			}
			if (this.s.autoplay && this.slides.length > 1 && clock >= dur && !this.busy) {
				if (!this.s.loop && this.isLast()) {
					this.clock = dur;
				} else {
					this.next(true);
				}
			}
		}
		requestAnimationFrame(this.tick);
	};

	Slider.prototype.isLast = function () {
		return this.isCarousel ? this.index >= this.maxIndex : this.index >= this.slides.length - 1;
	};

	Slider.prototype.next = function () {
		this.goTo(this.index + 1, 1);
	};

	Slider.prototype.prev = function () {
		this.goTo(this.index - 1, -1);
	};

	Slider.prototype.goTo = function (i, dir) {
		if (this.isCarousel) {
			if (i > this.maxIndex) { i = this.s.loop ? 0 : this.maxIndex; }
			if (i < 0) { i = this.s.loop ? this.maxIndex : 0; }
			this.index = i;
			this.clock = 0;
			this.applyTrack(0);
			this.updateCarousel(false);
			return;
		}

		var n = this.slides.length;
		if (n < 2 || this.busy) { return; }
		if (!this.s.loop && (i < 0 || i >= n)) { return; }
		i = (i + n) % n;
		if (i === this.index) { return; }
		dir = dir || (i > this.index ? 1 : -1);

		var self = this;
		var prevIndex = this.index;
		var prev = this.slides[prevIndex];
		var next = this.slides[i];
		var tc = slideTransition(next, this.s);
		var speed = reducedMotion ? Math.min(300, tc.speed) : tc.speed;

		this.busy = true;
		this.loadMedia(i);
		prev.classList.remove('is-active');
		prev.classList.add('is-leaving');
		next.classList.add('is-active');
		this.setA11y(prev, false);
		this.setA11y(next, true);

		var run = speed > 0 ? runTransition(prev, next, reducedMotion ? 'fade' : tc.effect, { speed: speed, easing: tc.easing, dir: dir, slices: tc.slices }) : null;

		this.index = i;
		this.startSlide(i);

		setTimeout(function () {
			prev.classList.remove('is-leaving');
			if (run) { run.cleanup(); }
			self.stopSlide(prevIndex);
			self.busy = false;
			self.loadMedia((i + 1) % n);
		}, run ? run.duration : 0);
	};

	/* ---------- Transizioni tra slide ---------- */

	var TRANSITIONS = ['fade', 'fadeBlack', 'slide', 'slideV', 'slideOver', 'slideReveal', 'parallax', 'zoom', 'zoomOut', 'zoomBlur', 'blur',
		'wipe', 'wipeV', 'curtain', 'curtainH', 'circle', 'diamond', 'cube', 'flip', 'flipV', 'stripsV', 'stripsH', 'blinds', 'mosaic'];

	function slideTransition(slide, s) {
		var t = {};
		try { t = JSON.parse(slide.getAttribute('data-tr') || '{}'); } catch (e) { t = {}; }
		return {
			effect: t.effect && t.effect !== 'default' ? t.effect : (s.transition || 'fade'),
			speed: +t.duration > 0 ? +t.duration : (s.speed != null ? +s.speed : 900),
			easing: t.easing && t.easing !== 'default' ? ease(t.easing) : EASINGS.easeInOut,
			slices: +t.slices || 0
		};
	}

	/* Strisce, persiane e mosaico: copie dello sfondo della slide in arrivo, animate a pezzi. */
	function slicesTransition(next, kind, sp, e, d, count, A) {
		var bg = next.querySelector('.ks-bg');
		if (!bg || bg.querySelector('video, iframe, .ks-bg-embed')) { return null; } // con i video si ripiega sulla dissolvenza
		var ov = next.querySelector('.ks-overlay');
		var wrap = document.createElement('div');
		wrap.className = 'ks-slices';
		var paint = function () {
			var c = document.createElement('div');
			c.className = 'ks-slice-paint';
			c.style.background = next.style.background;
			c.appendChild(bg.cloneNode(true));
			if (ov) { c.appendChild(ov.cloneNode(true)); }
			return c;
		};
		var pieces = [];
		var i;
		if (kind === 'mosaic') {
			var cols = count || 8;
			var rows = Math.max(2, Math.round(cols * next.clientHeight / Math.max(1, next.clientWidth)));
			for (var r = 0; r < rows; r++) {
				for (var c = 0; c < cols; c++) {
					pieces.push({
						clip: 'inset(' + (r / rows * 100) + '% ' + (100 - (c + 1) / cols * 100) + '% ' + (100 - (r + 1) / rows * 100) + '% ' + (c / cols * 100) + '%)',
						origin: ((c + 0.5) / cols * 100) + '% ' + ((r + 0.5) / rows * 100) + '%',
						order: Math.random()
					});
				}
			}
		} else {
			var n = count || (kind === 'blinds' ? 10 : 8);
			for (i = 0; i < n; i++) {
				var a = i / n * 100;
				var b = 100 - (i + 1) / n * 100;
				pieces.push({
					clip: kind === 'stripsH' ? 'inset(' + a + '% 0% ' + b + '% 0%)' : 'inset(0% ' + b + '% 0% ' + a + '%)',
					a: a,
					order: d > 0 ? i / n : (n - 1 - i) / n,
					odd: i % 2
				});
			}
		}
		var step = sp * 0.45;
		var each = sp - step;
		pieces.forEach(function (p) {
			var el = paint();
			el.style.clipPath = p.clip;
			wrap.appendChild(el);
			var o = { duration: each, delay: p.order * step, easing: e };
			if (kind === 'stripsV') {
				A(el, [{ transform: 'translate3d(0,' + (p.odd ? 100 : -100) + '%,0)' }, { transform: 'translate3d(0,0,0)' }], o);
			} else if (kind === 'stripsH') {
				A(el, [{ transform: 'translate3d(' + (d * 100) + '%,0,0)' }, { transform: 'translate3d(0,0,0)' }], o);
			} else if (kind === 'blinds') {
				A(el, [{ clipPath: 'inset(0% ' + (100 - p.a) + '% 0% ' + p.a + '%)' }, { clipPath: p.clip }], o);
			} else {
				el.style.transformOrigin = p.origin;
				A(el, [{ opacity: 0, transform: 'scale(.4)' }, { opacity: 1, transform: 'scale(1)' }], o);
			}
		});
		// Lo sfondo vero resta nascosto finché i pezzi non lo hanno ricomposto.
		var saved = [bg.style.visibility, ov ? ov.style.visibility : '', next.style.background];
		bg.style.visibility = 'hidden';
		if (ov) { ov.style.visibility = 'hidden'; }
		next.style.background = 'transparent';
		next.insertBefore(wrap, bg.nextSibling);
		return function () {
			wrap.remove();
			bg.style.visibility = saved[0];
			if (ov) { ov.style.visibility = saved[1]; }
			next.style.background = saved[2];
		};
	}

	/* Esegue una transizione tra due slide; restituisce durata e funzione di pulizia (usata anche dall'editor). */
	function runTransition(prev, next, name, o) {
		if (name === 'random') { name = TRANSITIONS[Math.floor(Math.random() * TRANSITIONS.length)]; }
		var sp = o.speed;
		var d = o.dir || 1;
		var e = o.easing || EASINGS.easeInOut;
		var anims = [];
		var restore = [];
		var extra = null;
		var A = function (el, frames, opt) {
			var an = el.animate(frames, Object.assign({ duration: sp, easing: e, fill: 'both' }, opt || {}));
			anims.push(an);
			return an;
		};
		var set = function (el, prop, val) {
			restore.push([el, prop, el.style[prop]]);
			el.style[prop] = val;
		};
		var X = function (p) { return 'translate3d(' + p + '%,0,0)'; };
		var Y = function (p) { return 'translate3d(0,' + p + '%,0)'; };
		var full = 'inset(0% 0% 0% 0%)';

		switch (name) {
			case 'fadeBlack':
				A(prev, [{ opacity: 1 }, { opacity: 0 }], { duration: sp / 2, easing: 'ease-in' });
				A(next, [{ opacity: 0 }, { opacity: 1 }], { duration: sp / 2, delay: sp / 2, easing: 'ease-out' });
				break;
			case 'slide':
				A(next, [{ transform: X(d * 100) }, { transform: X(0) }]);
				A(prev, [{ transform: X(0) }, { transform: X(-d * 100) }]);
				break;
			case 'slideV':
				A(next, [{ transform: Y(d * 100) }, { transform: Y(0) }]);
				A(prev, [{ transform: Y(0) }, { transform: Y(-d * 100) }]);
				break;
			case 'slideOver':
				A(next, [{ transform: X(d * 100) }, { transform: X(0) }]);
				A(prev, [{ filter: 'brightness(1)' }, { filter: 'brightness(.45)' }]);
				break;
			case 'slideReveal':
				set(prev, 'zIndex', '4');
				A(prev, [{ transform: X(0) }, { transform: X(-d * 100) }]);
				A(next, [{ filter: 'brightness(.45)' }, { filter: 'brightness(1)' }]);
				break;
			case 'parallax':
				A(next, [{ transform: X(d * 100) }, { transform: X(0) }]);
				A(prev, [{ transform: X(0), filter: 'brightness(1)' }, { transform: X(-d * 35), filter: 'brightness(.5)' }]);
				break;
			case 'zoom':
				A(next, [{ opacity: 0, transform: 'scale(1.15)' }, { opacity: 1, transform: 'scale(1)' }]);
				A(prev, [{ opacity: 1 }, { opacity: 0 }]);
				break;
			case 'zoomOut':
				A(next, [{ opacity: 0, transform: 'scale(.82)' }, { opacity: 1, transform: 'scale(1)' }]);
				A(prev, [{ opacity: 1, transform: 'scale(1)' }, { opacity: 0, transform: 'scale(1.18)' }]);
				break;
			case 'zoomBlur':
				A(next, [{ opacity: 0, transform: 'scale(1.3)', filter: 'blur(24px)' }, { opacity: 1, transform: 'scale(1)', filter: 'blur(0px)' }]);
				A(prev, [{ opacity: 1, filter: 'blur(0px)' }, { opacity: 0, filter: 'blur(24px)' }]);
				break;
			case 'blur':
				A(next, [{ opacity: 0, filter: 'blur(30px)' }, { opacity: 1, filter: 'blur(0px)' }]);
				A(prev, [{ filter: 'blur(0px)' }, { filter: 'blur(30px)' }]);
				break;
			case 'wipe':
				A(next, [{ clipPath: d > 0 ? 'inset(0% 0% 0% 100%)' : 'inset(0% 100% 0% 0%)' }, { clipPath: full }]);
				break;
			case 'wipeV':
				A(next, [{ clipPath: d > 0 ? 'inset(100% 0% 0% 0%)' : 'inset(0% 0% 100% 0%)' }, { clipPath: full }]);
				break;
			case 'curtain':
				A(next, [{ clipPath: 'inset(0% 50% 0% 50%)' }, { clipPath: full }]);
				break;
			case 'curtainH':
				A(next, [{ clipPath: 'inset(50% 0% 50% 0%)' }, { clipPath: full }]);
				break;
			case 'circle':
				A(next, [{ clipPath: 'circle(0% at 50% 50%)' }, { clipPath: 'circle(75% at 50% 50%)' }]);
				break;
			case 'diamond':
				A(next, [{ clipPath: 'polygon(50% 50%, 50% 50%, 50% 50%, 50% 50%)' }, { clipPath: 'polygon(50% -50%, 150% 50%, 50% 150%, -50% 50%)' }]);
				break;
			case 'cube':
				set(next.parentNode, 'perspective', '2000px');
				set(prev, 'transformOrigin', d > 0 ? '100% 50%' : '0% 50%');
				set(next, 'transformOrigin', d > 0 ? '0% 50%' : '100% 50%');
				A(prev, [{ transform: 'translate3d(0,0,0) rotateY(0deg)' }, { transform: X(-d * 100) + ' rotateY(' + (-d * 90) + 'deg)' }]);
				A(next, [{ transform: X(d * 100) + ' rotateY(' + (d * 90) + 'deg)' }, { transform: 'translate3d(0,0,0) rotateY(0deg)' }]);
				break;
			case 'flip':
			case 'flipV':
				var ax = name === 'flip' ? 'rotateY' : 'rotateX';
				set(next.parentNode, 'perspective', '2000px');
				set(prev, 'backfaceVisibility', 'hidden');
				set(next, 'backfaceVisibility', 'hidden');
				A(prev, [{ transform: ax + '(0deg)' }, { transform: ax + '(' + (-d * 90) + 'deg)' }], { duration: sp / 2, easing: 'ease-in' });
				A(next, [{ transform: ax + '(' + (d * 90) + 'deg)' }, { transform: ax + '(0deg)' }], { duration: sp / 2, delay: sp / 2, easing: 'ease-out' });
				break;
			case 'stripsV':
			case 'stripsH':
			case 'blinds':
			case 'mosaic':
				extra = slicesTransition(next, name, sp, e, d, o.slices, A);
				if (!extra) { A(next, [{ opacity: 0 }, { opacity: 1 }], { easing: 'ease' }); }
				break;
			default:
				A(next, [{ opacity: 0 }, { opacity: 1 }], { easing: 'ease' });
		}

		return {
			duration: sp,
			cleanup: function () {
				anims.forEach(function (an) { an.cancel(); });
				restore.forEach(function (r) { r[0].style[r[1]] = r[2]; });
				if (extra) { extra(); }
			}
		};
	}

	Slider.prototype.startSlide = function (i) {
		var self = this;
		var slide = this.slides[i];
		var dur = this.duration();
		this.clock = 0;
		this.outs = [];

		slide._ksLayers.forEach(function (layer) {
			var cfg = layerConfig(layer);
			playIn(layer, cfg);
			var o = cfg.out || {};
			if (o.effect && o.effect !== 'none') {
				var at = +o.at > 0 ? +o.at : (self.s.autoplay ? Math.max(0, dur - (+o.duration || 0)) : -1);
				if (at >= 0) {
					self.outs.push({ layer: layer, cfg: cfg, at: at, done: false });
				}
			}
		});
		if (this.animPaused()) {
			setPaused(slide._ksLayers, true);
		}
		this.playMedia(slide);
		this.updateBullets();
		var fx = slideFx(slide);
		if (fx && !this.animPaused()) { fx.start(); }
	};

	Slider.prototype.stopSlide = function (i) {
		var slide = this.slides[i];
		slide._ksLayers.forEach(stopLayer);
		this.stopMedia(slide);
		if (slide._ksFx) { slide._ksFx.stop(); }
	};

	Slider.prototype.updateBullets = function () {
		var idx = this.index;
		this.bullets.forEach(function (b, i) {
			b.classList.toggle('is-active', i === idx);
			if (i === idx) { b.setAttribute('aria-current', 'true'); } else { b.removeAttribute('aria-current'); }
		});
		if (!this.s.loop) {
			if (this.prevBtn) { this.prevBtn.disabled = idx === 0; }
			if (this.nextBtn) { this.nextBtn.disabled = this.isLast(); }
		}
	};

	Slider.prototype.setA11y = function (slide, visible) {
		if (visible) {
			slide.removeAttribute('aria-hidden');
			slide.inert = false;
		} else {
			slide.setAttribute('aria-hidden', 'true');
			slide.inert = true;
		}
	};

	/* ---------- Video guidato dallo scroll ----------
	 * La sezione diventa alta N volte lo schermo e la slide resta ferma (sticky) mentre si scorre:
	 * l'avanzamento dello scroll decide il fotogramma del video. */

	/* File video caricati solo quando servono. Con un formato alternativo il browser
	 * sceglie da solo il primo che sa riprodurre (e passa al successivo se uno fallisce). */
	var VIDEO_TYPES = { mp4: 'video/mp4', m4v: 'video/mp4', webm: 'video/webm', ogv: 'video/ogg', ogg: 'video/ogg' };

	function loadVideo(v) {
		if (v.getAttribute('data-loaded')) { return; }
		v.setAttribute('data-loaded', '1');
		[v.getAttribute('data-src'), v.getAttribute('data-src-alt')].forEach(function (url) {
			if (!url) { return; }
			var s = document.createElement('source');
			var ext = url.split(/[?#]/)[0].split('.').pop().toLowerCase();
			s.src = url;
			if (VIDEO_TYPES[ext]) { s.type = VIDEO_TYPES[ext]; } // .mov e altri: decide il browser
			v.appendChild(s);
		});
		v.load();
	}

	Slider.prototype.initScrollVideo = function () {
		var v = this.slides[0] && this.slides[0].querySelector('.ks-bg-video');
		this.s.autoplay = false;
		this.root.style.height = (+this.s.scrollLength || 300) + 'vh';
		if (!v) { return; }
		v.preload = 'auto';
		loadVideo(v);
		v.muted = true;
		v.loop = false;
		v.pause();
		v.classList.add('is-playing');
		this.sv = { video: v, t: 0 };
	};

	Slider.prototype.updateScrollVideo = function () {
		var v = this.sv.video;
		var r = this.root.getBoundingClientRect();
		var span = r.height - window.innerHeight;
		var p = span > 0 ? Math.max(0, Math.min(1, -r.top / span)) : 0;
		this.root.style.setProperty('--ks-progress', p.toFixed(4));
		if (!v.duration || v.readyState < 1) { return; }
		var target = p * (v.duration - 0.05);
		this.sv.t += (target - this.sv.t) * 0.18; // movimento morbido
		if (Math.abs(v.currentTime - this.sv.t) > 0.02 && !v.seeking) {
			v.currentTime = this.sv.t;
		}
	};

	/* ---------- Carosello ---------- */

	Slider.prototype.applyTrack = function (offset) {
		if (!this.isCarousel) { return; }
		var step = (this.slideW || 0) + (this.gap || 0);
		var x = -this.index * step + (offset || 0);
		if (this.centered) {
			x += (this.viewport.clientWidth - (this.slideW || 0)) / 2; // la card attiva sta al centro
			this.styleCards(offset || 0, step);
		}
		this.track.style.transform = 'translate3d(' + x + 'px,0,0)';
	};

	/* Carosello 3D (coverflow) e zoom: le card laterali ruotano / rimpiccioliscono in base alla distanza dal centro. */
	Slider.prototype.styleCards = function (offset, step) {
		var f = this.index - (step ? offset / step : 0);
		var style = this.cstyle;
		this.slides.forEach(function (slide, j) {
			var d = j - f;
			var ad = Math.abs(d);
			if (style === 'coverflow') {
				var rot = Math.max(-1, Math.min(1, -d)) * 42;
				var sc = 1 - Math.min(ad, 2) * 0.12;
				slide.style.transform = 'perspective(1400px) rotateY(' + rot.toFixed(2) + 'deg) scale(' + sc.toFixed(3) + ')';
				slide.style.opacity = ad > 2.6 ? 0 : 1;
			} else {
				slide.style.transform = 'scale(' + (1 - Math.min(ad, 1) * 0.16).toFixed(3) + ')';
				slide.style.opacity = (1 - Math.min(ad, 2) * 0.3).toFixed(2);
			}
			slide.style.zIndex = String(100 - Math.round(ad * 10));
		});
	};

	Slider.prototype.updateCarousel = function () {
		var self = this;
		var pv = this.perView || 1;
		this.slides.forEach(function (slide, j) {
			var visible = self.centered ? Math.abs(j - self.index) <= Math.floor(pv / 2) : (j >= self.index && j < self.index + pv);
			var was = slide.classList.contains('is-visible');
			self.setA11y(slide, visible);
			if (visible && !was) {
				slide.classList.add('is-visible');
				self.loadMedia(j);
				self.playMedia(slide);
				slide._ksLayers.forEach(function (l) { playIn(l); });
				var fx = slideFx(slide);
				if (fx && !self.animPaused()) { fx.start(); }
			} else if (!visible && was) {
				slide.classList.remove('is-visible');
				slide._ksLayers.forEach(stopLayer);
				self.stopMedia(slide);
				if (slide._ksFx) { slide._ksFx.stop(); }
			}
		});
		// Precarica la card successiva.
		this.loadMedia(this.index + pv);
		this.updateBullets();
	};

	/* ---------- Media di sfondo ---------- */

	Slider.prototype.loadMedia = function (i) {
		var slide = this.slides[i];
		if (!slide) { return; }
		Array.prototype.forEach.call(slide.querySelectorAll('[data-bg]'), function (el) {
			el.style.backgroundImage = 'url("' + el.getAttribute('data-bg').replace(/"/g, '%22') + '")';
			el.removeAttribute('data-bg');
		});
	};

	Slider.prototype.playMedia = function (slide) {
		var self = this;
		Array.prototype.forEach.call(slide.querySelectorAll('.ks-bg-video'), function (v) {
			if (self.sv && self.sv.video === v) { return; } // guidato dallo scroll
			loadVideo(v);
			v.muted = true;
			var p = v.play();
			v.addEventListener('playing', function () { v.classList.add('is-playing'); }, { once: true });
			if (p && p['catch']) { p['catch'](function () {}); }
		});
		Array.prototype.forEach.call(slide.querySelectorAll('.ks-bg-embed'), function (box) {
			if (box.querySelector('iframe')) { return; }
			var f = document.createElement('iframe');
			f.src = box.getAttribute('data-src');
			f.allow = 'autoplay; fullscreen; picture-in-picture';
			f.setAttribute('tabindex', '-1');
			f.setAttribute('aria-hidden', 'true');
			f.title = 'video';
			f.addEventListener('load', function () { listenToPlayer(f, box); });
			box.appendChild(f);
			self.sizeEmbeds();
		});
	};

	/* ---------- Player YouTube/Vimeo ----------
	 * L'iframe resta invisibile finché il player non segnala che il video sta andando:
	 * se il video è rimosso, privato o non incorporabile si vede il poster (o il colore) invece della schermata d'errore. */

	var embeds = [];

	function post(f, msg) {
		try { f.contentWindow.postMessage(JSON.stringify(msg), '*'); } catch (e) {}
	}

	function listenToPlayer(f, box) {
		var vimeo = /vimeo\.com/.test(f.src);
		var entry = { f: f, box: box, vimeo: vimeo, heard: false };
		embeds = embeds.filter(function (x) { return x.f.isConnected; });
		embeds.push(entry);
		var tries = 0;
		// YouTube risponde solo dopo un "listening": si ripete finché il player non è pronto.
		var timer = setInterval(function () {
			if (entry.heard || ++tries > 30 || !f.isConnected) {
				clearInterval(timer);
				return;
			}
			if (vimeo) {
				['play', 'playProgress', 'timeupdate'].forEach(function (ev) { post(f, { method: 'addEventListener', value: ev }); });
			} else {
				post(f, { event: 'listening', id: 1, channel: 'widget' });
				post(f, { event: 'command', func: 'addEventListener', args: ['onStateChange'], id: 1, channel: 'widget' });
			}
		}, 400);
	}

	window.addEventListener('message', function (e) {
		if (!/youtube(-nocookie)?\.com|vimeo\.com/.test(e.origin)) { return; }
		var entry = null;
		for (var i = 0; i < embeds.length; i++) {
			if (embeds[i].f.contentWindow === e.source) { entry = embeds[i]; break; }
		}
		if (!entry) { return; }
		var d = e.data;
		if (typeof d === 'string') {
			try { d = JSON.parse(d); } catch (err) { return; }
		}
		if (!d || typeof d !== 'object') { return; }
		entry.heard = true;

		var playing = false;
		if (entry.vimeo) {
			if (d.event === 'ready') {
				['play', 'playProgress', 'timeupdate'].forEach(function (ev) { post(entry.f, { method: 'addEventListener', value: ev }); });
			}
			playing = d.event === 'play' || d.event === 'playProgress' || d.event === 'timeupdate';
		} else {
			var info = d.info;
			playing = (d.event === 'onStateChange' && info === 1) ||
				(d.event === 'infoDelivery' && info && (info.playerState === 1 || info.currentTime > 0));
		}
		if (playing) {
			entry.box.classList.add('is-playing');
		}
	});

	Slider.prototype.stopMedia = function (slide) {
		Array.prototype.forEach.call(slide.querySelectorAll('.ks-bg-video'), function (v) {
			v.pause();
			v.classList.remove('is-playing');
		});
		Array.prototype.forEach.call(slide.querySelectorAll('.ks-bg-embed'), function (box) {
			box.classList.remove('is-playing');
			var f = box.querySelector('iframe');
			if (f) { box.removeChild(f); }
		});
	};

	/* ---------- Avvio ---------- */

	// Slider caricati dai page builder via AJAX: CSS e font arrivano negli attributi, perché l'head è già stampato.
	function applyInlineCss(root) {
		var css = root.getAttribute('data-ks-css');
		if (css) {
			var st = document.getElementById(root.id + '-css');
			if (!st) {
				st = document.createElement('style');
				st.id = root.id + '-css';
				root.parentNode.insertBefore(st, root);
			}
			st.textContent = css;
		}
		var font = root.getAttribute('data-ks-font');
		if (font && !Array.prototype.some.call(document.querySelectorAll('link[rel="stylesheet"]'), function (l) { return l.href === font; })) {
			var link = document.createElement('link');
			link.rel = 'stylesheet';
			link.href = font;
			document.head.appendChild(link);
		}
	}

	function init(root) {
		if (!root || root.classList.contains('ks-init') || !root.hasAttribute('data-ks')) { return null; }
		applyInlineCss(root);
		if (!('animate' in Element.prototype)) {
			root.classList.add('ks-ready'); // browser molto vecchi: contenuto statico
			return null;
		}
		root._kaosslider = new Slider(root);
		if (root.hasAttribute('data-ks-edit')) { scheduleAdminBar(); }
		return root._kaosslider;
	}

	/* ---------- Pulsante "KaosSlider" nella barra di amministrazione ----------
	 * Il server crea il pulsante; qui si aggiunge una voce "Modifica" per ogni slider presente nella pagina. */

	var abTimer = null;
	function scheduleAdminBar() {
		clearTimeout(abTimer);
		abTimer = setTimeout(adminBarMenu, 150);
	}

	function adminBarMenu() {
		var node = document.getElementById('wp-admin-bar-kaosslider');
		if (!node) { return; }
		var list = node.querySelector('.ab-submenu');
		if (!list) { return; }
		var all = document.getElementById('wp-admin-bar-kaosslider-all');
		Array.prototype.forEach.call(list.querySelectorAll('.kaosslider-ab-item, .kaosslider-ab-sep'), function (li) { li.parentNode.removeChild(li); });

		// Testi tradotti dal PHP (attributi data-* del pulsante nella barra).
		var label = node.querySelector('.ab-label');
		var tEdit = (label && label.getAttribute('data-edit')) || 'Edit: %s';
		var tUntitled = (label && label.getAttribute('data-untitled')) || 'Slider #%d';
		var seen = {};
		var items = [];
		Array.prototype.forEach.call(document.querySelectorAll('.kaosslider[data-ks-edit]'), function (el) {
			var id = el.getAttribute('data-ks-id');
			if (seen[id]) { seen[id].els.push(el); return; }
			seen[id] = { url: el.getAttribute('data-ks-edit'), title: el.getAttribute('aria-label') || tUntitled.replace('%d', id), els: [el] };
			items.push(seen[id]);
		});
		node.classList.toggle('ks-ab-ready', items.length > 0);
		if (!items.length) { return; }

		items.forEach(function (it) {
			var li = document.createElement('li');
			li.className = 'kaosslider-ab-item';
			var a = document.createElement('a');
			a.className = 'ab-item';
			a.href = it.url;
			a.textContent = tEdit.replace('%s', it.title);
			li.appendChild(a);
			// Passando sulla voce, lo slider corrispondente viene evidenziato nella pagina.
			li.addEventListener('mouseenter', function () { it.els.forEach(function (e) { e.classList.add('ks-ab-highlight'); }); });
			li.addEventListener('mouseleave', function () { it.els.forEach(function (e) { e.classList.remove('ks-ab-highlight'); }); });
			list.insertBefore(li, all);
		});
		var sep = document.createElement('li');
		sep.className = 'kaosslider-ab-sep';
		sep.setAttribute('role', 'separator');
		list.insertBefore(sep, all);

		if (label) { label.textContent = items.length > 1 ? 'KaosSlider (' + items.length + ')' : 'KaosSlider'; }

		// Clic sinistro sul pulsante: apre/chiude il menu (di base la barra lo apre solo al passaggio del mouse).
		if (!node._ksBound) {
			node._ksBound = true;
			var top = node.querySelector('.ab-item');
			top.setAttribute('role', 'button');
			top.setAttribute('tabindex', '0');
			top.setAttribute('aria-expanded', 'false');
			var toggle = function (e) {
				e.preventDefault();
				var open = !node.classList.contains('hover');
				node.classList.toggle('hover', open);
				top.setAttribute('aria-expanded', open ? 'true' : 'false');
			};
			top.addEventListener('click', toggle);
			top.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { toggle(e); } });
			document.addEventListener('click', function (e) {
				if (!node.contains(e.target)) {
					node.classList.remove('hover');
					top.setAttribute('aria-expanded', 'false');
				}
			});
		}
	}

	function initAll(ctx) {
		ctx = ctx || document;
		if (ctx.classList && ctx.classList.contains('kaosslider')) { init(ctx); }
		Array.prototype.forEach.call(ctx.querySelectorAll('.kaosslider'), init);
	}

	window.KaosSlider = {
		init: init,
		initAll: initAll,
		transition: runTransition,
		transitions: TRANSITIONS,
		easings: EASINGS,
		fx: { Canvas: FxCanvas, film: setupFilm },
		anim: {
			FROM: FROM,
			playIn: playIn,
			playOut: playOut,
			stopLayer: stopLayer,
			unsplit: unsplit,
			setPaused: setPaused
		}
	};

	function boot() {
		initAll(document);

		// Page builder: gli slider possono essere inseriti/ri-renderizzati dopo il caricamento.
		var body = document.body;
		var inBuilder = body && (body.classList.contains('et-fb') || body.classList.contains('elementor-editor-active') ||
			/[?&](et_fb|elementor-preview)=/.test(location.search));
		if (inBuilder && 'MutationObserver' in window) {
			new MutationObserver(function (muts) {
				muts.forEach(function (m) {
					Array.prototype.forEach.call(m.addedNodes, function (n) {
						if (n.nodeType === 1) { initAll(n); }
					});
				});
			}).observe(body, { childList: true, subtree: true });
		}
	}

	// Il file degli effetti WebGL può arrivare dopo l'avvio degli slider: quando è pronto si attivano i loro effetti.
	window.addEventListener('kaosslider:gl', function () {
		Array.prototype.forEach.call(document.querySelectorAll('.kaosslider.ks-init'), function (r) {
			var k = r._kaosslider;
			if (!k) { return; }
			k.activeSlides().forEach(function (sl) {
				var fx = slideFx(sl);
				if (fx && !k.animPaused()) { fx.start(); }
			});
		});
	});

	if (document.body && document.body.classList.contains('wp-admin')) {
		return; // nell'editor dello slider serve solo il motore di animazione
	}
	if (document.readyState === 'loading') {
		document.addEventListener('DOMContentLoaded', boot);
	} else {
		boot();
	}

	// Elementor: inizializza il widget quando viene (ri)renderizzato nell'editor.
	function elementorHook() {
		if (window.elementorFrontend && window.elementorFrontend.hooks) {
			window.elementorFrontend.hooks.addAction('frontend/element_ready/kaosslider.default', function ($scope) {
				initAll($scope && $scope[0] ? $scope[0] : document);
			});
		}
	}
	if (window.elementorFrontend && window.elementorFrontend.hooks) {
		elementorHook();
	} else if (window.jQuery) {
		window.jQuery(window).on('elementor/frontend/init', elementorHook);
	}
})();
